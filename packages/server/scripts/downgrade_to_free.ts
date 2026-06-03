
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Try server package dir first, then home directory (supports both dotenv and raw JSON SA key)
const envPaths = [
  path.join(__dirname, '../.env'),
  path.join(os.homedir(), '.env'),
];

let serviceAccount: Record<string, unknown> | null = null;

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, 'utf8');
    if (raw.trim().startsWith('{')) {
      serviceAccount = JSON.parse(raw);
    } else {
      dotenv.config({ path: p });
    }
  }
}

const args = process.argv.slice(2);
const forceAll = args.includes('--all');

async function downgrade() {
  const admin = (await import('firebase-admin')).default;

  if (!admin.apps.length) {
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount as any) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      console.error('No Firebase credentials found.');
      console.error('Provide a JSON service account file at ~/.env or packages/server/.env');
      process.exit(1);
    }
  }

  const db = admin.firestore();

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
