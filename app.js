// ================= STATE & DATA MODELS =================
let state = {
  currentUser: null,
  shopInfo: null, // Active shop: { id, name, phone, email, ownerUsername }
  users: [],      // Global users: { username, password, role, shopId }
  shops: [],      // Global shops: { id, name, phone, email, ownerUsername }
  inventory: [],  // Active shop's inventory
  transactions: [] // Active shop's transactions
};

// Note: DEFAULT_USERS and DEFAULT_INVENTORY are now loaded from users.js and inventory.js respectively.

const DEFAULT_TRANSACTIONS = []; // Start with empty transactions for new shops

let useFirebase = false;
let db = null;
let firebaseListeners = [];

function isFirebaseConfigured() {
  return window.FIREBASE_CONFIG && 
         window.FIREBASE_CONFIG.apiKey && 
         window.FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY" && 
         window.FIREBASE_CONFIG.apiKey.trim() !== "" &&
         window.FIREBASE_CONFIG.projectId !== "YOUR_PROJECT_ID" &&
         window.FIREBASE_CONFIG.projectId.trim() !== "";
}

// ================= INITIALIZATION =================
function init() {
  const savedSession = localStorage.getItem("stocktaker_session");
  const savedTheme = localStorage.getItem("stocktaker_theme") || "dark-theme";

  // Set theme
  document.body.className = savedTheme;
  updateThemeUI(savedTheme);

  // Initialize Connection status UI elements
  const dbDot = document.getElementById("db-dot");
  const dbStatusText = document.getElementById("db-status-text");

  if (isFirebaseConfigured()) {
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      db = firebase.database();
      useFirebase = true;
      
      if (dbDot) {
        dbDot.className = "db-dot connected";
        dbStatusText.textContent = "Cloud Sync Active";
      }

      // Establish global real-time listeners for users and shops
      db.ref("users").on("value", snapshot => {
        state.users = snapshot.val() || [];
        renderStaff();
      });

      db.ref("shops").on("value", snapshot => {
        state.shops = snapshot.val() || [];
        if (state.currentUser) {
          state.shopInfo = state.shops.find(s => s.id === state.currentUser.shopId);
          updateShopTextUI();
        }
      });
      
    } catch (e) {
      console.error("Firebase init failed, falling back to local storage:", e);
      fallbackToLocalStorage(dbDot, dbStatusText);
    }
  } else {
    fallbackToLocalStorage(dbDot, dbStatusText);
  }

  // Routing
  if (savedSession) {
    state.currentUser = JSON.parse(savedSession);
    
    if (useFirebase) {
      // Connect Firebase shop-specific listeners
      setupFirebaseShopListeners(state.currentUser.shopId);
    } else {
      // Load from local storage
      state.shopInfo = state.shops.find(s => s.id === state.currentUser.shopId);
      if (!state.shopInfo) {
        localStorage.removeItem("stocktaker_session");
        showAuthScreen();
        return;
      }
      const savedInventory = localStorage.getItem("stocktaker_inventory_" + state.currentUser.shopId);
      const savedTransactions = localStorage.getItem("stocktaker_transactions_" + state.currentUser.shopId);
      state.inventory = savedInventory ? JSON.parse(savedInventory) : [];
      state.transactions = savedTransactions ? JSON.parse(savedTransactions) : [];
      showAppLayout();
    }
  } else {
    // If not logged in, check if setup is needed
    // In Firebase mode, wait for the first value check
    setTimeout(() => {
      const hasOwner = state.users.some(u => u.role === "owner");
      if (state.shops.length === 0 || !hasOwner) {
        showShopSetupScreen();
      } else {
        showAuthScreen();
      }
    }, useFirebase ? 800 : 50); // Small delay to allow Firebase initial fetch
  }

  setupEventListeners();
}

function fallbackToLocalStorage(dbDot, dbStatusText) {
  useFirebase = false;
  if (dbDot) {
    dbDot.className = "db-dot local";
    dbStatusText.textContent = "Browser Storage (Local)";
  }
  const savedUsers = localStorage.getItem("stocktaker_users");
  const savedShops = localStorage.getItem("stocktaker_shops");
  state.users = savedUsers ? JSON.parse(savedUsers) : [];
  state.shops = savedShops ? JSON.parse(savedShops) : [];
}

function setupFirebaseShopListeners(shopId) {
  // Clear any existing active listeners to prevent multiple bindings
  clearFirebaseShopListeners();

  const invRef = db.ref("inventory/" + shopId);
  const txRef = db.ref("transactions/" + shopId);

  // Store refs to detach them on logout
  firebaseListeners.push({ ref: invRef, type: "value" });
  firebaseListeners.push({ ref: txRef, type: "value" });

  let firstFetchDone = false;

  invRef.on("value", snapshot => {
    state.inventory = snapshot.val() || [];
    renderInventory();
    renderDashboard();

    if (!firstFetchDone) {
      firstFetchDone = true;
      showToast(`Logged in successfully! (Cloud Mode)`, "success");
      showAppLayout();
    }
  });

  txRef.on("value", snapshot => {
    state.transactions = snapshot.val() || [];
    renderTransactions();
    renderDashboard();
  });

  // Ensure shop profile is loaded
  state.shopInfo = state.shops.find(s => s.id === shopId);
  updateShopTextUI();
}

