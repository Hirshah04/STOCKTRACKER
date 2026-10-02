const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Models
const Stock = require('./models/Stock');
const Activity = require('./models/Activity');
const Shop = require('./models/Shop');
const User = require('./models/User');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static web app assets when running standalone server locally
app.use(express.static(path.join(__dirname, '../')));


// Database connection & Local Fallback Store
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;
let isMongoConnected = false;

const LOCAL_DB_PATH = path.join(__dirname, '../data_fallback.json');

function loadLocalStore() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading local db fallback:", e);
  }
  return { shops: [], users: [], stocks: [], activities: [] };
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
  if (isMongoConnected) return true;
  if (!MONGODB_URI || MONGODB_URI.includes('YOUR_MONGODB_URI')) {
    lastMongoError = "MONGODB_URI is not set in .env file";
    return false;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
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
    console.error(` Checklist:`);
    console.error(` 1. Check database password in .env file`);
    console.error(` 2. Check MongoDB Atlas -> Network Access -> Add IP (0.0.0.0/0)`);
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
      return apiError(res, "Username and password are required");
    }
    const cleanUsername = username.trim().toLowerCase();

    let user = null;
    let shop = null;

    if (isMongoConnected) {
      user = await User.findOne({ username: cleanUsername, password });
      if (user) {
        shop = await Shop.findOne({ shopId: user.shopId });
      }
    } else {
      const store = loadLocalStore();
      user = store.users.find(u => u.username.toLowerCase() === cleanUsername && u.password === password);
      if (user) {
        shop = store.shops.find(s => s.id === user.shopId || s.shopId === user.shopId);
      }
    }

    if (!user) {
      return apiError(res, "Invalid username or password", 401);
    }

    return apiSuccess(res, {
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
      return apiError(res, "Shop name, owner username, and password are required");
    }

    const cleanUsername = ownerUsername.trim().toLowerCase();
    const shopId = "shop_" + Date.now();

    if (isMongoConnected) {
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser) {
        return apiError(res, "Username already registered");
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
        password: ownerPassword,
        role: "owner",
        shopId
      });

      return apiSuccess(res, { shop, user }, "Shop & Owner account registered successfully");
    } else {
      const store = loadLocalStore();
      if (store.users.some(u => u.username.toLowerCase() === cleanUsername)) {
        return apiError(res, "Username already registered");
      }

      const newShop = { id: shopId, shopId, name: shopName.trim(), phone: phone || "", email: email || "", ownerUsername: cleanUsername };
      const newUser = { username: cleanUsername, password: ownerPassword, role: "owner", shopId };

      store.shops.push(newShop);
      store.users.push(newUser);
      saveLocalStore(store);

      return apiSuccess(res, { shop: newShop, user: newUser }, "Shop registered in local storage fallback mode");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// 3. Shop Routes
app.get('/api/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
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

app.put('/api/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    if (isMongoConnected) {
      const shop = await Shop.findOneAndUpdate(
        { shopId: id },
        { name, phone, email },
        { new: true }
      );
      if (!shop) return apiError(res, "Shop not found", 404);
      return apiSuccess(res, shop, "Shop updated successfully");
    } else {
      const store = loadLocalStore();
      const idx = store.shops.findIndex(s => s.id === id || s.shopId === id);
      if (idx === -1) return apiError(res, "Shop not found", 404);

      store.shops[idx].name = name || store.shops[idx].name;
      store.shops[idx].phone = phone || store.shops[idx].phone;
      store.shops[idx].email = email || store.shops[idx].email;
      saveLocalStore(store);

      return apiSuccess(res, store.shops[idx], "Shop updated successfully");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// 4. Staff Accounts Routes
app.get('/api/users', async (req, res) => {
  try {
    const { shopId } = req.query;
    if (!shopId) return apiError(res, "shopId query parameter is required");

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

app.post('/api/users', async (req, res) => {
  try {
    const { username, password, shopId } = req.body;
    if (!username || !password || !shopId) {
      return apiError(res, "Username, password, and shopId are required");
    }
    const cleanUsername = username.trim().toLowerCase();

    if (isMongoConnected) {
      const existing = await User.findOne({ username: cleanUsername });
      if (existing) return apiError(res, "Staff username already exists");

      const user = await User.create({ username: cleanUsername, password, role: "staff", shopId });
      return apiSuccess(res, { username: user.username, role: user.role, shopId: user.shopId }, "Staff account created");
    } else {
      const store = loadLocalStore();
      if (store.users.some(u => u.username.toLowerCase() === cleanUsername)) {
        return apiError(res, "Staff username already exists");
      }
      const newUser = { username: cleanUsername, password, role: "staff", shopId };
      store.users.push(newUser);
      saveLocalStore(store);
      return apiSuccess(res, { username: cleanUsername, role: "staff", shopId }, "Staff account created");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

app.delete('/api/users/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername === "owner") return apiError(res, "Cannot delete owner account");

    if (isMongoConnected) {
      await User.deleteOne({ username: cleanUsername });
      return apiSuccess(res, null, "Staff member deleted");
    } else {
      const store = loadLocalStore();
      store.users = store.users.filter(u => u.username.toLowerCase() !== cleanUsername);
      saveLocalStore(store);
      return apiSuccess(res, null, "Staff member deleted");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// 5. Stock Catalog Endpoints

// GET /api/stocks
app.get('/api/stocks', async (req, res) => {
  try {
    const { shopId, search, category, colour, unit, status } = req.query;
    if (!shopId) return apiError(res, "shopId query parameter is required");

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

      // Transform Mongoose docs to clean objects with id field
      items = items.map(doc => ({
        id: doc.stockId,
        stockId: doc.stockId,
        shopId: doc.shopId,
        name: doc.name,
        category: doc.category,
        colour: doc.colour,
        quantity: doc.quantity,
        unit: doc.unit,
        purchasePrice: doc.purchasePrice,
        sellingPrice: doc.sellingPrice,
        supplier: doc.supplier,
        description: doc.description,
        location: doc.location,
        ragNumber: doc.ragNumber,
        minStock: doc.minStock,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }));
    } else {
      const store = loadLocalStore();
      items = store.stocks.filter(s => s.shopId === shopId);
    }

    // Apply Client-Side / Fallback Multi-Field Search (Name, Colour, Category)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.colour && item.colour.toLowerCase().includes(q))
      );
    }

    // Apply Status Filter
    if (status && status !== "all") {
      if (status === "in-stock") items = items.filter(i => i.quantity > i.minStock);
      else if (status === "low-stock") items = items.filter(i => i.quantity > 0 && i.quantity <= i.minStock);
      else if (status === "out-of-stock") items = items.filter(i => i.quantity === 0);
    }

    // Apply Category/Colour/Unit Filters in Fallback Mode
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
app.get('/api/stocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      const doc = await Stock.findOne({ stockId: id });
      if (!doc) return apiError(res, "Stock item not found", 404);
      return apiSuccess(res, { ...doc.toObject(), id: doc.stockId });
    } else {
      const store = loadLocalStore();
      const item = store.stocks.find(s => s.id === id || s.stockId === id);
      if (!item) return apiError(res, "Stock item not found", 404);
      return apiSuccess(res, item);
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// POST /api/stocks (Add Stock)
app.post('/api/stocks', async (req, res) => {
  try {
    const { shopId, name, category, colour, quantity, unit, location, ragNumber, minStock, notes, user } = req.body;

    if (!shopId || !name || quantity === undefined) {
      return apiError(res, "shopId, name, and quantity are required");
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      return apiError(res, "Quantity must be a non-negative number");
    }

    const validUnits = ["kg", "litre", "piece", "meter"];
    const cleanUnit = (unit || "piece").toLowerCase();
    if (!validUnits.includes(cleanUnit)) {
      return apiError(res, `Invalid unit. Allowed values: ${validUnits.join(", ")}`);
    }

    const cleanColour = colour && colour.trim() ? colour.trim() : "N/A";
    const cleanCategory = category && category.trim() ? category.trim() : "General";
    const cleanLocation = location || "Shop";
    const cleanRag = ragNumber || "";
    const cleanMinStock = minStock !== undefined ? parseInt(minStock, 10) : 5;

    let stockItem = null;
    let isNewProduct = false;

    if (isMongoConnected) {
      // Check if stock with same name & shopId exists
      stockItem = await Stock.findOne({ shopId, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });

      if (stockItem) {
        // Restock existing product
        stockItem.quantity += qty;
        stockItem.location = cleanLocation;
        if (cleanRag) stockItem.ragNumber = cleanRag;
        if (cleanColour !== "N/A") stockItem.colour = cleanColour;
        if (unit) stockItem.unit = cleanUnit;
        await stockItem.save();
      } else {
        // Create new catalog item
        isNewProduct = true;
        const stockId = "p" + Date.now();
        stockItem = await Stock.create({
          stockId,
          shopId,
          name: name.trim(),
          category: cleanCategory,
          colour: cleanColour,
          quantity: qty,
          unit: cleanUnit,
          location: cleanLocation,
          ragNumber: cleanRag,
          minStock: cleanMinStock
        });
      }

      // Record Activity Log
      const activityId = "t" + Date.now();
      let activityNotes = notes || (isNewProduct ? "Created new product" : "Restocked item");
      activityNotes += ` | Loc: ${cleanLocation}${cleanRag ? `, Rag: ${cleanRag}` : ''}`;

      await Activity.create({
        activityId,
        shopId,
        type: "add",
        itemId: stockItem.stockId,
        itemName: stockItem.name,
        colour: stockItem.colour,
        quantity: qty,
        unit: stockItem.unit,
        user: user || "system",
        timestamp: new Date(),
        notes: activityNotes,
        location: cleanLocation,
        ragNumber: cleanRag
      });

      return apiSuccess(res, { ...stockItem.toObject(), id: stockItem.stockId }, isNewProduct ? "New product added to catalog" : "Stock quantity updated");

    } else {
      // Local Storage Fallback
      const store = loadLocalStore();
      const existingIdx = store.stocks.findIndex(s => s.shopId === shopId && s.name.toLowerCase() === name.trim().toLowerCase());

      if (existingIdx !== -1) {
        store.stocks[existingIdx].quantity += qty;
        store.stocks[existingIdx].location = cleanLocation;
        if (cleanRag) store.stocks[existingIdx].ragNumber = cleanRag;
        if (cleanColour !== "N/A") store.stocks[existingIdx].colour = cleanColour;
        store.stocks[existingIdx].unit = cleanUnit;
        stockItem = store.stocks[existingIdx];
      } else {
        isNewProduct = true;
        const stockId = "p" + Date.now();
        stockItem = {
          id: stockId,
          stockId,
          shopId,
          name: name.trim(),
          category: cleanCategory,
          colour: cleanColour,
          quantity: qty,
          unit: cleanUnit,
          location: cleanLocation,
          ragNumber: cleanRag,
          minStock: cleanMinStock,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        store.stocks.push(stockItem);
      }

      // Log Activity
      const activityId = "t" + Date.now();
      let activityNotes = notes || (isNewProduct ? "Created new product" : "Restocked item");
      activityNotes += ` | Loc: ${cleanLocation}${cleanRag ? `, Rag: ${cleanRag}` : ''}`;

      const newActivity = {
        id: activityId,
        activityId,
        shopId,
        type: "add",
        itemId: stockItem.id,
        itemName: stockItem.name,
        colour: stockItem.colour,
        quantity: qty,
        unit: stockItem.unit,
        user: user || "system",
        timestamp: new Date().toISOString(),
        notes: activityNotes,
        location: cleanLocation,
        ragNumber: cleanRag
      };
      store.activities.unshift(newActivity);

      saveLocalStore(store);
      return apiSuccess(res, stockItem, isNewProduct ? "New product added" : "Stock updated");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// PUT /api/stocks/:id (Update Stock Details)
app.put('/api/stocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, colour, quantity, unit, location, ragNumber, minStock } = req.body;

    if (isMongoConnected) {
      const stock = await Stock.findOne({ stockId: id });
      if (!stock) return apiError(res, "Stock item not found", 404);

      if (name) stock.name = name.trim();
      if (category) stock.category = category.trim();
      if (colour) stock.colour = colour.trim();
      if (quantity !== undefined) {
        const q = parseInt(quantity, 10);
        if (q < 0) return apiError(res, "Quantity cannot be negative");
        stock.quantity = q;
      }
      if (unit) stock.unit = unit.toLowerCase();
      if (location) stock.location = location;
      if (ragNumber !== undefined) stock.ragNumber = ragNumber;
      if (minStock !== undefined) stock.minStock = parseInt(minStock, 10);

      await stock.save();
      return apiSuccess(res, { ...stock.toObject(), id: stock.stockId }, "Stock updated successfully");
    } else {
      const store = loadLocalStore();
      const idx = store.stocks.findIndex(s => s.id === id || s.stockId === id);
      if (idx === -1) return apiError(res, "Stock item not found", 404);

      const s = store.stocks[idx];
      if (name) s.name = name.trim();
      if (category) s.category = category.trim();
      if (colour) s.colour = colour.trim();
      if (quantity !== undefined) s.quantity = Math.max(0, parseInt(quantity, 10));
      if (unit) s.unit = unit.toLowerCase();
      if (location) s.location = location;
      if (ragNumber !== undefined) s.ragNumber = ragNumber;
      if (minStock !== undefined) s.minStock = parseInt(minStock, 10);
      s.updatedAt = new Date().toISOString();

      saveLocalStore(store);
      return apiSuccess(res, s, "Stock updated successfully");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// DELETE /api/stocks/:id
app.delete('/api/stocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req.query;

    if (isMongoConnected) {
      const stock = await Stock.findOneAndDelete({ stockId: id });
      if (!stock) return apiError(res, "Stock item not found", 404);

      // Log activity
      await Activity.create({
        activityId: "t" + Date.now(),
        shopId: stock.shopId,
        type: "delete",
        itemId: stock.stockId,
        itemName: stock.name,
        colour: stock.colour,
        quantity: stock.quantity,
        unit: stock.unit,
        user: user || "system",
        timestamp: new Date(),
        notes: `Deleted catalog product "${stock.name}"`
      });

      return apiSuccess(res, null, `Product "${stock.name}" deleted`);
    } else {
      const store = loadLocalStore();
      const idx = store.stocks.findIndex(s => s.id === id || s.stockId === id);
      if (idx === -1) return apiError(res, "Stock item not found", 404);

      const item = store.stocks[idx];
      store.stocks.splice(idx, 1);

      store.activities.unshift({
        id: "t" + Date.now(),
        activityId: "t" + Date.now(),
        shopId: item.shopId,
        type: "delete",
        itemId: item.id,
        itemName: item.name,
        colour: item.colour,
        quantity: item.quantity,
        unit: item.unit,
        user: user || "system",
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

// POST /api/stocks/:id/sell (Sell Stock Action)
app.post('/api/stocks/:id/sell', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, notes, user } = req.body;

    const sellQty = parseInt(quantity, 10);
    if (isNaN(sellQty) || sellQty <= 0) {
      return apiError(res, "Selling quantity must be greater than 0");
    }

    if (isMongoConnected) {
      // Atomic reduction check
      const stock = await Stock.findOne({ stockId: id });
      if (!stock) return apiError(res, "Stock item not found", 404);

      if (stock.quantity < sellQty) {
        return apiError(res, `Insufficient stock quantity. Available: ${stock.quantity} ${stock.unit.toUpperCase()}`);
      }

      stock.quantity -= sellQty;
      await stock.save();

      // Activity log
      const activityNotes = (notes && notes.trim()) ? notes.trim() : "Counter sale";
      await Activity.create({
        activityId: "t" + Date.now(),
        shopId: stock.shopId,
        type: "sell",
        itemId: stock.stockId,
        itemName: stock.name,
        colour: stock.colour,
        quantity: sellQty,
        unit: stock.unit,
        user: user || "system",
        timestamp: new Date(),
        notes: `${activityNotes} | Loc: ${stock.location}`,
        location: stock.location,
        ragNumber: stock.ragNumber
      });

      return apiSuccess(res, { ...stock.toObject(), id: stock.stockId }, `Sold ${sellQty} ${stock.unit} of "${stock.name}"`);
    } else {
      const store = loadLocalStore();
      const stock = store.stocks.find(s => s.id === id || s.stockId === id);
      if (!stock) return apiError(res, "Stock item not found", 404);

      if (stock.quantity < sellQty) {
        return apiError(res, `Insufficient stock quantity. Available: ${stock.quantity} ${stock.unit}`);
      }

      stock.quantity -= sellQty;
      const activityNotes = (notes && notes.trim()) ? notes.trim() : "Counter sale";

      store.activities.unshift({
        id: "t" + Date.now(),
        activityId: "t" + Date.now(),
        shopId: stock.shopId,
        type: "sell",
        itemId: stock.id,
        itemName: stock.name,
        colour: stock.colour,
        quantity: sellQty,
        unit: stock.unit,
        user: user || "system",
        timestamp: new Date().toISOString(),
        notes: `${activityNotes} | Loc: ${stock.location}`,
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
app.post('/api/stocks/:id/defective', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, notes, user } = req.body;

    const defQty = parseInt(quantity, 10);
    if (isNaN(defQty) || defQty <= 0) {
      return apiError(res, "Defective quantity must be greater than 0");
    }

    if (isMongoConnected) {
      const stock = await Stock.findOne({ stockId: id });
      if (!stock) return apiError(res, "Stock item not found", 404);

      if (stock.quantity < defQty) {
        return apiError(res, `Defective quantity cannot exceed current available stock (${stock.quantity} ${stock.unit.toUpperCase()})`);
      }

      stock.quantity -= defQty;
      await stock.save();

      const activityNotes = (notes && notes.trim()) ? notes.trim() : "Reported defective/damaged stock";
      await Activity.create({
        activityId: "t" + Date.now(),
        shopId: stock.shopId,
        type: "damage",
        itemId: stock.stockId,
        itemName: stock.name,
        colour: stock.colour,
        quantity: defQty,
        unit: stock.unit,
        user: user || "system",
        timestamp: new Date(),
        notes: `${activityNotes} | Loc: ${stock.location}`,
        location: stock.location,
        ragNumber: stock.ragNumber
      });

      return apiSuccess(res, { ...stock.toObject(), id: stock.stockId }, `Logged ${defQty} defective ${stock.unit} for "${stock.name}"`);
    } else {
      const store = loadLocalStore();
      const stock = store.stocks.find(s => s.id === id || s.stockId === id);
      if (!stock) return apiError(res, "Stock item not found", 404);

      if (stock.quantity < defQty) {
        return apiError(res, `Defective quantity cannot exceed available stock (${stock.quantity} ${stock.unit})`);
      }

      stock.quantity -= defQty;
      const activityNotes = (notes && notes.trim()) ? notes.trim() : "Reported defective/damaged stock";

      store.activities.unshift({
        id: "t" + Date.now(),
        activityId: "t" + Date.now(),
        shopId: stock.shopId,
        type: "damage",
        itemId: stock.id,
        itemName: stock.name,
        colour: stock.colour,
        quantity: defQty,
        unit: stock.unit,
        user: user || "system",
        timestamp: new Date().toISOString(),
        notes: `${activityNotes} | Loc: ${stock.location}`,
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

// 6. Activity Log Endpoints

// GET /api/activities
app.get('/api/activities', async (req, res) => {
  try {
    const { shopId, period, date, startDate, endDate, search, type, sort = "desc" } = req.query;

    if (!shopId) return apiError(res, "shopId query parameter is required");

    let query = { shopId };

    // Apply Activity Type Filter
    if (type && type !== "all") {
      query.type = type;
    }

    // Determine Date Filter Range
    let dateFilterStart = null;
    let dateFilterEnd = null;

    if (date) {
      // Exact Date (YYYY-MM-DD): 00:00:00 to 23:59:59.999
      const [year, month, day] = date.split('-').map(Number);
      dateFilterStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      dateFilterEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else if (period && period !== "all") {
      const now = new Date();
      if (period === "day") {
        dateFilterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        dateFilterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (period === "week") {
        // Past 7 Days
        dateFilterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilterEnd = now;
      } else if (period === "month") {
        // Current Month
        dateFilterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        dateFilterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period === "year") {
        // Current Year
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
        itemId: doc.itemId,
        itemName: doc.itemName,
        colour: doc.colour,
        quantity: doc.quantity,
        unit: doc.unit,
        user: doc.user,
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

      // Sort
      activities.sort((a, b) => {
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        return sort === "asc" ? tA - tB : tB - tA;
      });
    }

    // Apply Search Filter (Stock Name, Colour, User, Notes)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      activities = activities.filter(a =>
        (a.itemName && a.itemName.toLowerCase().includes(q)) ||
        (a.colour && a.colour.toLowerCase().includes(q)) ||
        (a.user && a.user.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q))
      );
    }

    return apiSuccess(res, activities);
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// 7. Migration Endpoint (localStorage -> Database)
app.post('/api/migrate', async (req, res) => {
  try {
    const { shops = [], users = [], inventory = [], transactions = [], shopId } = req.body;

    let migratedCounts = { shops: 0, users: 0, stocks: 0, activities: 0 };

    if (isMongoConnected) {
      // Migrate Shops
      for (const s of shops) {
        const sId = s.id || s.shopId;
        if (!sId) continue;
        await Shop.findOneAndUpdate(
          { shopId: sId },
          { shopId: sId, name: s.name, phone: s.phone || "", email: s.email || "", ownerUsername: s.ownerUsername },
          { upsert: true }
        );
        migratedCounts.shops++;
      }

      // Migrate Users
      for (const u of users) {
        if (!u.username) continue;
        await User.findOneAndUpdate(
          { username: u.username.toLowerCase() },
          { username: u.username.toLowerCase(), password: u.password, role: u.role, shopId: u.shopId },
          { upsert: true }
        );
        migratedCounts.users++;
      }

      // Migrate Inventory
      for (const item of inventory) {
        const sId = item.id || item.stockId || ("p" + Date.now() + Math.random().toString(36).substr(2, 4));
        const targetShop = item.shopId || shopId;
        if (!targetShop || !item.name) continue;

        await Stock.findOneAndUpdate(
          { stockId: sId },
          {
            stockId: sId,
            shopId: targetShop,
            name: item.name,
            category: item.category || "General",
            colour: item.colour || "N/A",
            quantity: item.quantity || 0,
            unit: (item.unit || "piece").toLowerCase(),
            location: item.location || "Shop",
            ragNumber: item.ragNumber || "",
            minStock: item.minStock || 5
          },
          { upsert: true }
        );
        migratedCounts.stocks++;
      }

      // Migrate Transactions
      for (const tx of transactions) {
        const txId = tx.id || tx.activityId || ("t" + Date.now() + Math.random().toString(36).substr(2, 4));
        const targetShop = tx.shopId || shopId;
        if (!targetShop || !tx.itemName) continue;

        await Activity.findOneAndUpdate(
          { activityId: txId },
          {
            activityId: txId,
            shopId: targetShop,
            type: tx.type || "add",
            itemId: tx.itemId || "",
            itemName: tx.itemName,
            colour: tx.colour || "N/A",
            quantity: tx.quantity || 0,
            unit: (tx.unit || "piece").toLowerCase(),
            user: tx.user || "system",
            timestamp: tx.timestamp ? new Date(tx.timestamp) : new Date(),
            notes: tx.notes || "",
            location: tx.location || "Shop",
            ragNumber: tx.ragNumber || ""
          },
          { upsert: true }
        );
        migratedCounts.activities++;
      }

      return apiSuccess(res, migratedCounts, `Successfully migrated ${migratedCounts.stocks} stock items & ${migratedCounts.activities} activity logs to MongoDB!`);
    } else {
      // Local fallback persistence
      const store = loadLocalStore();
      shops.forEach(s => {
        if (!store.shops.some(x => x.id === s.id)) store.shops.push(s);
      });
      users.forEach(u => {
        if (!store.users.some(x => x.username === u.username)) store.users.push(u);
      });
      inventory.forEach(inv => {
        if (!store.stocks.some(x => x.id === inv.id)) store.stocks.push(inv);
      });
      transactions.forEach(tx => {
        if (!store.activities.some(x => x.id === tx.id)) store.activities.unshift(tx);
      });
      saveLocalStore(store);

      return apiSuccess(res, { stocks: inventory.length, activities: transactions.length }, "Data saved in local database fallback!");
    }
  } catch (e) {
    return apiError(res, e.message, 500);
  }
});

// Export Express App for Vercel Serverless Function & Local server execution
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
