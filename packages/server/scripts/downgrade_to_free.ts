
import { getFirestore, initializeFirebase } from '../src/firebase.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const args = process.argv.slice(2);
const forceAll = args.includes('--all');

async function downgrade() {
  initializeFirebase();
  const db = getFirestore();

  console.log('Fetching users with tier = max...');

  const snapshot = await db.collection('users')
    .where('tier', '==', 'max')
    .get();

  const users = snapshot.docs;
  console.log(`Found ${users.length} user(s) with max tier.\n`);

  if (users.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  const now = Date.now();
  let downgraded = 0;
  let skipped = 0;

  for (const doc of users) {
    const data = doc.data();
    const uid = doc.id;
    const hasActiveSub = typeof data.subscriptionExpiry === 'number' && data.subscriptionExpiry > now;

    if (hasActiveSub && !forceAll) {
      console.log(`SKIP  ${uid} — active subscription (expires ${new Date(data.subscriptionExpiry).toISOString()})`);
      skipped++;
      continue;
    }

    const reason = hasActiveSub ? ' (forced via --all)' : '';
    await doc.ref.update({
      tier: 'free',
      tierUpdatedAt: new Date().toISOString(),
    });
    console.log(`OK    ${uid} → free${reason}`);
    downgraded++;
  }

  console.log(`\nDone. Downgraded: ${downgraded}, Skipped: ${skipped}`);
  process.exit(0);
}

downgrade().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
