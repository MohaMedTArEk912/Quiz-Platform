import mongoose from 'mongoose';

let cachedConnection = null;
let cachedPromise = null;
let connectionAttemptTime = null;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  
  // 1 = connected, 2 = connecting. Reuse existing sockets when possible.
  if (mongoose.connection.readyState === 1 && cachedConnection) {
    console.log('♻️  Reusing existing MongoDB connection');
    return cachedConnection;
  }
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    console.log('⏳ Waiting for pending MongoDB connection...');
    return cachedPromise;
  }

  if (!uri) {
    const errorMsg = 'MONGODB_URI is not defined in environment variables';
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Prevent multiple connection attempts within a short time
  if (connectionAttemptTime && (Date.now() - connectionAttemptTime < 1000)) {
    console.log('⏸️  Skipping duplicate connection attempt');
    if (cachedPromise) return cachedPromise;
  }
  
  connectionAttemptTime = Date.now();

  const opts = {
    maxPoolSize: 50, // Support high concurrent query throughput
    minPoolSize: 5,  // Maintain ready warm sockets
    serverSelectionTimeoutMS: 5000, // Faster failure recovery (5s)
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
    autoIndex: true, // Automatically ensure indexes exist in background
    family: 4, // prefer IPv4 to avoid slow DNS/IPv6 fallbacks
  };

  const start = Date.now();
  console.log('🔌 Attempting MongoDB connection...');

  cachedPromise = mongoose.connect(uri, opts)
    .then((mongooseInstance) => {
      cachedConnection = mongooseInstance.connection;
      const ms = Date.now() - start;
      console.info(`✅ MongoDB connected in ${ms}ms`);
      return cachedConnection;
    })
    .catch((err) => {
      cachedPromise = null; // allow retries on next request
      cachedConnection = null;
      const ms = Date.now() - start;
      console.error(`❌ MongoDB connection failed after ${ms}ms:`, {
        message: err.message,
        code: err.code,
        name: err.name,
        uri: uri ? `${uri.split('@')[0]}@***` : 'undefined' // Log URI pattern without credentials
      });
      throw err;
    });

  return cachedPromise;
}

export const dbMiddleware = async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('❌ DB Middleware Error Details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      cause: error.cause
    });
    
    res.status(500).json({ 
      message: 'Database connection failed', 
      error_name: error.name,
      error_msg: error.message,
      // Only show full stack in dev
      ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
    });
  }
};