function clearFirebaseShopListeners() {
  firebaseListeners.forEach(listener => {
    listener.ref.off(listener.type);
  });
  firebaseListeners = [];
}

function saveState(key) {
  const shopId = state.currentUser ? state.currentUser.shopId : null;

  if (useFirebase) {
    if (key === "users") {
      db.ref("users").set(state.users);
    }
    if (key === "shops") {
      db.ref("shops").set(state.shops);
    }
    if (key === "inventory" && shopId) {
      db.ref("inventory/" + shopId).set(state.inventory);
    }
    if (key === "transactions" && shopId) {
      db.ref("transactions/" + shopId).set(state.transactions);
    }
  } else {
    // LocalStorage fallback
    if (key === "users" || !key) {
      localStorage.setItem("stocktaker_users", JSON.stringify(state.users));
    }
    if (key === "shops" || !key) {
      localStorage.setItem("stocktaker_shops", JSON.stringify(state.shops));
    }
    if (key === "inventory" || !key) {
      if (shopId) {
        localStorage.setItem("stocktaker_inventory_" + shopId, JSON.stringify(state.inventory));
      }
    }
    if (key === "transactions" || !key) {
      if (shopId) {
        localStorage.setItem("stocktaker_transactions_" + shopId, JSON.stringify(state.transactions));
      }
    }
  }
}

