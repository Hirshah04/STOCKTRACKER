const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return apiError(res, "Access denied. Authentication token required.", 401);
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return apiError(res, "Invalid or expired token.", 401);
    }
    req.user = decoded; // { username, role, shopId }
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return apiError(res, "Forbidden: Staff accounts are not authorized to perform this action.", 403);
    }
    next();
  };
}

// Helper to sanitize user object (strip password)
function sanitizeUser(userDoc) {
  const u = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  delete u.password;
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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return apiError(res, "Username and password are required", 400);
    }
    const cleanUsername = username.trim().toLowerCase();

    let user = null;
    let shop = null;

    if (isMongoConnected) {
      user = await User.findOne({ username: cleanUsername });
      if (user && comparePassword(password, user.password)) {
        shop = await Shop.findOne({ shopId: user.shopId });
      } else {
        user = null;
      }
    } else {
      const store = loadLocalStore();
      const found = store.users.find(u => u.username.toLowerCase() === cleanUsername);
      if (found && comparePassword(password, found.password)) {
        user = found;
        shop = store.shops.find(s => s.id === user.shopId || s.shopId === user.shopId);
      }
    }

    if (!user) {
      return apiError(res, "Invalid username or password", 401);
    }

    // Generate JWT Token
    const tokenPayload = {
      username: user.username,
      role: user.role,
      shopId: user.shopId
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return apiSuccess(res, {
      token,
      user: { username: user.username, role: user.role, shopId: user.shopId },
      shop: shop ? { id: shop.shopId || shop.id, name: shop.name, phone: shop.phone, email: shop.email } : null
    }, "Login successful");
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { shopName, phone, email, ownerUsername, ownerPassword } = req.body;

    if (!shopName || !ownerUsername || !ownerPassword) {
      return apiError(res, "Shop name, owner username, and password are required", 400);
    }

    if (ownerPassword.length < 4) {
      return apiError(res, "Password must be at least 4 characters long", 400);
    }

    const cleanUsername = ownerUsername.trim().toLowerCase();
    const shopId = "shop_" + Date.now();
    const hashedPassword = hashPassword(ownerPassword);

    if (isMongoConnected) {
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser) {
        return apiError(res, "Username already registered", 400);
      }

      const shop = await Shop.create({
        shopId,
        name: shopName.trim(),
        phone: phone ? phone.trim() : "",
        email: email ? email.trim() : "",
        ownerUsername: cleanUsername
      });

      const user = await User.create({
        username: cleanUsername,
        password: hashedPassword,
        role: "owner",
        shopId
      });

      const token = jwt.sign({ username: user.username, role: user.role, shopId: user.shopId }, JWT_SECRET, { expiresIn: '7d' });

      return apiSuccess(res, {
        token,
        user: { username: user.username, role: user.role, shopId: user.shopId },
        shop: { id: shop.shopId, name: shop.name, phone: shop.phone, email: shop.email }
      }, "Shop & Owner account registered successfully");
    } else {
      const store = loadLocalStore();
      if (store.users.some(u => u.username.toLowerCase() === cleanUsername)) {
        return apiError(res, "Username already registered", 400);
      }

      const newShop = { id: shopId, shopId, name: shopName.trim(), phone: phone || "", email: email || "", ownerUsername: cleanUsername };
      const newUser = { username: cleanUsername, password: hashedPassword, role: "owner", shopId };

      store.shops.push(newShop);
      store.users.push(newUser);
      saveLocalStore(store);

      const token = jwt.sign({ username: cleanUsername, role: "owner", shopId }, JWT_SECRET, { expiresIn: '7d' });

      return apiSuccess(res, {
        token,
        user: { username: cleanUsername, role: "owner", shopId },
        shop: newShop
      }, "Shop registered in local storage fallback mode");
    }
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

