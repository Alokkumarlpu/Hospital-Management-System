import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  cookieName: 'hms_session',
};

if (!env.mongoUri && env.nodeEnv !== 'test') {
  console.warn('MONGODB_URI is not set. Database operations will be unavailable.');
}
