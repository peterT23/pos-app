const dotenv = require('dotenv');
const app = require('./app');
const connectDb = require('./config/db');

dotenv.config();

const PORT = process.env.PORT || 5000;

function assertEnv(name) {
  if (!process.env[name]) {
    throw new Error(`${name} is required`);
  }
}

async function start() {
  assertEnv('MONGODB_URI');
  assertEnv('JWT_SECRET');
  assertEnv('JWT_REFRESH_SECRET');
  await connectDb();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`POS API running on port ${PORT}`);
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', err);
  process.exit(1);
});