app.put('/api/shops/:id', authenticateToken, requireRole("owner"), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.shopId !== id) {
      return apiError(res, "Unauthorized access to another shop", 403);
    }

    const { name, phone, email } = req.body;

    if (isMongoConnected) {
      const shop = await Shop.findOneAndUpdate(
        { shopId: id },
        { name: name ? name.trim() : "", phone: phone ? phone.trim() : "", email: email ? email.trim() : "" },
        { new: true }
      );
      if (!shop) return apiError(res, "Shop not found", 404);
      return apiSuccess(res, shop, "Shop updated successfully");
    } else {
      const store = loadLocalStore();
      const idx = store.shops.findIndex(s => s.id === id || s.shopId === id);
      if (idx === -1) return apiError(res, "Shop not found", 404);

      store.shops[idx].name = name ? name.trim() : store.shops[idx].name;
      store.shops[idx].phone = phone ? phone.trim() : store.shops[idx].phone;
      store.shops[idx].email = email ? email.trim() : store.shops[idx].email;
      saveLocalStore(store);

      return apiSuccess(res, store.shops[idx], "Shop updated successfully");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// 4. Staff Accounts Routes (Owner Only)
app.get('/api/users', authenticateToken, requireRole("owner"), async (req, res) => {
  try {
    const shopId = req.user.shopId;

    if (isMongoConnected) {
      const users = await User.find({ shopId, role: "staff" }).select("-password");
      return apiSuccess(res, users);
    } else {
      const store = loadLocalStore();
      const staff = store.users
        .filter(u => u.shopId === shopId && u.role === "staff")
        .map(({ password, ...rest }) => rest);
      return apiSuccess(res, staff);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

app.post('/api/users', authenticateToken, requireRole("owner"), async (req, res) => {
  try {
    const { username, password } = req.body;
    const shopId = req.user.shopId;

    if (!username || !password) {
      return apiError(res, "Username and password are required", 400);
    }
    if (password.length < 4) {
      return apiError(res, "Password must be at least 4 characters long", 400);
    }
    const cleanUsername = username.trim().toLowerCase();
    const hashedPassword = hashPassword(password);

    if (isMongoConnected) {
      const existing = await User.findOne({ username: cleanUsername });
      if (existing) return apiError(res, "Staff username already exists", 400);

      const user = await User.create({ username: cleanUsername, password: hashedPassword, role: "staff", shopId });
      return apiSuccess(res, { username: user.username, role: user.role, shopId: user.shopId }, "Staff account created");
    } else {
      const store = loadLocalStore();
      if (store.users.some(u => u.username.toLowerCase() === cleanUsername)) {
        return apiError(res, "Staff username already exists", 400);
      }
      const newUser = { username: cleanUsername, password: hashedPassword, role: "staff", shopId };
      store.users.push(newUser);
      saveLocalStore(store);
      return apiSuccess(res, { username: cleanUsername, role: "staff", shopId }, "Staff account created");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

app.delete('/api/users/:username', authenticateToken, requireRole("owner"), async (req, res) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername === "owner" || cleanUsername === req.user.username.toLowerCase()) {
      return apiError(res, "Cannot delete primary owner account", 400);
    }

    if (isMongoConnected) {
      await User.deleteOne({ username: cleanUsername, shopId: req.user.shopId });
      return apiSuccess(res, null, "Staff member deleted");
    } else {
      const store = loadLocalStore();
      store.users = store.users.filter(u => !(u.username.toLowerCase() === cleanUsername && u.shopId === req.user.shopId));
      saveLocalStore(store);
      return apiSuccess(res, null, "Staff member deleted");
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

// POST /api/products (Add Master Product - Owner Only)
app.post('/api/products', authenticateToken, requireRole("owner"), async (req, res) => {
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

// POST /api/stocks (Add Stock - Owner Only, returns 403 Forbidden for Staff!)
app.post('/api/stocks', authenticateToken, requireRole("owner"), async (req, res) => {
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

// PUT /api/stocks/:id (Update Stock - Owner Only)
app.put('/api/stocks/:id', authenticateToken, requireRole("owner"), async (req, res) => {
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

// DELETE /api/stocks/:id (Owner Only)
app.delete('/api/stocks/:id', authenticateToken, requireRole("owner"), async (req, res) => {
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
