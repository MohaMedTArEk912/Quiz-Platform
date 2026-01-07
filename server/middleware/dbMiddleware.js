import mongoose from 'mongoose';

let cachedConnection = null;
let cachedPromise = null;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;
  
  // 1 = connected, 2 = connecting. Reuse existing sockets when possible.
  if (mongoose.connection.readyState === 1 && cachedConnection) {
    return cachedConnection;
  }
  if (mongoose.connection.readyState === 2 && cachedPromise) {
    return cachedPromise;
  }

  if (!uri) {
    const errorMsg = 'MONGODB_URI is not defined in environment variables';
    console.error(`❌ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const opts = {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 3000, // fail faster if cluster is unreachable
    connectTimeoutMS: 3000,
    socketTimeoutMS: 20000,
    heartbeatFrequencyMS: 8000,
    family: 4, // prefer IPv4 to avoid slow DNS/IPv6 fallbacks
  };

  const start = Date.now();

  cachedPromise = mongoose.connect(uri, opts)
    .then((mongooseInstance) => {
      cachedConnection = mongooseInstance.connection;
      const ms = Date.now() - start;
      console.info(`✅ MongoDB connected in ${ms}ms`);
      return cachedConnection;
    })
    .catch((err) => {
      cachedPromise = null; // allow retries on next request
      console.error('❌ MongoDB connection error:', {
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
    res.status(500).json({ 
      message: 'Database connection failed', 
      error: error.message,
      env_configured: !!process.env.MONGODB_URI
    });
  }
};
