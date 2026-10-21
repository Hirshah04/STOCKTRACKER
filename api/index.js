const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { sendOtpEmail } = require('./emailService');

// Models
const Stock = require('./models/Stock');
const Activity = require('./models/Activity');
const Shop = require('./models/Shop');
const User = require('./models/User');
const Product = require('./models/Product');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static web app assets when running standalone server locally
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  app.use(express.static(path.join(__dirname, '../')));
}

// Database connection & Local Fallback Store
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGODB_URI_MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'stocktracker_jwt_secret_key_2026_super_secure';
let isMongoConnected = false;

const LOCAL_DB_PATH = path.join(__dirname, '../data_fallback.json');

function loadLocalStore() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.products) parsed.products = [];
      return parsed;
    }
  } catch (e) {
    console.error("Error reading local db fallback:", e);
  }
  return { shops: [], users: [], products: [], stocks: [], activities: [] };
}

function saveLocalStore(store) {
  try {
    const dir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error("Error writing local db fallback:", e);
  }
}

let lastMongoError = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    lastMongoError = null;
    return true;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGODB_URI_MONGODB_URI;

  if (!mongoUri || mongoUri.includes('YOUR_MONGODB_URI')) {
    lastMongoError = "MONGODB_URI environment variable is not set";
    isMongoConnected = false;
    return false;
  }
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    isMongoConnected = true;
    lastMongoError = null;
    console.log(`\n==================================================`);
    console.log(` SUCCESS: Connected to MongoDB Atlas!`);
    console.log(` Database: ${mongoose.connection.name}`);
    console.log(`==================================================\n`);
    return true;
  } catch (e) {
    lastMongoError = e.message;
    console.error(`\n==================================================`);
    console.error(` WARNING: MongoDB connection failed!`);
    console.error(` Error: ${e.message}`);
    console.error(` Notice: App running in Local Fallback mode.`);
    console.error(`==================================================\n`);
    isMongoConnected = false;
    return false;
  }
}

// Middleware to ensure DB attempt before handling requests
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Helper response formatting
function apiSuccess(res, data, message = "") {
  return res.json({ 
    success: true, 
    data, 
    message, 
    dbMode: isMongoConnected ? "mongodb" : "local_fallback",
    dbError: lastMongoError
  });
}

function apiError(res, message = "An error occurred", code = 400) {
  return res.status(code).json({ success: false, message, dbMode: isMongoConnected ? "mongodb" : "local_fallback" });
}

// ================= AUTHENTICATION & AUTHORIZATION MIDDLEWARE =================
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return apiError(res, "Access denied. Authentication token required.", 401);
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return apiError(res, "Invalid or expired token.", 401);
    }

    try {
      let user = null;
      if (isMongoConnected) {
        user = await User.findOne({
          $or: [
            { userId: decoded.userId },
            { email: decoded.email },
            { username: decoded.username || decoded.email }
          ]
        });
      } else {
        const store = loadLocalStore();
        user = store.users.find(u => 
          (decoded.userId && u.userId === decoded.userId) ||
          (decoded.email && u.email && u.email.toLowerCase() === decoded.email.toLowerCase()) ||
          (decoded.username && u.username && u.username.toLowerCase() === decoded.username.toLowerCase())
        );
      }

      if (!user) {
        return apiError(res, "User account no longer exists.", 401);
      }

      if (user.status === 'disabled') {
        return apiError(res, "Your account has been disabled. Please contact the shop owner.", 403);
      }

      // Single active session validation:
      // If the session ID in token does not match activeSessionId on user record,
      // it means a newer login occurred on another device or the password was reset.
      if (decoded.sessionId && user.activeSessionId && decoded.sessionId !== user.activeSessionId) {
        return res.status(401).json({
          success: false,
          code: "SESSION_REVOKED",
          message: "Your account was logged in on another device. Please sign in again."
        });
      }

      req.user = {
        userId: user.userId || String(user._id),
        name: user.name || user.username || "User",
        email: user.email,
        username: user.username || user.name || (user.email ? user.email.split('@')[0] : "user"),
        role: user.role,
        shopId: user.shopId,
        sessionId: decoded.sessionId
      };

      next();
    } catch (dbErr) {
      return apiError(res, "Authentication check failed: " + dbErr.message, 500);
    }
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return apiError(res, "Forbidden: Your account role is not authorized to perform this action.", 403);
    }
    next();
  };
}

// Helper to sanitize user object (strip password and sensitive reset tokens)
function sanitizeUser(userDoc) {
  const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete u.password;
  delete u.otpHash;
  delete u.otpExpires;
  delete u.otpAttempts;
  delete u.otpLastSentAt;
  delete u.resetTokenHash;
  delete u.resetTokenExpires;
  delete u.__v;
  return u;
}

// Helper to hash passwords securely
function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, 10);
}

function comparePassword(plainPassword, storedHashOrPlain) {
  if (!storedHashOrPlain) return false;
  // Check bcrypt hash format ($2a$, $2b$, $2y$)
  if (storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$') || storedHashOrPlain.startsWith('$2y$')) {
    return bcrypt.compareSync(plainPassword, storedHashOrPlain);
  }
  // Fallback for legacy plain text passwords in dev fallback
  return plainPassword === storedHashOrPlain;
}

// Allowed units enum validation
const ALLOWED_UNITS = ["kg", "litre", "piece", "meter", "set"];
const ALLOWED_TRANSACTION_TYPES = ["bill", "challan", "cash", ""];

function isFutureDate(dateInput) {
  if (!dateInput) return false;
  const inputDate = new Date(dateInput);
  if (isNaN(inputDate.getTime())) return false;
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return inputDate > todayEnd;
}

// ================= ROUTES =================

// 1. System Health / Status
app.get('/api/status', (req, res) => {
  apiSuccess(res, {
    status: "online",
    dbConnected: isMongoConnected,
    dbMode: isMongoConnected ? "MongoDB Atlas" : "Local Storage / File Fallback",
    dbName: isMongoConnected ? mongoose.connection.name : null,
    dbError: lastMongoError,
    timestamp: new Date().toISOString()
  });
});

// 2. Auth Routes

