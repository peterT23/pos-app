const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDb = require('../config/db');
const User = require('../models/User');

dotenv.config();

async function seed() {
  await connectDb();

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || '123456';

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.toLowerCase(),
    name: 'Admin',
    passwordHash,
    role: 'system_admin',
  });

  // eslint-disable-next-line no-console
  console.log('System admin created:', user.email);
  process.exit(0);
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
