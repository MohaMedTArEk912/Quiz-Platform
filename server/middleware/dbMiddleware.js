import mongoose from 'mongoose';

let cachedConnection = null;
let cachedPromise = null;
let connectionAttemptTime = null;

// Track connection lifecycle
if (mongoose.connection) {
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB connection lost. Clearing cached instance.');
    cachedConnection = null;
    cachedPromise = null;
  });
  mongoose.connection.on('error', (err) => {
    console.error('⚠️ MongoDB connection runtime error:', err?.message || err);
    cachedConnection = null;
    cachedPromise = null;
  });
}

export function getMongoUri() {
  const isCloudDeployment = Boolean(
    process.env.VERCEL || 
    process.env.AWS_LAMBDA_FUNCTION_NAME || 
    process.env.NETLIFY || 
    process.env.RENDER || 
    process.env.KOYEB ||
    process.env.NODE_ENV === 'production'
  );

  // If explicitly requested to use local DB, or in local dev with USE_LOCAL_DB=true
  if (process.env.USE_LOCAL_DB === 'true' && !isCloudDeployment) {
    const localUri = process.env.LOCAL_MONGODB_URI || process.env.Local_MONGODB_URI || 'mongodb://127.0.0.1:27017/quiz-platform';
    return String(localUri).trim().replace(/^["']|["']$/g, '');
  }

  const raw = process.env.MONGODB_URI || 
              process.env.ATLAS_MONGODB_URI ||
              process.env.MONGO_URI || 
              process.env.DATABASE_URL || 
              process.env.MONGODB_URL || 
              process.env.DB_URI ||
              (!isCloudDeployment ? (process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/quiz-platform') : null);

  if (!raw) return null;
  // Trim and strip any accidental outer quotes from env vars
  return String(raw).trim().replace(/^["']|["']$/g, '');
}

export function getDbDiagnostics() {
  const uri = getMongoUri();
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const isLocal = uri ? (uri.includes('127.0.0.1') || uri.includes('localhost')) : false;
  return {
    is_uri_defined: Boolean(uri),
    is_local: isLocal,
    uri_protocol: uri ? (uri.startsWith('mongodb+srv://') ? 'mongodb+srv' : 'mongodb') : null,
    connection_state: stateMap[mongoose.connection.readyState] || 'unknown',
    ready_state: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    db_name: mongoose.connection.name || null
  };
}

export async function connectToDatabase() {
  const uri = getMongoUri();

  // 1 = connected, reuse existing connection
  if (mongoose.connection.readyState === 1 && cachedConnection) {
    return cachedConnection;
  }

  // 2 = connecting, wait on pending promise
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  // If disconnected or in broken state, clear stale cache
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cachedConnection = null;
    cachedPromise = null;
  }

  if (!uri) {
    const errorMsg = 'MONGODB_URI or ATLAS_MONGODB_URI is not defined in environment variables. Please add MONGODB_URI or ATLAS_MONGODB_URI in your deployment settings (Vercel/Render/Railway).';
    console.error(`❌ ${errorMsg}`);
    const err = new Error(errorMsg);
    err.code = 'ERR_NO_MONGODB_URI';
    throw err;
  }

  // Prevent multiple connection attempts within 500ms
  if (connectionAttemptTime && (Date.now() - connectionAttemptTime < 500)) {
    if (cachedPromise) return cachedPromise;
  }
  connectionAttemptTime = Date.now();

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
  const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');

  const opts = {
    // In serverless, smaller pools prevent exhausted Atlas connection limits
    maxPoolSize: isServerless ? 10 : 50,
    minPoolSize: isServerless ? 0 : 2,
    // Faster timeout for local DB, ample time for Atlas cold starts
    serverSelectionTimeoutMS: isLocal ? 5000 : 25000,
    connectTimeoutMS: isLocal ? 5000 : 25000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: isServerless ? 30000 : 10000,
    // Avoid blocking serverless function cold starts on background index builds
    autoIndex: !isServerless,
    bufferCommands: false
  };

  const start = Date.now();
  const uriType = isLocal ? '🏠 Local MongoDB' : '☁️ Remote MongoDB Atlas';
  console.log(`🔌 Attempting ${uriType} connection...`);

  cachedPromise = mongoose.connect(uri, opts)
    .then((mongooseInstance) => {
      cachedConnection = mongooseInstance.connection;
      const ms = Date.now() - start;
      console.info(`✅ MongoDB connected successfully in ${ms}ms [${uriType}] (Host: ${cachedConnection.host || 'local'}, DB: ${cachedConnection.name})`);
      return cachedConnection;
    })
    .catch((err) => {
      cachedPromise = null;
      cachedConnection = null;
      const ms = Date.now() - start;

      let diagnosisHint = 'Check MongoDB connection string and network access.';
      if (isLocal) {
        diagnosisHint = 'Local MongoDB is not reachable: Ensure MongoDB service is running (e.g., run `net start MongoDB` or verify mongod is listening on port 27017).';
      } else if (err.name === 'MongooseServerSelectionError' || err.message?.includes('Server selection timed out')) {
        diagnosisHint = 'MongoDB Atlas IP Whitelist: Ensure Network Access in MongoDB Atlas has 0.0.0.0/0 (Allow access from anywhere) enabled for serverless deployments.';
      } else if (err.message?.includes('bad auth') || err.message?.includes('Authentication failed')) {
        diagnosisHint = 'Authentication failed: Check that the database username and password in MONGODB_URI are correct. If password has special characters (@, :, #), URL-encode them.';
      }

      console.error(`❌ MongoDB connection failed after ${ms}ms:`, {
        name: err.name,
        message: err.message,
        code: err.code,
        diagnosisHint
      });

      err.diagnosisHint = diagnosisHint;
      throw err;
    });

  return cachedPromise;
}

export const dbMiddleware = async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('❌ DB Middleware Error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      hint: error.diagnosisHint
    });
    
    res.status(500).json({ 
      message: 'Database connection failed', 
      error_name: error.name,
      error_msg: error.message,
      hint: error.diagnosisHint || 'Check MONGODB_URI and MongoDB Atlas Network Access (0.0.0.0/0).',
      diagnostics: getDbDiagnostics()
    });
  }
};
