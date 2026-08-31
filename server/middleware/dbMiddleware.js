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
  const raw = process.env.MONGODB_URI || 
              process.env.MONGO_URI || 
              process.env.DATABASE_URL || 
              process.env.MONGODB_URL || 
              process.env.DB_URI;
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
  return {
    is_uri_defined: Boolean(uri),
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
    const errorMsg = 'MONGODB_URI is not defined in environment variables. Please add MONGODB_URI in your deployment settings (Vercel/Render/Railway).';
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

  const opts = {
    // In serverless, smaller pools prevent exhausted Atlas connection limits
    maxPoolSize: isServerless ? 10 : 50,
    minPoolSize: isServerless ? 0 : 2,
    // 25s timeout ensures Atlas cold-start TLS handshake has ample time
    serverSelectionTimeoutMS: 25000,
    connectTimeoutMS: 25000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: isServerless ? 30000 : 10000,
    // Avoid blocking serverless function cold starts on background index builds
    autoIndex: !isServerless,
    bufferCommands: false
  };

  const start = Date.now();
  console.log('🔌 Attempting MongoDB connection...');

  cachedPromise = mongoose.connect(uri, opts)
    .then((mongooseInstance) => {
      cachedConnection = mongooseInstance.connection;
      const ms = Date.now() - start;
      console.info(`✅ MongoDB connected successfully in ${ms}ms (Host: ${cachedConnection.host || 'remote'})`);
      return cachedConnection;
    })
    .catch((err) => {
      cachedPromise = null;
      cachedConnection = null;
      const ms = Date.now() - start;

      let diagnosisHint = 'Check MongoDB Atlas network access and connection string.';
      if (err.name === 'MongooseServerSelectionError' || err.message?.includes('Server selection timed out')) {
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