// ================= DOM ELEMENTS =================
const dom = {
  authScreen: document.getElementById("auth-screen"),
  shopSetupScreen: document.getElementById("shop-setup-screen"),
  appLayout: document.getElementById("app-layout"),
  
  // Forms
  loginForm: document.getElementById("login-form"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  
  shopSetupForm: document.getElementById("shop-setup-form"),
  setupShopName: document.getElementById("setup-shop-name"),
  setupShopPhone: document.getElementById("setup-shop-phone"),
  setupShopEmail: document.getElementById("setup-shop-email"),
  
  shopEditForm: document.getElementById("shop-edit-form"),
  editShopName: document.getElementById("edit-shop-name"),
  editShopPhone: document.getElementById("edit-shop-phone"),
  editShopEmail: document.getElementById("edit-shop-email"),

  // Profile / Header
  sidebarShopName: document.getElementById("sidebar-shop-name"),
  sidebarShopEmail: document.getElementById("sidebar-shop-email"),
  mobileShopTitle: document.getElementById("mobile-shop-title"),
  userAvatar: document.getElementById("user-avatar"),
  userName: document.getElementById("user-name"),
  userBadge: document.getElementById("user-badge"),
  logoutBtn: document.getElementById("logout-btn"),
  themeToggle: document.getElementById("theme-toggle"),
  mobileThemeToggle: document.getElementById("mobile-theme-toggle"),
  mobileLogoutBtn: document.getElementById("mobile-logout-btn"),
  sidebar: document.querySelector(".sidebar"),
  
  // Tabs
  navLinks: document.querySelectorAll(".nav-link"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  
  // Dashboard
  welcomeName: document.getElementById("welcome-name"),
  dashboardShopSubtitle: document.getElementById("dashboard-shop-subtitle"),
  quickActionsBar: document.getElementById("quick-actions-bar"),
  statTotalItems: document.getElementById("stat-total-items"),
  statTotalQty: document.getElementById("stat-total-qty"),
  statTotalSales: document.getElementById("stat-total-sales"),
  statLowStock: document.getElementById("stat-low-stock"),
  lowStockCountBadge: document.getElementById("low-stock-count-badge"),
  lowStockList: document.getElementById("low-stock-list"),
  recentTransactionsList: document.getElementById("recent-transactions-list"),
  
  // Inventory Tab
  inventorySearch: document.getElementById("inventory-search"),
  filterCategory: document.getElementById("filter-category"),
  filterStatus: document.getElementById("filter-status"),
  inventoryTableBody: document.getElementById("inventory-table-body"),
  exportBtn: document.getElementById("export-btn"),
  
  // Transactions Tab
  transactionsSearch: document.getElementById("transactions-search"),
  filterTransactionType: document.getElementById("filter-transaction-type"),
  transactionsTableBody: document.getElementById("transactions-table-body"),
  clearLogsBtn: document.getElementById("clear-logs-btn"),
  
  // Staff Tab
  staffRegisterForm: document.getElementById("staff-register-form"),
  regUsername: document.getElementById("reg-username"),
  regPassword: document.getElementById("reg-password"),
  staffListBody: document.getElementById("staff-list-body"),
  
  // Modals & Backdrops
  modalBackdrop: document.getElementById("modal-backdrop"),
  
  // Add Stock Modal
  modalAddStock: document.getElementById("modal-add-stock"),
  formAddStock: document.getElementById("form-add-stock"),
  addStockName: document.getElementById("add-stock-name"),
  addStockQty: document.getElementById("add-stock-qty"),
  addStockNotes: document.getElementById("add-stock-notes"),
  newProductFields: document.getElementById("new-product-fields"),
  newProdCategory: document.getElementById("new-prod-category"),
  newProdMin: document.getElementById("new-prod-min"),
  productNamesDatalist: document.getElementById("product-names-datalist"),
  categorySuggestions: document.getElementById("category-suggestions"),
  
  // General Stock Action Modal (Sell, Damage, Remove)
  modalStockAction: document.getElementById("modal-stock-action"),
  formStockAction: document.getElementById("form-stock-action"),
  stockActionTitle: document.getElementById("stock-action-title"),
  actionItemId: document.getElementById("action-item-id"),
  actionType: document.getElementById("action-type"),
  actionProductName: document.getElementById("action-product-name"),
  actionCurrentQty: document.getElementById("action-current-qty"),
  actionQtyLabel: document.getElementById("action-qty-label"),
  actionQty: document.getElementById("action-qty"),
  actionQtyError: document.getElementById("action-qty-error"),
  actionNotesGroup: document.getElementById("action-notes-group"),
  actionNotes: document.getElementById("action-notes"),
  stockActionSubmitBtn: document.getElementById("stock-action-submit-btn")
};

// ================= ROUTING & SCREEN STATE =================
function showAuthScreen() {
  dom.authScreen.classList.remove("hidden");
  dom.shopSetupScreen.classList.add("hidden");
  dom.appLayout.classList.add("hidden");
  dom.loginForm.reset();
  state.currentUser = null;
  localStorage.removeItem("stocktaker_session");
}

function showShopSetupScreen() {
  dom.authScreen.classList.add("hidden");
  dom.shopSetupScreen.classList.remove("hidden");
  dom.appLayout.classList.add("hidden");
  dom.shopSetupForm.reset();
}

function showAppLayout() {
  dom.authScreen.classList.add("hidden");
  dom.shopSetupScreen.classList.add("hidden");
  dom.appLayout.classList.remove("hidden");

  updateShopTextUI();

  // Update Profile Info
  const user = state.currentUser;
  dom.userName.textContent = user.username.toUpperCase();
  dom.userAvatar.textContent = user.username.charAt(0).toUpperCase();
  dom.userBadge.textContent = user.role.toUpperCase();
  dom.userBadge.className = `badge-role ${user.role}-role`;

  applyRolePermissions(user.role);
  switchTab("dashboard");
  renderAll();
}

function updateShopTextUI() {
  const shopName = state.shopInfo ? state.shopInfo.name : "My Shop";
  const shopEmail = state.shopInfo ? state.shopInfo.email : "Not Registered";
  
  dom.sidebarShopName.textContent = shopName;
  dom.sidebarShopEmail.textContent = shopEmail;
  dom.mobileShopTitle.textContent = shopName;
  if (dom.dashboardShopSubtitle) {
    dom.dashboardShopSubtitle.textContent = state.shopInfo 
      ? `Inventory summary for ${state.shopInfo.name} (Contact: ${state.shopInfo.phone})`
      : "Inventory summary for your shop.";
  }
}

function applyRolePermissions(role) {
  const ownerElements = document.querySelectorAll(".owner-only");
  
  if (role === "owner") {
    ownerElements.forEach(el => el.classList.remove("hidden"));
    if (dom.clearLogsBtn) dom.clearLogsBtn.style.display = "inline-flex";
  } else {
    ownerElements.forEach(el => el.classList.add("hidden"));
    if (dom.clearLogsBtn) dom.clearLogsBtn.style.display = "none";
  }
}

// ================= CORE EVENT LISTENERS =================
function setupEventListeners() {
  // Login Form
  dom.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = dom.loginUsername.value.trim().toLowerCase();
    const password = dom.loginPassword.value;
    
    const user = state.users.find(u => u.username === username && u.password === password);
    
    if (user) {
      state.currentUser = { username: user.username, role: user.role, shopId: user.shopId };
      localStorage.setItem("stocktaker_session", JSON.stringify(state.currentUser));
      
      // Load active shop details
      state.shopInfo = state.shops.find(s => s.id === user.shopId);
      
      if (useFirebase) {
        setupFirebaseShopListeners(user.shopId);
      } else {
        // Load inventory and transactions locally
        const savedInventory = localStorage.getItem("stocktaker_inventory_" + user.shopId);
        const savedTransactions = localStorage.getItem("stocktaker_transactions_" + user.shopId);
        
        state.inventory = savedInventory ? JSON.parse(savedInventory) : [];
        state.transactions = savedTransactions ? JSON.parse(savedTransactions) : [];

        showToast(`Logged in successfully!`, "success");
        showAppLayout();
      }
    } else {
      showToast("Invalid username or password.", "danger");
    }
  });

  // Toggle between Login and Registration Screens
  const goToRegister = document.getElementById("go-to-register");
  const goToLogin = document.getElementById("go-to-login");

  if (goToRegister) {
    goToRegister.addEventListener("click", (e) => {
      e.preventDefault();
      showShopSetupScreen();
    });
  }
  if (goToLogin) {
    goToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      showAuthScreen();
    });
  }

  // Shop Setup Form (First Time Registration)
  dom.shopSetupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = dom.setupShopName.value.trim();
    const phone = dom.setupShopPhone.value.trim();
    const email = dom.setupShopEmail.value.trim();
    const ownerUsername = document.getElementById("setup-owner-username").value.trim().toLowerCase();
    const ownerPassword = document.getElementById("setup-owner-password").value;

    if (ownerUsername.length < 3) {
      showToast("Owner username must be at least 3 characters.", "warning");
      return;
    }

    if (state.users.some(u => u.username === ownerUsername)) {
      showToast("Username already taken. Please choose another.", "danger");
      return;
    }

    // Generate unique shop ID
    const shopId = "shop_" + Date.now();

    // Set shop info
    const newShop = { id: shopId, name, phone, email, ownerUsername };
    state.shops.push(newShop);

    // Add new owner account
    state.users.push({
      username: ownerUsername,
      password: ownerPassword,
      role: "owner",
      shopId: shopId
    });

    const initialInventory = typeof DEFAULT_INVENTORY !== 'undefined' ? [...DEFAULT_INVENTORY] : [];

    if (useFirebase) {
      // Seed default inventory in the cloud database
      db.ref("inventory/" + shopId).set(initialInventory);
      db.ref("transactions/" + shopId).set([]);
      
      // Save global lists to Firebase
      db.ref("shops").set(state.shops);
      db.ref("users").set(state.users);
    } else {
      // LocalStorage mode
      localStorage.setItem("stocktaker_inventory_" + shopId, JSON.stringify(initialInventory));
      localStorage.setItem("stocktaker_transactions_" + shopId, JSON.stringify([]));
      saveState("shops");
      saveState("users");
    }

    showToast("Shop & Owner registered successfully! Please sign in.", "success");
    showAuthScreen();
  });

  // Shop Edit Form (Settings Tab)
  dom.shopEditForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.currentUser || !state.shopInfo) return;

    const name = dom.editShopName.value.trim();
    const phone = dom.editShopPhone.value.trim();
    const email = dom.editShopEmail.value.trim();

    // Update active shop info
    state.shopInfo.name = name;
    state.shopInfo.phone = phone;
    state.shopInfo.email = email;

    // Update in global shops list
    state.shops = state.shops.map(s => s.id === state.shopInfo.id ? state.shopInfo : s);
    
    saveState("shops");
    showToast("Shop profile updated successfully!", "success");
    showAppLayout();
  });

  // Logout Actions (Desktop & Mobile)
  const handleLogout = () => {
    showToast("Logged out successfully.", "info");
    if (useFirebase) {
      clearFirebaseShopListeners();
    }
    showAuthScreen();
  };
  if (dom.logoutBtn) dom.logoutBtn.addEventListener("click", handleLogout);
  if (dom.mobileLogoutBtn) dom.mobileLogoutBtn.addEventListener("click", handleLogout);

  // Sidebar / Mobile Bottom Tab Navigation
  dom.navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = link.getAttribute("data-tab");
      switchTab(tabName);
    });
  });

  // Theme Toggling
  const toggleTheme = () => {
    const isDark = document.body.classList.contains("dark-theme");
    const newTheme = isDark ? "light-theme" : "dark-theme";
    document.body.className = newTheme;
    localStorage.setItem("stocktaker_theme", newTheme);
    updateThemeUI(newTheme);
    showToast(`Switched to ${isDark ? 'Light' : 'Dark'} Mode.`, "info");
  };
  dom.themeToggle.addEventListener("click", toggleTheme);
  dom.mobileThemeToggle.addEventListener("click", toggleTheme);

  // Link inside dashboard to transactions
  document.addEventListener("click", (e) => {
    if (e.target.matches("[data-tab-link]")) {
      e.preventDefault();
      const tab = e.target.getAttribute("data-tab-link");
      switchTab(tab);
    }
  });

  // Search & Filters
  dom.inventorySearch.addEventListener("input", renderInventory);
  dom.filterCategory.addEventListener("change", renderInventory);
  dom.filterStatus.addEventListener("change", renderInventory);
  dom.transactionsSearch.addEventListener("input", renderTransactions);
  dom.filterTransactionType.addEventListener("change", renderTransactions);

  // Staff Registration
  dom.staffRegisterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.currentUser) return;

    const username = dom.regUsername.value.trim().toLowerCase();
    const password = dom.regPassword.value;

    if (username.length < 3) {
      showToast("Username must be at least 3 characters.", "warning");
      return;
    }
    if (state.users.some(u => u.username === username)) {
      showToast("Username already exists.", "danger");
      return;
    }

    // Link staff member to the current shop
    state.users.push({
      username,
      password,
      role: "staff",
      shopId: state.currentUser.shopId
    });
    
    saveState("users");
    showToast(`Staff account "${username}" created!`, "success");
    dom.staffRegisterForm.reset();
    renderStaff();
  });

  // Backdrop close modal
  dom.modalBackdrop.addEventListener("click", closeAllModals);

  // --- ADD STOCK MODAL LOGIC (Datalist Autocomplete & Dynamic Fields) ---
  dom.addStockName.addEventListener("input", () => {
    const typedName = dom.addStockName.value.trim().toLowerCase();
    const productExists = state.inventory.some(item => item.name.toLowerCase() === typedName);

    if (typedName.length > 0 && !productExists) {
      dom.newProductFields.classList.remove("hidden");
      dom.newProdCategory.required = true;
    } else {
      dom.newProductFields.classList.add("hidden");
      dom.newProdCategory.required = false;
    }
  });

  dom.formAddStock.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = dom.addStockName.value.trim();
    const qty = parseInt(dom.addStockQty.value, 10);
    const notes = dom.addStockNotes.value.trim();
    
    if (qty <= 0) {
      showToast("Quantity must be greater than 0.", "warning");
      return;
    }

    // Check if product already exists
    let item = state.inventory.find(i => i.name.toLowerCase() === name.toLowerCase());

    if (item) {
      // Add stock to existing
      item.quantity += qty;
      logTransaction("add", item.id, item.name, qty, notes || "Restocked existing item");
      showToast(`Added ${qty} units to "${item.name}".`, "success");
    } else {
      // Create new product
      const category = dom.newProdCategory.value.trim() || "General";
      const minStock = parseInt(dom.newProdMin.value, 10) || 5;

      const newId = "p" + Date.now();
      const newProduct = {
        id: newId,
        name,
        category,
        quantity: qty,
        minStock
      };

      state.inventory.push(newProduct);
      logTransaction("add", newId, name, qty, notes || "Created new catalog product");
      showToast(`Created new product "${name}" with ${qty} units.`, "success");
    }

    saveState("inventory");
    closeModal("modal-add-stock");
    dom.formAddStock.reset();
    dom.newProductFields.classList.add("hidden");
    renderAll();
  });

  // --- GENERAL STOCK ACTIONS (Sell, Damage, Remove) ---
  dom.formStockAction.addEventListener("submit", (e) => {
    e.preventDefault();
    const itemId = dom.actionItemId.value;
    const type = dom.actionType.value;
    const qty = parseInt(dom.actionQty.value, 10);
    const notes = dom.actionNotes.value.trim();

    const item = state.inventory.find(i => i.id === itemId);
    if (!item) return;

    if (qty <= 0) {
      showToast("Quantity must be greater than 0.", "warning");
      return;
    }
    if (qty > item.quantity) {
      showToast("Insufficient stock level.", "danger");
      return;
    }

    // Process reduction
    item.quantity -= qty;
    saveState("inventory");

    let actionNotes = notes;
    if (type === "sell" && !actionNotes) actionNotes = "Counter sale";
    if (type === "damage" && !actionNotes) actionNotes = "Reported damaged stock";
    if (type === "remove" && !actionNotes) actionNotes = "Removed from inventory";

    logTransaction(type, item.id, item.name, qty, actionNotes);
    showToast(`Stock updated for "${item.name}".`, "success");
    
    closeModal("modal-stock-action");
    dom.formStockAction.reset();
    renderAll();
  });

  dom.actionQty.addEventListener("input", () => {
    const qty = parseInt(dom.actionQty.value, 10);
    const currentQty = parseInt(dom.actionCurrentQty.textContent, 10);

    if (qty > currentQty) {
      dom.actionQtyError.classList.remove("hidden");
      dom.stockActionSubmitBtn.disabled = true;
    } else {
      dom.actionQtyError.classList.add("hidden");
      dom.stockActionSubmitBtn.disabled = false;
    }
  });

  // Export CSV
  dom.exportBtn.addEventListener("click", exportInventoryToCSV);

  // Clear Logs
  dom.clearLogsBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all activity logs? This cannot be undone.")) {
      state.transactions = [];
      saveState("transactions");
      showToast("Activity logs cleared.", "info");
      renderAll();
    }
  });
}

