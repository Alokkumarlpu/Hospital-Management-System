import app from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

const server = app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

connectDatabase().catch((error) => {
  console.error(`MongoDB connection failed: ${error.message}`);
  if (env.nodeEnv === 'production') {
    server.close(() => process.exit(1));
  }
});

function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
