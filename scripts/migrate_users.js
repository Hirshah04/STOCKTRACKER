const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOCAL_DB_PATH = path.join(__dirname, '../data_fallback.json');

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function migrateData() {
  console.log("==================================================");
  console.log(" Starting Account & Email Uniqueness Migration");
  console.log("==================================================");

  // 1. Migrate Local Fallback JSON
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      console.log(`\nProcessing local store: ${LOCAL_DB_PATH}`);
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      const store = JSON.parse(raw);

      if (!store.users) store.users = [];
      if (!store.shops) store.shops = [];

      const usedEmails = new Set();
      let migratedCount = 0;

      store.users.forEach((user, idx) => {
        // Derive or clean email
        let email = (user.email || '').trim().toLowerCase();
        const username = (user.username || '').trim().toLowerCase();

        if (!isValidEmail(email)) {
          if (isValidEmail(username)) {
            email = username;
          } else {
            // Check associated shop email
            const shop = store.shops.find(s => s.id === user.shopId || s.shopId === user.shopId);
            if (shop && isValidEmail(shop.email) && !usedEmails.has(shop.email.toLowerCase())) {
              email = shop.email.toLowerCase();
            } else {
              const safeName = (username || `user_${idx}`).replace(/[^a-z0-9]/g, '');
              email = `${safeName}@shop.local`;
            }
          }
        }

        // Resolve collision if email is already taken
        if (usedEmails.has(email)) {
          const [userPart, domainPart] = email.split('@');
          let counter = 1;
          let candidate = `${userPart}_${counter}@${domainPart}`;
          while (usedEmails.has(candidate)) {
            counter++;
            candidate = `${userPart}_${counter}@${domainPart}`;
          }
          console.log(`[Collision Resolved] User "${username}" email changed from "${email}" to "${candidate}"`);
          email = candidate;
        }

        usedEmails.add(email);

        user.email = email;
        user.name = user.name || user.username || (user.role === 'owner' ? 'Shop Owner' : 'Staff Member');
        user.userId = user.userId || `user_${Date.now()}_${idx}`;
        user.role = user.role || 'staff';
        user.status = user.status || 'active';
        user.activeSessionId = user.activeSessionId || null;
        user.phone = user.phone || '';
        migratedCount++;
      });

      // Also ensure shops have ownerEmail
      store.shops.forEach(shop => {
        if (!shop.ownerEmail) {
          const ownerUser = store.users.find(u => (u.shopId === (shop.id || shop.shopId)) && u.role === 'owner');
          if (ownerUser) {
            shop.ownerEmail = ownerUser.email;
          } else if (shop.email) {
            shop.ownerEmail = shop.email.toLowerCase();
          }
        }
      });

      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(store, null, 2), 'utf8');
      console.log(` Successfully migrated ${migratedCount} users in data_fallback.json`);
    } catch (err) {
      console.error(" Error migrating local store:", err);
    }
  }

  // 2. Migrate MongoDB Atlas if URI is provided
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (mongoUri && !mongoUri.includes('YOUR_MONGODB_URI')) {
    try {
      console.log("\nConnecting to MongoDB Atlas...");
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
      console.log("Connected to MongoDB:", mongoose.connection.name);

      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');
      const shopsCollection = db.collection('shops');

      const allUsers = await usersCollection.find({}).toArray();
      console.log(`Found ${allUsers.length} user records in MongoDB Atlas.`);

      const usedEmails = new Set();
      let updatedCount = 0;

      for (let i = 0; i < allUsers.length; i++) {
        const user = allUsers[i];
        let email = (user.email || '').trim().toLowerCase();
        const username = (user.username || '').trim().toLowerCase();

        if (!isValidEmail(email)) {
          if (isValidEmail(username)) {
            email = username;
          } else {
            const shop = await shopsCollection.findOne({ shopId: user.shopId });
            if (shop && isValidEmail(shop.email) && !usedEmails.has(shop.email.toLowerCase())) {
              email = shop.email.toLowerCase();
            } else {
              const safeName = (username || `user_${i}`).replace(/[^a-z0-9]/g, '');
              email = `${safeName}@shop.local`;
            }
          }
        }

        // Resolve collision
        if (usedEmails.has(email)) {
          const [userPart, domainPart] = email.split('@');
          let counter = 1;
          let candidate = `${userPart}_${counter}@${domainPart}`;
          while (usedEmails.has(candidate)) {
            counter++;
            candidate = `${userPart}_${counter}@${domainPart}`;
          }
          console.log(`[Mongo Collision Resolved] User "${username}" email updated to "${candidate}"`);
          email = candidate;
        }

        usedEmails.add(email);

        const updateFields = {
          email,
          name: user.name || user.username || (user.role === 'owner' ? 'Shop Owner' : 'Staff Member'),
          userId: user.userId || `user_${user._id}`,
          role: user.role || 'staff',
          status: user.status || 'active',
          activeSessionId: user.activeSessionId || null,
          phone: user.phone || ''
        };

        await usersCollection.updateOne({ _id: user._id }, { $set: updateFields });
        updatedCount++;
      }

      console.log(`Updated ${updatedCount} user documents in MongoDB Atlas.`);

      // Ensure Unique Index on email
      try {
        console.log("Creating unique index on { email: 1 }...");
        await usersCollection.createIndex({ email: 1 }, { unique: true });
        console.log("Unique index on 'email' confirmed!");
      } catch (indexErr) {
        console.warn("Index creation notice:", indexErr.message);
      }

      // Ensure index on shopId
      try {
        await usersCollection.createIndex({ shopId: 1 });
      } catch (e) {}

      await mongoose.disconnect();
      console.log("MongoDB migration complete and connection closed.");
    } catch (mongoErr) {
      console.warn("MongoDB Atlas migration skipped or failed:", mongoErr.message);
      console.log("Run this migration again when MONGODB_URI is reachable.");
    }
  } else {
    console.log("\nMONGODB_URI not set. Run `npm run migrate` with MONGODB_URI in .env to migrate MongoDB Atlas.");
  }

  console.log("\n==================================================");
  console.log(" Account & Email Uniqueness Migration Finished");
  console.log("==================================================\n");
}

if (require.main === module) {
  migrateData().then(() => process.exit(0)).catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

module.exports = migrateData;