// POST /api/auth/login - Email ID & Password login with single active session enforcement
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = normalizeEmail(email || username);

    if (!loginIdentifier || !password) {
      return apiError(res, "Email address and password are required", 400);
    }

    let user = null;
    let shop = null;

    if (isMongoConnected) {
      user = await User.findOne({
        $or: [
          { email: loginIdentifier },
          { username: loginIdentifier }
        ]
      });

      if (user && comparePassword(password, user.password)) {
        shop = await Shop.findOne({ shopId: user.shopId });
      } else {
        user = null;
      }
    } else {
      const store = loadLocalStore();
      const found = store.users.find(u => 
        (u.email && u.email.toLowerCase() === loginIdentifier) ||
        (u.username && u.username.toLowerCase() === loginIdentifier)
      );

      if (found && comparePassword(password, found.password)) {
        user = found;
        shop = store.shops.find(s => s.id === user.shopId || s.shopId === user.shopId);
      }
    }

    if (!user) {
      // Clear generic message without exposing whether account exists
      return apiError(res, "Invalid email or password", 401);
    }

    if (user.status === 'disabled') {
      return apiError(res, "Your account has been disabled. Please contact the shop owner.", 403);
    }

    // Generate new active session ID to enforce single active session per account
    const newSessionId = crypto.randomUUID();
    user.activeSessionId = newSessionId;

    if (isMongoConnected) {
      await User.updateOne(
        { _id: user._id },
        { $set: { activeSessionId: newSessionId } }
      );
    } else {
      const store = loadLocalStore();
      const idx = store.users.findIndex(u => 
        (u.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
        (u.username && u.username.toLowerCase() === user.username.toLowerCase())
      );
      if (idx !== -1) {
        store.users[idx].activeSessionId = newSessionId;
        saveLocalStore(store);
      }
    }

    // Generate JWT Token with session info
    const tokenPayload = {
      userId: user.userId || String(user._id),
      email: user.email,
      name: user.name || user.username || "User",
      role: user.role,
      shopId: user.shopId,
      sessionId: newSessionId
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return apiSuccess(res, {
      token,
      user: {
        userId: user.userId || String(user._id),
        name: user.name || user.username || "User",
        email: user.email || null,
        username: user.username,
        role: user.role,
        shopId: user.shopId,
        needsEmailSetup: !user.email
      },
      shop: shop ? { id: shop.shopId || shop.id, name: shop.name, phone: shop.phone, email: shop.email } : null
    }, "Login successful");
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// POST /api/auth/setup-email - Safe profile-update flow to collect missing email address for existing accounts
app.post('/api/auth/setup-email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return apiError(res, "Please provide a valid email address", 400);
    }

    if (isMongoConnected) {
      // Check if email is already taken by another account
      const existing = await User.findOne({
        email: cleanEmail,
        _id: { $ne: req.user.userId }
      });
      if (existing) {
        return apiError(res, "This email address is already registered to another account", 400);
      }

      try {
        await User.updateOne(
          { $or: [{ userId: req.user.userId }, { _id: req.user.userId }] },
          { $set: { email: cleanEmail } }
        );
      } catch (err) {
        if (err.code === 11000) {
          return apiError(res, "This email address is already registered to another account", 400);
        }
        throw err;
      }
    } else {
      const store = loadLocalStore();
      const duplicate = store.users.find(u => 
        u.email && u.email.toLowerCase() === cleanEmail && 
        u.userId !== req.user.userId && u.username !== req.user.username
      );
      if (duplicate) {
        return apiError(res, "This email address is already registered to another account", 400);
      }

      const idx = store.users.findIndex(u => 
        (req.user.userId && u.userId === req.user.userId) ||
        (req.user.username && u.username === req.user.username)
      );
      if (idx !== -1) {
        store.users[idx].email = cleanEmail;
        saveLocalStore(store);
      }
    }

    // Generate updated token with the new email
    const tokenPayload = {
      userId: req.user.userId,
      email: cleanEmail,
      name: req.user.name,
      username: req.user.username,
      role: req.user.role,
      shopId: req.user.shopId,
      sessionId: req.user.sessionId
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return apiSuccess(res, {
      token,
      user: {
        userId: req.user.userId,
        name: req.user.name,
        email: cleanEmail,
        username: req.user.username,
        role: req.user.role,
        shopId: req.user.shopId,
        needsEmailSetup: false
      }
    }, "Email address registered successfully");
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// POST /api/auth/register - Register Shop & Owner Account with Unique Email
app.post('/api/auth/register', async (req, res) => {
  try {
    const { shopName, phone, email, ownerName, ownerUsername, ownerPassword } = req.body;

    const rawEmail = email || '';
    const cleanEmail = normalizeEmail(rawEmail);
    const password = ownerPassword;
    const name = (ownerName || ownerUsername || '').trim();

    if (!shopName || !cleanEmail || !password) {
      return apiError(res, "Shop name, email address, and password are required", 400);
    }

    if (!isValidEmail(cleanEmail)) {
      return apiError(res, "Please provide a valid email address", 400);
    }

    if (password.length < 6) {
      return apiError(res, "Password must be at least 6 characters long", 400);
    }

    const shopId = "shop_" + Date.now();
    const userId = "user_" + Date.now();
    const hashedPassword = hashPassword(password);
    const sessionId = crypto.randomUUID();

    if (isMongoConnected) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return apiError(res, "An account with this email address is already registered", 400);
      }

      const shop = await Shop.create({
        shopId,
        name: shopName.trim(),
        phone: phone ? phone.trim() : "",
        email: cleanEmail,
        ownerEmail: cleanEmail,
        ownerUsername: cleanEmail.split('@')[0]
      });

      let user;
      try {
        user = await User.create({
          userId,
          name: name || "Shop Owner",
          email: cleanEmail,
          username: cleanEmail.split('@')[0],
          phone: phone ? phone.trim() : "",
          password: hashedPassword,
          role: "owner",
          shopId,
          status: "active",
          activeSessionId: sessionId
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          return apiError(res, "An account with this email address is already registered", 400);
        }
        throw createErr;
      }

      const token = jwt.sign({
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        shopId: user.shopId,
        sessionId
      }, JWT_SECRET, { expiresIn: '7d' });

      return apiSuccess(res, {
        token,
        user: { userId: user.userId, name: user.name, email: user.email, role: user.role, shopId: user.shopId },
        shop: { id: shop.shopId, name: shop.name, phone: shop.phone, email: shop.email }
      }, "Shop & Owner account registered successfully");
    } else {
      const store = loadLocalStore();
      if (store.users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
        return apiError(res, "An account with this email address is already registered", 400);
      }

      const newShop = {
        id: shopId,
        shopId,
        name: shopName.trim(),
        phone: phone || "",
        email: cleanEmail,
        ownerEmail: cleanEmail,
        ownerUsername: cleanEmail.split('@')[0]
      };
      const newUser = {
        userId,
        name: name || "Shop Owner",
        email: cleanEmail,
        username: cleanEmail.split('@')[0],
        phone: phone || "",
        password: hashedPassword,
        role: "owner",
        shopId,
        status: "active",
        activeSessionId: sessionId
      };

      store.shops.push(newShop);
      store.users.push(newUser);
      saveLocalStore(store);

      const token = jwt.sign({
        userId,
        email: cleanEmail,
        name: newUser.name,
        role: "owner",
        shopId,
        sessionId
      }, JWT_SECRET, { expiresIn: '7d' });

      return apiSuccess(res, {
        token,
        user: { userId, name: newUser.name, email: cleanEmail, role: "owner", shopId },
        shop: newShop
      }, "Shop registered in local storage fallback mode");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// GET /api/auth/me - Authenticated user details & session check
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    let shop = null;
    if (isMongoConnected) {
      shop = await Shop.findOne({ shopId: req.user.shopId });
    } else {
      const store = loadLocalStore();
      shop = store.shops.find(s => s.id === req.user.shopId || s.shopId === req.user.shopId);
    }

    return apiSuccess(res, {
      user: req.user,
      shop: shop ? { id: shop.shopId || shop.id, name: shop.name, phone: shop.phone, email: shop.email } : null
    });
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// ================= PASSWORD RESET WITH EMAIL OTP =================

// Step 1: Send OTP to registered email
app.post('/api/auth/forgot-password/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      return apiError(res, "Please enter a valid email address", 400);
    }

    // Generic confirmation message for security to prevent account enumeration
    const genericConfirmation = "If an account exists for this email, an OTP will be sent.";

    let user = null;
    if (isMongoConnected) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      const store = loadLocalStore();
      user = store.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    }

    if (!user) {
      return apiSuccess(res, null, genericConfirmation);
    }

    // Cooldown verification (60 seconds)
    const now = Date.now();
    if (user.otpLastSentAt && (now - new Date(user.otpLastSentAt).getTime() < 60000)) {
      const secondsRemaining = Math.ceil((60000 - (now - new Date(user.otpLastSentAt).getTime())) / 1000);
      return apiError(res, `Please wait ${secondsRemaining} seconds before requesting a new OTP.`, 429);
    }

    // Generate randomly generated, cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = bcrypt.hashSync(otp, 10);
    const otpExpires = new Date(now + 5 * 60 * 1000); // 5 minutes validity

    if (isMongoConnected) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            otpHash,
            otpExpires,
            otpAttempts: 0,
            otpLastSentAt: new Date(now),
            resetTokenHash: null,
            resetTokenExpires: null
          }
        }
      );
    } else {
      const store = loadLocalStore();
      const idx = store.users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
      if (idx !== -1) {
        store.users[idx].otpHash = otpHash;
        store.users[idx].otpExpires = otpExpires;
        store.users[idx].otpAttempts = 0;
        store.users[idx].otpLastSentAt = new Date(now);
        store.users[idx].resetTokenHash = null;
        store.users[idx].resetTokenExpires = null;
        saveLocalStore(store);
      }
    }

    // Send email via emailService
    await sendOtpEmail(cleanEmail, otp, 5);

    return apiSuccess(res, null, genericConfirmation);
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// Step 2: Verify OTP
app.post('/api/auth/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail || !otp) {
      return apiError(res, "Email address and 6-digit verification code are required", 400);
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return apiError(res, "Verification code must be exactly 6 digits", 400);
    }

    let user = null;
    if (isMongoConnected) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      const store = loadLocalStore();
      user = store.users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    }

    if (!user || !user.otpHash) {
      return apiError(res, "Invalid or expired verification code", 400);
    }

    const now = Date.now();
    // Expire OTP after 5 minutes
    if (!user.otpExpires || now > new Date(user.otpExpires).getTime()) {
      return apiError(res, "Verification code has expired. Please request a new one.", 400);
    }

    // Limit incorrect attempts (max 5)
    if ((user.otpAttempts || 0) >= 5) {
      if (isMongoConnected) {
        await User.updateOne({ _id: user._id }, { $set: { otpHash: null, otpExpires: null } });
      } else {
        const store = loadLocalStore();
        const idx = store.users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
        if (idx !== -1) {
          store.users[idx].otpHash = null;
          store.users[idx].otpExpires = null;
          saveLocalStore(store);
        }
      }
      return apiError(res, "Too many incorrect attempts. Please request a new verification code.", 429);
    }

    // Verify OTP against hashed value
    const isMatch = bcrypt.compareSync(cleanOtp, user.otpHash);
    if (!isMatch) {
      const newAttempts = (user.otpAttempts || 0) + 1;
      if (isMongoConnected) {
        await User.updateOne({ _id: user._id }, { $set: { otpAttempts: newAttempts } });
      } else {
        const store = loadLocalStore();
        const idx = store.users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
        if (idx !== -1) {
          store.users[idx].otpAttempts = newAttempts;
          saveLocalStore(store);
        }
      }
      const attemptsLeft = Math.max(0, 5 - newAttempts);
      return apiError(res, `Invalid verification code. ${attemptsLeft} attempt(s) remaining.`, 400);
    }

    // OTP verified: invalidate OTP immediately (single use) and issue reset authorization token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(now + 10 * 60 * 1000); // 10 minutes

    if (isMongoConnected) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            otpHash: null,
            otpExpires: null,
            otpAttempts: 0,
            resetTokenHash,
            resetTokenExpires
          }
        }
      );
    } else {
      const store = loadLocalStore();
      const idx = store.users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);
      if (idx !== -1) {
        store.users[idx].otpHash = null;
        store.users[idx].otpExpires = null;
        store.users[idx].otpAttempts = 0;
        store.users[idx].resetTokenHash = resetTokenHash;
        store.users[idx].resetTokenExpires = resetTokenExpires;
        saveLocalStore(store);
      }
    }

    return apiSuccess(res, { resetToken }, "Verification successful");
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// Step 3: Reset Password with single-use authorization token
app.post('/api/auth/forgot-password/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken) {
      return apiError(res, "Password reset authorization token is required", 400);
    }

    if (!newPassword || !confirmPassword) {
      return apiError(res, "New password and confirm password are required", 400);
    }

    if (newPassword !== confirmPassword) {
      return apiError(res, "Passwords do not match", 400);
    }

    if (newPassword.length < 6) {
      return apiError(res, "Password must be at least 6 characters long", 400);
    }

    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const now = new Date();

    let user = null;
    if (isMongoConnected) {
      user = await User.findOne({
        resetTokenHash: tokenHash,
        resetTokenExpires: { $gt: now }
      });
    } else {
      const store = loadLocalStore();
      user = store.users.find(u => 
        u.resetTokenHash === tokenHash && 
        u.resetTokenExpires && 
        new Date(u.resetTokenExpires).getTime() > now.getTime()
      );
    }

    if (!user) {
      return apiError(res, "Password reset session has expired or is invalid. Please restart the request.", 400);
    }

    const hashedPassword = hashPassword(newPassword);
    // Invalidate all active sessions for this account
    const newSessionId = crypto.randomUUID();

    if (isMongoConnected) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword,
            resetTokenHash: null,
            resetTokenExpires: null,
            otpHash: null,
            otpExpires: null,
            activeSessionId: newSessionId
          }
        }
      );
    } else {
      const store = loadLocalStore();
      const idx = store.users.findIndex(u => (u.userId && u.userId === user.userId) || (u.email === user.email));
      if (idx !== -1) {
        store.users[idx].password = hashedPassword;
        store.users[idx].resetTokenHash = null;
        store.users[idx].resetTokenExpires = null;
        store.users[idx].otpHash = null;
        store.users[idx].otpExpires = null;
        store.users[idx].activeSessionId = newSessionId;
        saveLocalStore(store);
      }
    }

    return apiSuccess(res, null, "Password reset successfully. Please log in with your new password.");
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// 3. Shop Routes (Protected)
app.get('/api/shops/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.shopId !== id) {
      return apiError(res, "Unauthorized access to another shop", 403);
    }

    if (isMongoConnected) {
      const shop = await Shop.findOne({ shopId: id });
      if (!shop) return apiError(res, "Shop not found", 404);
      return apiSuccess(res, shop);
    } else {
      const store = loadLocalStore();
      const shop = store.shops.find(s => s.id === id || s.shopId === id);
      if (!shop) return apiError(res, "Shop not found", 404);
      return apiSuccess(res, shop);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// Helper to build robust shop query matching shopId, id, or MongoDB _id
function getShopMongoQuery(shopId) {
  const query = {
    $or: [
      { shopId: shopId },
      { id: shopId }
    ]
  };
  if (mongoose.Types.ObjectId.isValid(shopId)) {
    query.$or.push({ _id: shopId });
  }
  return query;
}

// PUT /api/shops/:id - Update Shop Profile and persist changes to database
app.put('/api/shops/:id', authenticateToken, requireRole("owner"), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.shopId !== id) {
      return apiError(res, "Unauthorized access to another shop", 403);
    }

    const { name, phone, email } = req.body;
    if (!name || !name.trim()) {
      return apiError(res, "Shop name is required", 400);
    }

    const cleanName = name.trim();
    const cleanPhone = phone !== undefined ? phone.trim() : "";
    const cleanEmail = email ? normalizeEmail(email) : "";

    console.log(`[API:Shop] Saving profile updates for shopId=${id}:`, { name: cleanName, phone: cleanPhone, email: cleanEmail });

    if (isMongoConnected) {
      const shop = await Shop.findOneAndUpdate(
        getShopMongoQuery(id),
        {
          $set: {
            name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            ownerEmail: cleanEmail
          }
        },
        { new: true }
      );
      if (!shop) return apiError(res, "Shop not found in database", 404);

      // Keep Owner user record aligned in MongoDB User collection
      if (cleanEmail) {
        await User.updateMany(
          { shopId: id, role: "owner" },
          { $set: { email: cleanEmail, phone: cleanPhone } }
        );
      }

      console.log(`[API:Shop] Persisted shop updates to MongoDB Atlas successfully for shopId=${id}`);
      return apiSuccess(res, {
        id: shop.shopId || shop.id || String(shop._id),
        shopId: shop.shopId || shop.id || String(shop._id),
        name: shop.name,
        phone: shop.phone,
        email: shop.email,
        ownerEmail: shop.ownerEmail
      }, "Shop profile updated successfully in database");
    } else {
      const store = loadLocalStore();
      const idx = store.shops.findIndex(s => s.id === id || s.shopId === id);
      if (idx === -1) return apiError(res, "Shop not found", 404);

      store.shops[idx].name = cleanName;
      store.shops[idx].phone = cleanPhone;
      store.shops[idx].email = cleanEmail;
      store.shops[idx].ownerEmail = cleanEmail;

      // Sync owner user in local fallback store
      const ownerIdx = store.users.findIndex(u => u.shopId === id && u.role === "owner");
      if (ownerIdx !== -1 && cleanEmail) {
        store.users[ownerIdx].email = cleanEmail;
        store.users[ownerIdx].phone = cleanPhone;
      }

      saveLocalStore(store);
      console.log(`[API:Shop] Persisted shop updates to local fallback store for shopId=${id}`);

      return apiSuccess(res, store.shops[idx], "Shop profile updated successfully in database");
    }
  } catch (e) {
    console.error('[API:Shop] Error updating shop:', e);
    return apiError(res, e.message, 500);
  }
});

