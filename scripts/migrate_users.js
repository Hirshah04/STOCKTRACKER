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
  console.log(" Safe Account & Email Migration");
  console.log(" (Preserves all accounts; does NOT invent emails)");
  console.log("==================================================");

  // 1. Process Local Fallback Store
  if (fs.existsSync(LOCAL_DB_PATH)) {
    try {
      console.log(`\nInspecting local fallback store: ${LOCAL_DB_PATH}`);
      const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      const store = JSON.parse(raw);

      if (!store.users) store.users = [];
      if (!store.shops) store.shops = [];

      let withEmail = 0;
      let missingEmail = 0;

      store.users.forEach((user, idx) => {
        let email = (user.email || '').trim().toLowerCase();
        const username = (user.username || '').trim().toLowerCase();

        // If username is a valid email, adopt it
        if (!isValidEmail(email) && isValidEmail(username)) {
          email = username;
        }

        // Only keep genuine valid emails; do NOT invent fake ones
        if (isValidEmail(email)) {
          user.email = email;
          withEmail++;
        } else {
          user.email = null;
          missingEmail++;
          console.log(`[Account Missing Email] Username: "${user.username}" (Role: ${user.role}) - will prompt for email on login`);
        }

        user.userId = user.userId || `user_${idx}_${Date.now()}`;
        user.name = user.name || user.username || (user.role === 'owner' ? 'Shop Owner' : 'Team Member');
        user.status = user.status || 'active';
        user.phone = user.phone || '';
      });

      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(store, null, 2), 'utf8');
      console.log(`\nLocal store check: ${withEmail} accounts with verified email, ${missingEmail} legacy accounts awaiting profile email setup.`);
    } catch (err) {
      console.error("Error inspecting local store:", err);
    }
  }

  // 2. Process MongoDB Atlas if URI is provided
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (mongoUri && !mongoUri.includes('YOUR_MONGODB_URI')) {
    try {
      console.log("\nConnecting to MongoDB Atlas...");
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
      console.log("Connected to MongoDB:", mongoose.connection.name);

      const db = mongoose.connection.db;
      const usersCollection = db.collection('users');

      const allUsers = await usersCollection.find({}).toArray();
      console.log(`Found ${allUsers.length} total user accounts in MongoDB Atlas.`);

      let mongoWithEmail = 0;
      let mongoMissingEmail = 0;

      for (const user of allUsers) {
        let email = (user.email || '').trim().toLowerCase();
        const username = (user.username || '').trim().toLowerCase();

        if (!isValidEmail(email) && isValidEmail(username)) {
          email = username;
        }

        const updateDoc = {
          name: user.name || user.username || 'User',
          status: user.status || 'active',
          phone: user.phone || ''
        };

        if (isValidEmail(email)) {
          updateDoc.email = email;
          mongoWithEmail++;
        } else {
          updateDoc.email = null;
          mongoMissingEmail++;
          console.log(`[Mongo Account Missing Email] Username: "${user.username}" (ID: ${user._id})`);
        }

        await usersCollection.updateOne({ _id: user._id }, { $set: updateDoc });
      }

      console.log(`\nMongoDB Atlas accounts: ${mongoWithEmail} with email, ${mongoMissingEmail} awaiting email collection.`);

      // Drop old standard unique index if it exists to replace with partial unique index
      try {
        await usersCollection.dropIndex('email_1');
        console.log("Dropped previous standard 'email_1' index to apply safe partial unique index.");
      } catch (dropErr) {
        // Index didn't exist or already dropped
      }

      // Create Partial Unique Index on email
      console.log("Creating partial unique index on { email: 1 } where email exists...");
      await usersCollection.createIndex(
        { email: 1 },
        { 
          unique: true, 
          partialFilterExpression: { email: { $type: "string", $gt: "" } } 
        }
      );
      console.log("Partial unique index on email successfully established!");

      // Ensure index on shopId
      try {
        await usersCollection.createIndex({ shopId: 1 });
      } catch (e) {}

      await mongoose.disconnect();
      console.log("MongoDB connection closed.");
    } catch (mongoErr) {
      console.warn("MongoDB migration error / skipped:", mongoErr.message);
    }
  } else {
    console.log("\nMONGODB_URI not set. Run `npm run migrate` with MONGODB_URI in .env when ready to apply to Atlas.");
  }

  console.log("\n==================================================");
  console.log(" Account & Email Migration Complete");
  console.log("==================================================\n");
}

if (require.main === module) {
  migrateData().then(() => process.exit(0)).catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}

module.exports = migrateData;