// ================= BUSINESS FUNCTIONS =================
function logTransaction(type, itemId, itemName, qty, notes = "") {
  const newTx = {
    id: "t" + Date.now(),
    type,
    itemId,
    itemName,
    quantity: qty,
    user: state.currentUser ? state.currentUser.username : "system",
    timestamp: new Date().toISOString(),
    notes
  };
  state.transactions.unshift(newTx);
  saveState("transactions");
}

window.deleteProduct = function(id) {
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;

  if (confirm(`Delete "${item.name}" from the catalog? This removes the item entirely.`)) {
    state.inventory = state.inventory.filter(i => i.id !== id);
    saveState("inventory");
    showToast(`"${item.name}" deleted.`, "info");
    renderAll();
  }
};

window.deleteStaffMember = function(username) {
  if (username === "owner") return;
  if (confirm(`Remove staff account "@${username}"?`)) {
    state.users = state.users.filter(u => u.username !== username);
    saveState("users");
    showToast(`Staff member "${username}" removed.`, "info");
    renderStaff();
  }
};

// ================= TAB MANAGEMENT =================
function switchTab(tabName) {
  dom.navLinks.forEach(link => {
    if (link.getAttribute("data-tab") === tabName) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  dom.tabPanels.forEach(panel => {
    if (panel.id === `tab-${tabName}`) {
      panel.classList.remove("hidden");
    } else {
      panel.classList.add("hidden");
    }
  });

  // Populate Shop Info Form in settings
  if (tabName === "settings" && state.shopInfo) {
    dom.editShopName.value = state.shopInfo.name;
    dom.editShopPhone.value = state.shopInfo.phone;
    dom.editShopEmail.value = state.shopInfo.email;
  }

  // Refresh active panel data
  if (tabName === "dashboard") renderDashboard();
  else if (tabName === "inventory") renderInventory();
  else if (tabName === "transactions") renderTransactions();
  else if (tabName === "staff") renderStaff();
}

function updateThemeUI(theme) {
  const sunIcons = document.querySelectorAll(".sun-icon");
  const moonIcons = document.querySelectorAll(".moon-icon");
  const themeTexts = document.querySelectorAll(".theme-text");

  if (theme === "dark-theme") {
    sunIcons.forEach(i => i.classList.add("hidden"));
    moonIcons.forEach(i => i.classList.remove("hidden"));
    themeTexts.forEach(t => t.textContent = "Light Mode");
  } else {
    sunIcons.forEach(i => i.classList.remove("hidden"));
    moonIcons.forEach(i => i.classList.add("hidden"));
    themeTexts.forEach(t => t.textContent = "Dark Mode");
  }
}

// ================= RENDERING LOOPS =================
function renderAll() {
  renderDashboard();
  renderInventory();
  renderTransactions();
  renderStaff();
}

// 1. Dashboard Tab
function renderDashboard() {
  const user = state.currentUser;
  if (!user) return;

  dom.welcomeName.textContent = user.username.toUpperCase();

  // Statistics calculations (quantity-only)
  const uniqueItemsCount = state.inventory.length;
  const totalStockQuantity = state.inventory.reduce((sum, item) => sum + item.quantity, 0);

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todaySoldQty = state.transactions
    .filter(t => t.type === "sell" && t.timestamp.startsWith(today))
    .reduce((sum, t) => sum + t.quantity, 0);

  const lowStockItems = state.inventory.filter(item => item.quantity <= item.minStock);
  const lowStockCount = lowStockItems.length;

  // Update Stats DOM
  dom.statTotalItems.textContent = uniqueItemsCount;
  dom.statTotalQty.textContent = totalStockQuantity;
  dom.statTotalSales.textContent = todaySoldQty;
  dom.statLowStock.textContent = lowStockCount;

  // Low Stock Warnings
  dom.lowStockCountBadge.textContent = `${lowStockCount} Item${lowStockCount !== 1 ? 's' : ''}`;
  dom.lowStockList.innerHTML = "";
  
  if (lowStockCount === 0) {
    dom.lowStockList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <p>All stock levels are healthy!</p>
      </div>
    `;
  } else {
    lowStockItems.forEach(item => {
      const isOut = item.quantity === 0;
      const badgeClass = isOut ? "badge-rose" : "badge-rose"; // Consistent warning color
      const statusText = isOut ? "Out of Stock" : "Low Stock";
      
      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
        <div class="item-main">
          <div class="item-info">
            <span class="item-title">${item.name}</span>
            <span class="item-subtitle">${item.category}</span>
          </div>
        </div>
        <div class="item-meta">
          <span class="badge ${badgeClass}">${item.quantity} / ${item.minStock} Left</span>
        </div>
      `;
      dom.lowStockList.appendChild(div);
    });
  }

  // Recent Activity Feed
  dom.recentTransactionsList.innerHTML = "";
  const recentTxs = state.transactions.slice(0, 5);

  if (recentTxs.length === 0) {
    dom.recentTransactionsList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <p>No activity logged yet.</p>
      </div>
    `;
  } else {
    recentTxs.forEach(tx => {
      let badgeClass = "badge-cyan";
      let prefix = "";
      
      if (tx.type === "sell") { badgeClass = "badge-emerald"; prefix = "-"; }
      else if (tx.type === "add") { badgeClass = "badge-violet"; prefix = "+"; }
      else if (tx.type === "damage") { badgeClass = "badge-rose"; prefix = "-"; }
      else if (tx.type === "remove") { badgeClass = "badge-rose"; prefix = "-"; }

      const timeAgo = formatTimeAgo(new Date(tx.timestamp));

      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
        <div class="item-main">
          <div class="item-info">
            <span class="item-title">${tx.itemName}</span>
            <span class="item-subtitle">${timeAgo} by @${tx.user}</span>
          </div>
        </div>
        <div class="item-meta">
          <strong class="item-amount ${tx.type === 'sell' ? 'text-success' : tx.type === 'damage' ? 'text-danger' : ''}">
            ${prefix}${tx.quantity}
          </strong>
          <div><span class="badge ${badgeClass}">${tx.type}</span></div>
        </div>
      `;
      dom.recentTransactionsList.appendChild(div);
    });
  }

  // Quick Action Buttons
  dom.quickActionsBar.innerHTML = "";
  if (user.role === "owner") {
    dom.quickActionsBar.innerHTML = `
      <button class="btn btn-primary" onclick="openAddStockModal()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add Stock</span>
      </button>
      <button class="btn btn-outline" onclick="triggerQuickAction('sell')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        <span>Sell Stock</span>
      </button>
      <button class="btn btn-outline" onclick="triggerQuickAction('damage')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
        <span>Damage Stock</span>
      </button>
    `;
  } else {
    dom.quickActionsBar.innerHTML = `
      <button class="btn btn-primary" onclick="openAddStockModal()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add Stock</span>
      </button>
      <button class="btn btn-outline" onclick="triggerQuickAction('sell')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        <span>Sell Stock</span>
      </button>
    `;
  }
}