// PUT /api/auth/profile - Update personal user account profile & optional password in database
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    console.log(`[API:Profile] Updating personal profile for userId=${userId}:`, { name, email, phone });

    const userQuery = {
      $or: [
        { userId: userId },
        { email: req.user.email }
      ]
    };
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userQuery.$or.push({ _id: userId });
    }

    let userDoc = null;
    let store = null;

    if (isMongoConnected) {
      userDoc = await User.findOne(userQuery);
    } else {
      store = loadLocalStore();
      userDoc = store.users.find(u => 
        (userId && u.userId === userId) ||
        (req.user.email && u.email && u.email.toLowerCase() === req.user.email.toLowerCase())
      );
    }

    if (!userDoc) {
      return apiError(res, "User account not found in database", 404);
    }

    const cleanName = name ? name.trim() : (userDoc.name || userDoc.username);
    const cleanPhone = phone !== undefined ? phone.trim() : (userDoc.phone || "");
    let cleanEmail = userDoc.email;

    if (email && email.trim()) {
      cleanEmail = normalizeEmail(email);
      if (!isValidEmail(cleanEmail)) {
        return apiError(res, "Please provide a valid email address", 400);
      }

      // Check for email collision
      if (cleanEmail !== (userDoc.email || '').toLowerCase()) {
        if (isMongoConnected) {
          const duplicate = await User.findOne({ email: cleanEmail, _id: { $ne: userDoc._id } });
          if (duplicate) {
            return apiError(res, "This email address is already in use by another account", 400);
          }
        } else {
          const duplicate = store.users.find(u => 
            u.email && u.email.toLowerCase() === cleanEmail && (u.userId !== userDoc.userId)
          );
          if (duplicate) {
            return apiError(res, "This email address is already in use by another account", 400);
          }
        }
      }
    }

    let passwordHash = userDoc.password;
    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return apiError(res, "Current password is required to change password", 400);
      }
      if (!comparePassword(currentPassword, userDoc.password)) {
        return apiError(res, "Current password is incorrect", 400);
      }
      if (newPassword.trim().length < 6) {
        return apiError(res, "New password must be at least 6 characters long", 400);
      }
      passwordHash = hashPassword(newPassword.trim());
    }

    if (isMongoConnected) {
      await User.updateOne(
        { _id: userDoc._id },
        {
          $set: {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password: passwordHash
          }
        }
      );

      // If owner, keep shop owner details aligned
      if (userDoc.role === 'owner') {
        await Shop.updateOne(
          getShopMongoQuery(userDoc.shopId),
          { $set: { ownerEmail: cleanEmail, email: cleanEmail, phone: cleanPhone } }
        );
      }
    } else {
      const idx = store.users.findIndex(u => 
        (userId && u.userId === userId) ||
        (userDoc.email && u.email && u.email.toLowerCase() === userDoc.email.toLowerCase())
      );
      if (idx !== -1) {
        store.users[idx].name = cleanName;
        store.users[idx].email = cleanEmail;
        store.users[idx].phone = cleanPhone;
        store.users[idx].password = passwordHash;

        if (userDoc.role === 'owner') {
          const sIdx = store.shops.findIndex(s => s.id === userDoc.shopId || s.shopId === userDoc.shopId);
          if (sIdx !== -1) {
            store.shops[sIdx].ownerEmail = cleanEmail;
            store.shops[sIdx].email = cleanEmail;
            store.shops[sIdx].phone = cleanPhone;
          }
        }
        saveLocalStore(store);
      }
    }

    const sessionId = userDoc.activeSessionId || req.user.sessionId || crypto.randomUUID();
    const token = jwt.sign({
      userId: userDoc.userId || String(userDoc._id),
      email: cleanEmail,
      name: cleanName,
      role: userDoc.role,
      shopId: userDoc.shopId,
      sessionId
    }, JWT_SECRET, { expiresIn: '7d' });

    const safeUser = {
      userId: userDoc.userId || String(userDoc._id),
      id: userDoc.userId || String(userDoc._id),
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: userDoc.role,
      shopId: userDoc.shopId
    };

    console.log(`[API:Profile] Persisted user profile updates to database for ${cleanEmail}`);
    return apiSuccess(res, { user: safeUser, token }, "Account profile updated successfully in database");
  } catch (e) {
    console.error('[API:Profile] Error updating user profile:', e);
    return apiError(res, e.message, 500);
  }
});

