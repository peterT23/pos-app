const dotenv = require('dotenv');
const connectDb = require('../config/db');
const Store = require('../models/Store');

dotenv.config();

async function markHeadquarters() {
  await connectDb();

  const stores = await Store.find({}).sort({ createdAt: 1 }).lean();
  if (stores.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No stores found.');
    process.exit(0);
  }

  const storesByUser = new Map();
  stores.forEach((store) => {
    if (!store.userId) return;
    if (!storesByUser.has(store.userId)) {
      storesByUser.set(store.userId, []);
    }
    storesByUser.get(store.userId).push(store);
  });

  let updated = 0;
  for (const [userId, userStores] of storesByUser.entries()) {
    const hasHeadquarters = userStores.some((store) => store.isHeadquarters === true);
    if (hasHeadquarters) continue;

    const firstStore = userStores[0];
    if (!firstStore) continue;

    await Store.updateOne({ _id: firstStore._id }, { $set: { isHeadquarters: true } });
    updated += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Marked headquarters for ${updated} owner(s).`);
  process.exit(0);
}

markHeadquarters().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