window.triggerQuickAction = function(actionType) {
  if (state.inventory.length === 0) {
    showToast("Please add items to your catalog first.", "warning");
    openAddStockModal();
    return;
  }
  // Open the action modal for the first item in the inventory as a shortcut
  openStockActionModal(state.inventory[0].id, actionType);
};

// 2. Inventory Tab
function renderInventory() {
  const user = state.currentUser;
  if (!user) return;

  const searchQuery = dom.inventorySearch.value.toLowerCase();
  const selectedCategory = dom.filterCategory.value;
  const selectedStatus = dom.filterStatus.value;

  // Rebuild Datalists and Categories list
  const categories = [...new Set(state.inventory.map(item => item.category))];
  
  // Populate category filters
  dom.filterCategory.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selectedCategory) opt.selected = true;
    dom.filterCategory.appendChild(opt);
  });

  // Populate Datlists
  dom.categorySuggestions.innerHTML = "";
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    dom.categorySuggestions.appendChild(opt);
  });

  dom.productNamesDatalist.innerHTML = "";
  state.inventory.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.name;
    dom.productNamesDatalist.appendChild(opt);
  });

  // Filter list
  const filteredInventory = state.inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery) || 
                          item.category.toLowerCase().includes(searchQuery);
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    
    let matchesStatus = true;
    if (selectedStatus === "in-stock") matchesStatus = item.quantity > item.minStock;
    else if (selectedStatus === "low-stock") matchesStatus = item.quantity > 0 && item.quantity <= item.minStock;
    else if (selectedStatus === "out-of-stock") matchesStatus = item.quantity === 0;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Render Table rows
  dom.inventoryTableBody.innerHTML = "";
  
  if (filteredInventory.length === 0) {
    dom.inventoryTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
          No products found matching your filters.
        </td>
      </tr>
    `;
    return;
  }

  filteredInventory.forEach(item => {
    let statusClass = "badge-emerald";
    let statusText = "In Stock";
    
    if (item.quantity === 0) {
      statusClass = "badge-rose";
      statusText = "Out of Stock";
    } else if (item.quantity <= item.minStock) {
      statusClass = "badge-rose"; // Keep rose for alerts
      statusText = "Low Stock";
    }

    let actionButtons = "";
    if (user.role === "owner") {
      actionButtons = `
        <button class="btn-action-icon" title="Sell Stock" onclick="openStockActionModal('${item.id}', 'sell')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        </button>
        <button class="btn-action-icon" title="Damage Stock" onclick="openStockActionModal('${item.id}', 'damage')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
        </button>
        <button class="btn-action-icon" title="Remove Stock" onclick="openStockActionModal('${item.id}', 'remove')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button class="btn-action-icon text-danger" title="Delete Product" onclick="deleteProduct('${item.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;
    } else {
      // Staff actions (Sell Only from inventory page)
      actionButtons = `
        <button class="btn-action-icon" title="Sell Stock" onclick="openStockActionModal('${item.id}', 'sell')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        </button>
      `;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.name}</strong></td>
      <td><span class="text-muted">${item.category}</span></td>
      <td><strong>${item.quantity}</strong> <span class="text-muted" style="font-size: 11px;">/ ${item.minStock} threshold</span></td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td><div class="table-actions">${actionButtons}</div></td>
    `;
    dom.inventoryTableBody.appendChild(tr);
  });
}

// 3. Transactions Tab
function renderTransactions() {
  const user = state.currentUser;
  if (!user) return;

  const searchQuery = dom.transactionsSearch.value.toLowerCase();
  const selectedType = dom.filterTransactionType.value;

  const filteredTxs = state.transactions.filter(tx => {
    const matchesSearch = tx.itemName.toLowerCase().includes(searchQuery) || 
                          tx.user.toLowerCase().includes(searchQuery) ||
                          (tx.notes && tx.notes.toLowerCase().includes(searchQuery));
    const matchesType = selectedType === "all" || tx.type === selectedType;
    return matchesSearch && matchesType;
  });

  dom.transactionsTableBody.innerHTML = "";

  if (filteredTxs.length === 0) {
    dom.transactionsTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
          No activity logs found.
        </td>
      </tr>
    `;
    return;
  }

  filteredTxs.forEach(tx => {
    let badgeClass = "badge-cyan";
    let prefix = "";
    
    if (tx.type === "sell") { badgeClass = "badge-emerald"; prefix = "-"; }
    else if (tx.type === "add") { badgeClass = "badge-violet"; prefix = "+"; }
    else if (tx.type === "damage") { badgeClass = "badge-rose"; prefix = "-"; }
    else if (tx.type === "remove") { badgeClass = "badge-rose"; prefix = "-"; }

    const formattedDate = new Date(tx.timestamp).toLocaleString();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="text-muted">${formattedDate}</span></td>
      <td>
        <strong>${tx.itemName}</strong>
        ${tx.notes ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Note: ${tx.notes}</div>` : ""}
      </td>
      <td><span class="badge ${badgeClass}">${tx.type}</span></td>
      <td><strong class="${tx.type === 'sell' ? 'text-success' : tx.type === 'damage' ? 'text-danger' : ''}">${prefix}${tx.quantity}</strong></td>
      <td><code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">@${tx.user}</code></td>
    `;
    dom.transactionsTableBody.appendChild(tr);
  });
}