// 4. Team Accounts Routes - Partner & Staff Management (Owner Only)
app.get('/api/users', authenticateToken, requireRole("owner"), async (req, res) => {
  try {
    const shopId = req.user.shopId;

    if (isMongoConnected) {
      const users = await User.find({
        shopId,
        role: { $in: ["partner", "staff"] }
      }).select("-password -otpHash -otpExpires -resetTokenHash -resetTokenExpires");

      return apiSuccess(res, users.map(u => ({
        id: u.userId || String(u._id),
        userId: u.userId || String(u._id),
        name: u.name || u.username,
        email: u.email,
        phone: u.phone || "",
        role: u.role,
        shopId: u.shopId,
        status: u.status,
        createdAt: u.createdAt
      })));
    } else {
      const store = loadLocalStore();
      const users = store.users
        .filter(u => u.shopId === shopId && (u.role === "partner" || u.role === "staff"))
        .map(({ password, otpHash, otpExpires, resetTokenHash, resetTokenExpires, ...rest }) => ({
          ...rest,
          id: rest.userId || rest.username,
          name: rest.name || rest.username
        }));
      return apiSuccess(res, users);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

app.post('/api/users', authenticateToken, requireRole("owner"), async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;
    const shopId = req.user.shopId;

    if (!email || !password || !role) {
      return apiError(res, "Email address, password, and account type are required", 400);
    }

    if (!["partner", "staff"].includes(role)) {
      return apiError(res, "Invalid account type. Allowed types: Partner, Staff", 400);
    }

    const cleanEmail = normalizeEmail(email);
    if (!isValidEmail(cleanEmail)) {
      return apiError(res, "Please provide a valid email address", 400);
    }

    if (password.length < 4) {
      return apiError(res, "Password must be at least 4 characters long", 400);
    }

    const cleanName = (name || cleanEmail.split('@')[0]).trim();
    const cleanPhone = (phone || "").trim();
    const hashedPassword = hashPassword(password);
    const userId = "user_" + Date.now();

    if (isMongoConnected) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        return apiError(res, "An account with this email address already exists", 400);
      }

      let user;
      try {
        user = await User.create({
          userId,
          name: cleanName,
          email: cleanEmail,
          username: cleanEmail.split('@')[0],
          phone: cleanPhone,
          password: hashedPassword,
          role,
          shopId,
          status: "active"
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          return apiError(res, "An account with this email address already exists", 400);
        }
        throw createErr;
      }

      return apiSuccess(res, {
        id: user.userId,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        shopId: user.shopId,
        status: user.status
      }, `${role === 'partner' ? 'Partner' : 'Staff'} account created successfully`);
    } else {
      const store = loadLocalStore();
      if (store.users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
        return apiError(res, "An account with this email address already exists", 400);
      }

      const newUser = {
        id: userId,
        userId,
        name: cleanName,
        email: cleanEmail,
        username: cleanEmail.split('@')[0],
        phone: cleanPhone,
        password: hashedPassword,
        role,
        shopId,
        status: "active"
      };
      store.users.push(newUser);
      saveLocalStore(store);

      return apiSuccess(res, {
        id: userId,
        userId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role,
        shopId,
        status: "active"
      }, `${role === 'partner' ? 'Partner' : 'Staff'} account created successfully`);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

app.delete('/api/users/:identifier', authenticateToken, requireRole("owner"), async (req, res) => {
  try {
    const { identifier } = req.params;
    const cleanId = (identifier || '').trim().toLowerCase();

    // Prevent deleting owner or oneself
    if (cleanId === req.user.email.toLowerCase() || cleanId === req.user.userId || cleanId === (req.user.username || '').toLowerCase()) {
      return apiError(res, "Cannot delete your own account", 400);
    }

    if (isMongoConnected) {
      const targetUser = await User.findOne({
        shopId: req.user.shopId,
        $or: [
          { userId: identifier },
          { email: cleanId },
          { username: cleanId }
        ]
      });

      if (!targetUser) {
        return apiError(res, "User account not found", 404);
      }

      if (targetUser.role === 'owner') {
        return apiError(res, "Cannot delete shop owner account", 400);
      }

      await User.deleteOne({ _id: targetUser._id });
      return apiSuccess(res, null, "Account removed successfully");
    } else {
      const store = loadLocalStore();
      const idx = store.users.findIndex(u => 
        u.shopId === req.user.shopId &&
        (u.userId === identifier || (u.email && u.email.toLowerCase() === cleanId) || (u.username && u.username.toLowerCase() === cleanId))
      );

      if (idx === -1) {
        return apiError(res, "User account not found", 404);
      }

      if (store.users[idx].role === 'owner') {
        return apiError(res, "Cannot delete shop owner account", 400);
      }

      store.users.splice(idx, 1);
      saveLocalStore(store);
      return apiSuccess(res, null, "Account removed successfully");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// ================= 5. PRODUCT MASTER CATALOG ENDPOINTS =================

// GET /api/products
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shopId;

    if (isMongoConnected) {
      const products = await Product.find({ shopId }).sort({ name: 1 });
      return apiSuccess(res, products.map(p => ({
        id: p.productId,
        productId: p.productId,
        name: p.name,
        category: p.category,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })));
    } else {
      const store = loadLocalStore();
      const products = (store.products || []).filter(p => p.shopId === shopId);
      return apiSuccess(res, products);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// POST /api/products (Add Master Product - Owner & Partner Only)
app.post('/api/products', authenticateToken, requireRole("owner", "partner"), async (req, res) => {
  try {
    const { name, category } = req.body;
    const shopId = req.user.shopId;

    if (!name || !name.trim()) {
      return apiError(res, "Product Name is required", 400);
    }
    if (!category || !category.trim()) {
      return apiError(res, "Category is required", 400);
    }

    const cleanName = name.trim();
    const cleanCategory = category.trim();

    if (isMongoConnected) {
      // Check for duplicate product name in same shop (case-insensitive)
      const existing = await Product.findOne({
        shopId,
        name: { $regex: new RegExp(`^${cleanName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
      });
      if (existing) {
        return apiError(res, `Product "${cleanName}" already exists in master catalog`, 400);
      }

      const productId = "prod_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const product = await Product.create({
        productId,
        shopId,
        name: cleanName,
        category: cleanCategory,
        createdBy: req.user.username
      });

      // Log activity
      await Activity.create({
        activityId: "act_" + Date.now(),
        shopId,
        type: "product_add",
        productId: product.productId,
        itemName: product.name,
        category: product.category,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date(),
        notes: `Created master product "${product.name}" (${product.category})`
      });

      return apiSuccess(res, {
        id: product.productId,
        productId: product.productId,
        name: product.name,
        category: product.category,
        createdBy: product.createdBy,
        createdAt: product.createdAt
      }, `Product "${product.name}" added to master list!`);
    } else {
      const store = loadLocalStore();
      if (!store.products) store.products = [];

      const existing = store.products.find(p => p.shopId === shopId && p.name.toLowerCase() === cleanName.toLowerCase());
      if (existing) {
        return apiError(res, `Product "${cleanName}" already exists in master catalog`, 400);
      }

      const productId = "prod_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
      const product = {
        id: productId,
        productId,
        shopId,
        name: cleanName,
        category: cleanCategory,
        createdBy: req.user.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      store.products.push(product);

      store.activities.unshift({
        id: "act_" + Date.now(),
        activityId: "act_" + Date.now(),
        shopId,
        type: "product_add",
        productId,
        itemName: cleanName,
        category: cleanCategory,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date().toISOString(),
        notes: `Created master product "${cleanName}" (${cleanCategory})`
      });

      saveLocalStore(store);
      return apiSuccess(res, product, `Product "${cleanName}" added to master list!`);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// ================= 6. STOCK CATALOG ENDPOINTS =================

// GET /api/stocks (Protected)
app.get('/api/stocks', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { search, category, colour, unit, status } = req.query;

    let items = [];

    if (isMongoConnected) {
      let query = { shopId };

      if (category && category !== "all") {
        query.category = category;
      }
      if (colour && colour !== "all") {
        query.colour = new RegExp(`^${colour}$`, 'i');
      }
      if (unit && unit !== "all") {
        query.unit = unit.toLowerCase();
      }

      items = await Stock.find(query).sort({ updatedAt: -1 });

      items = items.map(doc => ({
        id: doc.stockId,
        stockId: doc.stockId,
        shopId: doc.shopId,
        productId: doc.productId || "",
        name: doc.name,
        category: doc.category,
        colour: doc.colour,
        customColour: doc.customColour || "",
        quantity: doc.quantity,
        unit: doc.unit,
        price: doc.price,
        brandName: doc.brandName || "",
        buyDate: doc.buyDate,
        transactionType: doc.transactionType || "",
        billNo: doc.billNo || "",
        challanNo: doc.challanNo || "",
        location: doc.location,
        ragNumber: doc.ragNumber,
        minStock: doc.minStock,
        lowStockAlertEnabled: doc.lowStockAlertEnabled ?? false,
        lowStockThreshold: doc.lowStockThreshold ?? (doc.minStock || 5),
        createdBy: doc.createdBy,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }));
    } else {
      const store = loadLocalStore();
      items = store.stocks.filter(s => s.shopId === shopId).map(s => ({
        ...s,
        lowStockAlertEnabled: s.lowStockAlertEnabled ?? false,
        lowStockThreshold: s.lowStockThreshold ?? (s.minStock || 5)
      }));
    }

    // Search filter (Name, Category, Colour, BrandName)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.colour && item.colour.toLowerCase().includes(q)) ||
        (item.brandName && item.brandName.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (status && status !== "all") {
      if (status === "in-stock") items = items.filter(i => i.quantity > i.minStock);
      else if (status === "low-stock") items = items.filter(i => i.quantity > 0 && i.quantity <= i.minStock);
      else if (status === "out-of-stock") items = items.filter(i => i.quantity === 0);
    }

    // Fallback filters
    if (!isMongoConnected) {
      if (category && category !== "all") items = items.filter(i => i.category === category);
      if (colour && colour !== "all") items = items.filter(i => i.colour && i.colour.toLowerCase() === colour.toLowerCase());
      if (unit && unit !== "all") items = items.filter(i => i.unit && i.unit.toLowerCase() === unit.toLowerCase());
    }

    return apiSuccess(res, items);
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// GET /api/stocks/:id
app.get('/api/stocks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user.shopId;

    if (isMongoConnected) {
      const doc = await Stock.findOne({ stockId: id, shopId });
      if (!doc) return apiError(res, "Stock item not found", 404);
      return apiSuccess(res, { ...doc.toObject(), id: doc.stockId });
    } else {
      const store = loadLocalStore();
      const item = store.stocks.find(s => (s.id === id || s.stockId === id) && s.shopId === shopId);
      if (!item) return apiError(res, "Stock item not found", 404);
      return apiSuccess(res, item);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// POST /api/stocks (Add Stock - Owner & Partner Only, returns 403 Forbidden for Staff!)
app.post('/api/stocks', authenticateToken, requireRole("owner", "partner"), async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { 
      productId, 
      colour, 
      customColour, 
      quantity, 
      unit, 
      price, 
      brandName, 
      buyDate, 
      transactionType, 
      billNo, 
      challanNo, 
      location, 
      ragNumber, 
      minStock, 
      notes 
    } = req.body;

    if (!productId) {
      return apiError(res, "Product selection is required", 400);
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return apiError(res, "Quantity must be a positive number greater than 0", 400);
    }

    const cleanUnit = (unit || "piece").toLowerCase();
    if (!ALLOWED_UNITS.includes(cleanUnit)) {
      return apiError(res, `Invalid unit. Allowed units: ${ALLOWED_UNITS.join(", ")}`, 400);
    }

    // Validate Price
    let parsedPrice = null;
    if (price !== undefined && price !== null && price !== "") {
      parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return apiError(res, "Price must be a valid non-negative number", 400);
      }
    }

    // Validate Transaction Type & Numbers
    const cleanTxType = (transactionType || "").toLowerCase();
    if (!ALLOWED_TRANSACTION_TYPES.includes(cleanTxType)) {
      return apiError(res, `Invalid transaction type. Allowed: Bill, Challan, Cash`, 400);
    }

    let finalBillNo = "";
    let finalChallanNo = "";

    if (cleanTxType === "bill") {
      finalBillNo = billNo ? billNo.trim() : "";
    } else if (cleanTxType === "challan") {
      finalChallanNo = challanNo ? challanNo.trim() : "";
    }

    // Handle Colour & Custom Colour
    let selectedColour = colour && colour.trim() ? colour.trim() : "N/A";
    let finalCustomColour = "";
    if (selectedColour.toLowerCase() === "other") {
      if (customColour && customColour.trim()) {
        finalCustomColour = customColour.trim();
        selectedColour = finalCustomColour; // Store resolved custom colour name
      } else {
        selectedColour = "Other";
      }
    }

    // Parse Buy Date
    let parsedBuyDate = null;
    if (buyDate) {
      if (isFutureDate(buyDate)) {
        return apiError(res, "Buy Date cannot be in the future", 400);
      }
      const d = new Date(buyDate);
      if (!isNaN(d.getTime())) {
        parsedBuyDate = d;
      }
    }

    const cleanBrand = brandName ? brandName.trim() : "";
    const cleanLocation = location || "Shop";
    const cleanRag = ragNumber ? ragNumber.trim() : "";
    const cleanMinStock = minStock !== undefined ? parseInt(minStock, 10) : 5;
    const cleanLowStockAlert = req.body.lowStockAlertEnabled === true || req.body.lowStockAlertEnabled === "true";
    const cleanLowStockThreshold = req.body.lowStockThreshold !== undefined ? parseInt(req.body.lowStockThreshold, 10) : cleanMinStock;

    let productObj = null;

    if (isMongoConnected) {
      // Fetch Product master record
      productObj = await Product.findOne({ productId, shopId });
      if (!productObj) {
        return apiError(res, "Selected product does not exist in master catalog", 404);
      }

      const productName = productObj.name;
      const productCategory = productObj.category;

      // Check if stock with same productId, colour, brand exists
      let stockItem = await Stock.findOne({
        shopId,
        productId,
        colour: selectedColour,
        brandName: cleanBrand
      });

      let isNewStockRecord = false;

      if (stockItem) {
        // Restock
        stockItem.quantity += qty;
        stockItem.location = cleanLocation;
        if (cleanRag) stockItem.ragNumber = cleanRag;
        stockItem.unit = cleanUnit;
        if (parsedPrice !== null) stockItem.price = parsedPrice;
        if (parsedBuyDate) stockItem.buyDate = parsedBuyDate;
        if (cleanTxType) stockItem.transactionType = cleanTxType;
        if (finalBillNo) stockItem.billNo = finalBillNo;
        if (finalChallanNo) stockItem.challanNo = finalChallanNo;
        stockItem.lowStockAlertEnabled = cleanLowStockAlert;
        stockItem.lowStockThreshold = cleanLowStockThreshold;
        await stockItem.save();
      } else {
        // Create new Stock record
        isNewStockRecord = true;
        const stockId = "p" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);
        stockItem = await Stock.create({
          stockId,
          shopId,
          productId,
          name: productName,
          category: productCategory,
          colour: selectedColour,
          customColour: finalCustomColour,
          quantity: qty,
          unit: cleanUnit,
          price: parsedPrice,
          brandName: cleanBrand,
          buyDate: parsedBuyDate,
          transactionType: cleanTxType,
          billNo: finalBillNo,
          challanNo: finalChallanNo,
          location: cleanLocation,
          ragNumber: cleanRag,
          minStock: cleanMinStock,
          lowStockAlertEnabled: cleanLowStockAlert,
          lowStockThreshold: cleanLowStockThreshold,
          createdBy: req.user.username
        });
      }

      // Record Activity Log
      const activityId = "act_" + Date.now();
      let activityNotes = notes && notes.trim() ? notes.trim() : (isNewStockRecord ? "Added stock to catalog" : "Restocked item");

      await Activity.create({
        activityId,
        shopId,
        type: "add",
        productId,
        itemId: stockItem.stockId,
        itemName: stockItem.name,
        category: stockItem.category,
        colour: stockItem.colour,
        customColour: stockItem.customColour,
        quantity: qty,
        unit: stockItem.unit,
        price: parsedPrice,
        brandName: cleanBrand,
        buyDate: parsedBuyDate,
        transactionType: cleanTxType,
        billNo: finalBillNo,
        challanNo: finalChallanNo,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date(),
        notes: activityNotes,
        location: cleanLocation,
        ragNumber: cleanRag
      });

      return apiSuccess(res, { ...stockItem.toObject(), id: stockItem.stockId }, `Successfully added ${qty} ${cleanUnit.toUpperCase()} of "${productName}".`);

    } else {
      // Local Storage Fallback
      const store = loadLocalStore();
      productObj = (store.products || []).find(p => p.productId === productId && p.shopId === shopId);
      if (!productObj) {
        return apiError(res, "Selected product does not exist in master catalog", 404);
      }

      const productName = productObj.name;
      const productCategory = productObj.category;

      let stockItem = store.stocks.find(s => s.shopId === shopId && s.productId === productId && s.colour === selectedColour && (s.brandName || "") === cleanBrand);

      if (stockItem) {
        stockItem.quantity += qty;
        stockItem.location = cleanLocation;
        if (cleanRag) stockItem.ragNumber = cleanRag;
        stockItem.unit = cleanUnit;
        if (parsedPrice !== null) stockItem.price = parsedPrice;
        if (parsedBuyDate) stockItem.buyDate = parsedBuyDate.toISOString();
        if (cleanTxType) stockItem.transactionType = cleanTxType;
        if (finalBillNo) stockItem.billNo = finalBillNo;
        if (finalChallanNo) stockItem.challanNo = finalChallanNo;
        stockItem.lowStockAlertEnabled = cleanLowStockAlert;
        stockItem.lowStockThreshold = cleanLowStockThreshold;
      } else {
        const stockId = "p" + Date.now();
        stockItem = {
          id: stockId,
          stockId,
          shopId,
          productId,
          name: productName,
          category: productCategory,
          colour: selectedColour,
          customColour: finalCustomColour,
          quantity: qty,
          unit: cleanUnit,
          price: parsedPrice,
          brandName: cleanBrand,
          buyDate: parsedBuyDate ? parsedBuyDate.toISOString() : null,
          transactionType: cleanTxType,
          billNo: finalBillNo,
          challanNo: finalChallanNo,
          location: cleanLocation,
          ragNumber: cleanRag,
          minStock: cleanMinStock,
          lowStockAlertEnabled: cleanLowStockAlert,
          lowStockThreshold: cleanLowStockThreshold,
          createdBy: req.user.username,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        store.stocks.push(stockItem);
      }

      // Log Activity
      store.activities.unshift({
        id: "act_" + Date.now(),
        activityId: "act_" + Date.now(),
        shopId,
        type: "add",
        productId,
        itemId: stockItem.id,
        itemName: productName,
        category: productCategory,
        colour: selectedColour,
        customColour: finalCustomColour,
        quantity: qty,
        unit: cleanUnit,
        price: parsedPrice,
        brandName: cleanBrand,
        buyDate: parsedBuyDate ? parsedBuyDate.toISOString() : null,
        transactionType: cleanTxType,
        billNo: finalBillNo,
        challanNo: finalChallanNo,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date().toISOString(),
        notes: notes || "Added stock to catalog",
        location: cleanLocation,
        ragNumber: cleanRag
      });

      saveLocalStore(store);
      return apiSuccess(res, stockItem, `Successfully added ${qty} ${cleanUnit.toUpperCase()} of "${productName}".`);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// PUT /api/stocks/:id (Update Stock - Owner & Partner Only)
app.put('/api/stocks/:id', authenticateToken, requireRole("owner", "partner"), async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user.shopId;
    const { quantity, unit, price, brandName, colour, location, ragNumber, minStock, lowStockAlertEnabled, lowStockThreshold } = req.body;

    if (isMongoConnected) {
      const stock = await Stock.findOne({ stockId: id, shopId });
      if (!stock) return apiError(res, "Stock item not found", 404);

      if (quantity !== undefined) {
        const q = parseInt(quantity, 10);
        if (isNaN(q)) return apiError(res, "Invalid quantity", 400);
        stock.quantity = q;
      }
      if (unit) {
        const u = unit.toLowerCase();
        if (!ALLOWED_UNITS.includes(u)) return apiError(res, "Invalid unit", 400);
        stock.unit = u;
      }
      if (price !== undefined && price !== null) {
        const p = parseFloat(price);
        if (isNaN(p) || p < 0) return apiError(res, "Invalid price", 400);
        stock.price = p;
      }
      if (brandName !== undefined) stock.brandName = brandName.trim();
      if (colour) stock.colour = colour.trim();
      if (location) stock.location = location;
      if (ragNumber !== undefined) stock.ragNumber = ragNumber;
      if (minStock !== undefined) stock.minStock = parseInt(minStock, 10);
      if (lowStockAlertEnabled !== undefined) stock.lowStockAlertEnabled = lowStockAlertEnabled === true || lowStockAlertEnabled === "true";
      if (lowStockThreshold !== undefined) stock.lowStockThreshold = parseInt(lowStockThreshold, 10);

      await stock.save();
      return apiSuccess(res, { ...stock.toObject(), id: stock.stockId }, "Stock updated successfully");
    } else {
      const store = loadLocalStore();
      const idx = store.stocks.findIndex(s => (s.id === id || s.stockId === id) && s.shopId === shopId);
      if (idx === -1) return apiError(res, "Stock item not found", 404);

      const s = store.stocks[idx];
      if (quantity !== undefined) s.quantity = parseInt(quantity, 10);
      if (unit) s.unit = unit.toLowerCase();
      if (price !== undefined) s.price = parseFloat(price);
      if (brandName !== undefined) s.brandName = brandName;
      if (colour) s.colour = colour;
      if (location) s.location = location;
      if (ragNumber !== undefined) s.ragNumber = ragNumber;
      if (minStock !== undefined) s.minStock = parseInt(minStock, 10);
      if (lowStockAlertEnabled !== undefined) s.lowStockAlertEnabled = lowStockAlertEnabled === true || lowStockAlertEnabled === "true";
      if (lowStockThreshold !== undefined) s.lowStockThreshold = parseInt(lowStockThreshold, 10);
      s.updatedAt = new Date().toISOString();
      s.updatedAt = new Date().toISOString();

      saveLocalStore(store);
      return apiSuccess(res, s, "Stock updated successfully");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// DELETE /api/stocks/:id (Owner & Partner Only)
app.delete('/api/stocks/:id', authenticateToken, requireRole("owner", "partner"), async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user.shopId;

    if (isMongoConnected) {
      const stock = await Stock.findOneAndDelete({ stockId: id, shopId });
      if (!stock) return apiError(res, "Stock item not found", 404);

      // Log activity
      await Activity.create({
        activityId: "act_" + Date.now(),
        shopId,
        type: "delete",
        productId: stock.productId,
        itemId: stock.stockId,
        itemName: stock.name,
        category: stock.category,
        colour: stock.colour,
        quantity: stock.quantity,
        unit: stock.unit,
        price: stock.price,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date(),
        notes: `Deleted catalog product "${stock.name}"`
      });

      return apiSuccess(res, null, `Product "${stock.name}" deleted`);
    } else {
      const store = loadLocalStore();
      const idx = store.stocks.findIndex(s => (s.id === id || s.stockId === id) && s.shopId === shopId);
      if (idx === -1) return apiError(res, "Stock item not found", 404);

      const item = store.stocks[idx];
      store.stocks.splice(idx, 1);

      store.activities.unshift({
        id: "act_" + Date.now(),
        activityId: "act_" + Date.now(),
        shopId,
        type: "delete",
        productId: item.productId,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        colour: item.colour,
        quantity: item.quantity,
        unit: item.unit,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date().toISOString(),
        notes: `Deleted catalog product "${item.name}"`
      });

      saveLocalStore(store);
      return apiSuccess(res, null, `Product "${item.name}" deleted`);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// POST /api/stocks/:id/sell (Sell Stock Action - Owner or Staff)
// Implements Atomic Update & Consistency against Race Conditions (Req 25)
app.post('/api/stocks/:id/sell', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user.shopId;
    const { 
      quantity, 
      price, 
      brandName, 
      saleDate, 
      transactionType, 
      billNo, 
      challanNo, 
      notes 
    } = req.body;

    const sellQty = parseInt(quantity, 10);
    if (isNaN(sellQty) || sellQty <= 0) {
      return apiError(res, "Selling quantity must be greater than 0", 400);
    }

    let parsedPrice = null;
    if (price !== undefined && price !== null && price !== "") {
      parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return apiError(res, "Price must be a valid non-negative number", 400);
      }
    }

    const cleanTxType = (transactionType || "").toLowerCase();
    let finalBillNo = "";
    let finalChallanNo = "";
    if (cleanTxType === "bill") finalBillNo = billNo ? billNo.trim() : "";
    else if (cleanTxType === "challan") finalChallanNo = challanNo ? challanNo.trim() : "";

    let parsedSaleDate = new Date();
    if (saleDate) {
      if (isFutureDate(saleDate)) {
        return apiError(res, "Sale Date cannot be in the future", 400);
      }
      const d = new Date(saleDate);
      if (!isNaN(d.getTime())) parsedSaleDate = d;
    }

    if (isMongoConnected) {
      // Atomic Update: decrements quantity (allowing negative stock)
      const stock = await Stock.findOneAndUpdate(
        { stockId: id, shopId },
        { $inc: { quantity: -sellQty } },
        { new: true }
      );

      if (!stock) {
        return apiError(res, "Stock item not found", 404);
      }

      // Record Activity Log
      const activityNotes = notes && notes.trim() ? notes.trim() : "Counter sale";
      await Activity.create({
        activityId: "act_" + Date.now(),
        shopId,
        type: "sell",
        productId: stock.productId,
        itemId: stock.stockId,
        itemName: stock.name,
        category: stock.category,
        colour: stock.colour,
        customColour: stock.customColour,
        quantity: sellQty,
        unit: stock.unit,
        price: parsedPrice !== null ? parsedPrice : stock.price,
        brandName: brandName ? brandName.trim() : stock.brandName,
        saleDate: parsedSaleDate,
        transactionType: cleanTxType,
        billNo: finalBillNo,
        challanNo: finalChallanNo,
        user: req.user.username,
        role: req.user.role,
        timestamp: parsedSaleDate,
        notes: activityNotes,
        location: stock.location,
        ragNumber: stock.ragNumber
      });

      return apiSuccess(res, { ...stock.toObject(), id: stock.stockId }, `Sold ${sellQty} ${stock.unit} of "${stock.name}"`);
    } else {
      const store = loadLocalStore();
      const stock = store.stocks.find(s => (s.id === id || s.stockId === id) && s.shopId === shopId);
      if (!stock) return apiError(res, "Stock item not found", 404);

      stock.quantity -= sellQty;
      const activityNotes = notes && notes.trim() ? notes.trim() : "Counter sale";

      store.activities.unshift({
        id: "act_" + Date.now(),
        activityId: "act_" + Date.now(),
        shopId,
        type: "sell",
        productId: stock.productId,
        itemId: stock.id,
        itemName: stock.name,
        category: stock.category,
        colour: stock.colour,
        customColour: stock.customColour,
        quantity: sellQty,
        unit: stock.unit,
        price: parsedPrice !== null ? parsedPrice : stock.price,
        brandName: brandName ? brandName.trim() : stock.brandName,
        saleDate: parsedSaleDate.toISOString(),
        transactionType: cleanTxType,
        billNo: finalBillNo,
        challanNo: finalChallanNo,
        user: req.user.username,
        role: req.user.role,
        timestamp: parsedSaleDate.toISOString(),
        notes: activityNotes,
        location: stock.location,
        ragNumber: stock.ragNumber
      });

      saveLocalStore(store);
      return apiSuccess(res, stock, `Sold ${sellQty} ${stock.unit} of "${stock.name}"`);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// POST /api/stocks/:id/defective (Report Defective Stock Action)
app.post('/api/stocks/:id/defective', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const shopId = req.user.shopId;
    const { quantity, notes } = req.body;

    const defQty = parseInt(quantity, 10);
    if (isNaN(defQty) || defQty <= 0) {
      return apiError(res, "Defective quantity must be greater than 0", 400);
    }

    if (isMongoConnected) {
      const stock = await Stock.findOneAndUpdate(
        { stockId: id, shopId, quantity: { $gte: defQty } },
        { $inc: { quantity: -defQty } },
        { new: true }
      );

      if (!stock) {
        const checkStock = await Stock.findOne({ stockId: id, shopId });
        if (!checkStock) return apiError(res, "Stock item not found", 404);
        return apiError(res, `Defective quantity cannot exceed available stock (${checkStock.quantity} ${checkStock.unit.toUpperCase()})`, 400);
      }

      const activityNotes = notes && notes.trim() ? notes.trim() : "Reported defective/damaged stock";
      await Activity.create({
        activityId: "act_" + Date.now(),
        shopId,
        type: "damage",
        productId: stock.productId,
        itemId: stock.stockId,
        itemName: stock.name,
        category: stock.category,
        colour: stock.colour,
        quantity: defQty,
        unit: stock.unit,
        price: stock.price,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date(),
        notes: activityNotes,
        location: stock.location,
        ragNumber: stock.ragNumber
      });

      return apiSuccess(res, { ...stock.toObject(), id: stock.stockId }, `Logged ${defQty} defective ${stock.unit} for "${stock.name}"`);
    } else {
      const store = loadLocalStore();
      const stock = store.stocks.find(s => (s.id === id || s.stockId === id) && s.shopId === shopId);
      if (!stock) return apiError(res, "Stock item not found", 404);

      if (stock.quantity < defQty) {
        return apiError(res, `Defective quantity cannot exceed available stock (${stock.quantity} ${stock.unit})`, 400);
      }

      stock.quantity -= defQty;
      const activityNotes = notes && notes.trim() ? notes.trim() : "Reported defective/damaged stock";

      store.activities.unshift({
        id: "act_" + Date.now(),
        activityId: "act_" + Date.now(),
        shopId,
        type: "damage",
        productId: stock.productId,
        itemId: stock.id,
        itemName: stock.name,
        category: stock.category,
        colour: stock.colour,
        quantity: defQty,
        unit: stock.unit,
        price: stock.price,
        user: req.user.username,
        role: req.user.role,
        timestamp: new Date().toISOString(),
        notes: activityNotes,
        location: stock.location,
        ragNumber: stock.ragNumber
      });

      saveLocalStore(store);
      return apiSuccess(res, stock, `Logged ${defQty} defective ${stock.unit} for "${stock.name}"`);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// 7. Activity Log Endpoints (Protected)
app.get('/api/activities', authenticateToken, async (req, res) => {
  try {
    const shopId = req.user.shopId;
    const { period, date, startDate, endDate, search, type, sort = "desc" } = req.query;

    let query = { shopId };

    if (type && type !== "all") {
      query.type = type;
    }

    let dateFilterStart = null;
    let dateFilterEnd = null;

    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      dateFilterStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      dateFilterEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else if (period && period !== "all") {
      const now = new Date();
      if (period === "day") {
        dateFilterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        dateFilterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (period === "week") {
        dateFilterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilterEnd = now;
      } else if (period === "month") {
        dateFilterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        dateFilterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period === "year") {
        dateFilterStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        dateFilterEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
    } else if (startDate && endDate) {
      dateFilterStart = new Date(startDate);
      dateFilterEnd = new Date(endDate);
    }

    let activities = [];

    if (isMongoConnected) {
      if (dateFilterStart && dateFilterEnd) {
        query.timestamp = { $gte: dateFilterStart, $lte: dateFilterEnd };
      }

      const sortDir = sort === "asc" ? 1 : -1;
      activities = await Activity.find(query).sort({ timestamp: sortDir }).limit(500);

      activities = activities.map(doc => ({
        id: doc.activityId,
        activityId: doc.activityId,
        shopId: doc.shopId,
        type: doc.type,
        productId: doc.productId || "",
        itemId: doc.itemId,
        itemName: doc.itemName,
        category: doc.category || "",
        colour: doc.colour,
        customColour: doc.customColour || "",
        quantity: doc.quantity,
        unit: doc.unit,
        price: doc.price,
        brandName: doc.brandName || "",
        buyDate: doc.buyDate,
        saleDate: doc.saleDate,
        transactionType: doc.transactionType || "",
        billNo: doc.billNo || "",
        challanNo: doc.challanNo || "",
        user: doc.user,
        role: doc.role || "owner",
        timestamp: doc.timestamp,
        notes: doc.notes,
        location: doc.location,
        ragNumber: doc.ragNumber
      }));
    } else {
      const store = loadLocalStore();
      activities = store.activities.filter(a => a.shopId === shopId);

      if (type && type !== "all") {
        activities = activities.filter(a => a.type === type);
      }

      if (dateFilterStart && dateFilterEnd) {
        activities = activities.filter(a => {
          const t = new Date(a.timestamp).getTime();
          return t >= dateFilterStart.getTime() && t <= dateFilterEnd.getTime();
        });
      }

      activities.sort((a, b) => {
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        return sort === "asc" ? tA - tB : tB - tA;
      });
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      activities = activities.filter(a =>
        (a.itemName && a.itemName.toLowerCase().includes(q)) ||
        (a.colour && a.colour.toLowerCase().includes(q)) ||
        (a.user && a.user.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        (a.billNo && a.billNo.toLowerCase().includes(q)) ||
        (a.challanNo && a.challanNo.toLowerCase().includes(q)) ||
        (a.brandName && a.brandName.toLowerCase().includes(q))
      );
    }

    return apiSuccess(res, activities);
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// Client SPA routing fallback for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const distIndex = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  return res.sendFile(path.join(__dirname, '../index.html'));
});

// Export Express App for Vercel Serverless Function & Local server execution
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