// 4. Staff Tab
function renderStaff() {
  if (!state.currentUser || state.currentUser.role !== "owner") return;

  dom.staffListBody.innerHTML = "";
  const staffMembers = state.users.filter(u => u.role === "staff" && u.shopId === state.currentUser.shopId);

  if (staffMembers.length === 0) {
    dom.staffListBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 30px 0; color: var(--text-muted);">
          No staff accounts created yet.
        </td>
      </tr>
    `;
    return;
  }

  staffMembers.forEach(member => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${member.username}</strong></td>
      <td><span class="badge badge-cyan">Staff</span></td>
      <td>
        <button class="btn btn-danger-outline" style="padding: 4px 10px; font-size: 11px;" onclick="deleteStaffMember('${member.username}')">
          Delete Account
        </button>
      </td>
    `;
    dom.staffListBody.appendChild(tr);
  });
}

// ================= MODAL MANAGERS =================
window.openAddStockModal = function() {
  dom.newProductFields.classList.add("hidden");
  dom.formAddStock.reset();
  
  // Fill category suggestions
  const categories = [...new Set(state.inventory.map(item => item.category))];
  dom.categorySuggestions.innerHTML = "";
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    dom.categorySuggestions.appendChild(opt);
  });

  openModal("modal-add-stock");
};

window.openStockActionModal = function(itemId, actionType) {
  const item = state.inventory.find(i => i.id === itemId);
  if (!item) return;

  dom.actionItemId.value = item.id;
  dom.actionType.value = actionType;
  
  dom.actionProductName.textContent = item.name;
  dom.actionCurrentQty.textContent = item.quantity;
  
  dom.actionQty.value = "";
  dom.actionQty.max = item.quantity;
  dom.actionQtyError.classList.add("hidden");
  dom.stockActionSubmitBtn.disabled = false;

  // Custom styling based on action
  if (actionType === "sell") {
    dom.stockActionTitle.textContent = "Record Sale";
    dom.actionQtyLabel.textContent = "Quantity Sold";
    dom.stockActionSubmitBtn.className = "btn btn-primary";
    dom.stockActionSubmitBtn.textContent = "Complete Sale";
  } else if (actionType === "damage") {
    dom.stockActionTitle.textContent = "Report Damage";
    dom.actionQtyLabel.textContent = "Quantity Damaged";
    dom.stockActionSubmitBtn.className = "btn btn-primary btn-danger"; // Custom red style
    dom.stockActionSubmitBtn.textContent = "Log Damage";
  } else if (actionType === "remove") {
    dom.stockActionTitle.textContent = "Remove Stock";
    dom.actionQtyLabel.textContent = "Quantity to Remove";
    dom.stockActionSubmitBtn.className = "btn btn-primary btn-danger";
    dom.stockActionSubmitBtn.textContent = "Remove Stock";
  }

  openModal("modal-stock-action");
};

function openModal(modalId) {
  dom.modalBackdrop.classList.remove("hidden");
  document.getElementById(modalId).classList.remove("hidden");
}

window.closeModal = function(modalId) {
  document.getElementById(modalId).classList.add("hidden");
  const openModals = document.querySelectorAll(".modal:not(.hidden)");
  if (openModals.length === 0) {
    dom.modalBackdrop.classList.add("hidden");
  }
};

function closeAllModals() {
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
  dom.modalBackdrop.classList.add("hidden");
}

// ================= TOAST NOTIFICATION SYSTEM =================
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = "";
  if (type === "success") {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" style="width:18px;height:18px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  } else if (type === "warning") {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" style="width:18px;height:18px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>`;
  } else if (type === "danger") {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" style="width:18px;height:18px;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line></svg>`;
  } else {
    icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="var(--info)" stroke-width="2" style="width:18px;height:18px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line></svg>`;
  }

  toast.innerHTML = `
    ${icon}
    <span class="toast-message">${message}</span>
  `;
  
  const container = document.getElementById("toast-container");
  if (container) {
    container.appendChild(toast);
  }

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ================= UTILITIES =================
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + "y ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + "mo ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + "d ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m ago";
  return "just now";
}

function exportInventoryToCSV() {
  if (state.inventory.length === 0) {
    showToast("No products to export.", "warning");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Product ID,Product Name,Category,Quantity,Min Threshold\n";

  state.inventory.forEach(item => {
    const row = [
      item.id,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      item.quantity,
      item.minStock
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Inventory CSV exported successfully!", "success");
}

// ================= START APP =================
window.addEventListener("DOMContentLoaded", init);
