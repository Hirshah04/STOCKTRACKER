// ================= STATE & API CLIENT =================
let state = {
  token: localStorage.getItem("stocktaker_token") || null,
  currentUser: null,
  shopInfo: null,
  users: [],
  products: [],
  inventory: [],
  transactions: [],
  activePeriod: "all",
  activeDate: "",
  sortOrder: "desc", // 'desc' (Newest -> Oldest) or 'asc' (Oldest -> Newest)
  dbMode: "connecting"
};

// API Base URL (Relative path works both locally and on Vercel deployment)
const API_BASE = "";

async function apiFetch(endpoint, options = {}) {
  try {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    if (state.token) {
      defaultHeaders['Authorization'] = `Bearer ${state.token}`;
    }

    const config = {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) }
    };
    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(API_BASE + endpoint, config);
    const result = await response.json();

    if (result.dbMode) {
      updateDbStatusUI(result.dbMode);
    }

    if (response.status === 401) {
      // Unauthenticated / expired session
      state.token = null;
      state.currentUser = null;
      localStorage.removeItem("stocktaker_token");
      localStorage.removeItem("stocktaker_session");
      showAuthScreen();
      throw new Error(result.message || "Session expired. Please sign in again.");
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || `API Error: ${response.statusText}`);
    }

    return result;
  } catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
}

function updateDbStatusUI(dbMode) {
  const dbDot = document.getElementById("db-dot");
  const dbStatusText = document.getElementById("db-status-text");
  const mobileDbDot = document.getElementById("mobile-db-dot");

  state.dbMode = dbMode;

  if (dbDot && dbStatusText) {
    if (dbMode === "mongodb") {
      dbDot.className = "db-dot connected";
      dbStatusText.textContent = "Database Connected (Cloud)";
    } else {
      dbDot.className = "db-dot local";
      dbStatusText.textContent = "Database Connected (Local)";
    }
  }
  if (mobileDbDot) {
    mobileDbDot.className = dbMode === "mongodb" ? "db-dot connected" : "db-dot local";
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
  
  // Tabs & Nav
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
  
  // Master Products Tab
  formAddProduct: document.getElementById("form-add-product"),
  addProductName: document.getElementById("add-product-name"),
  addProductCategory: document.getElementById("add-product-category"),
  productsTableBody: document.getElementById("products-table-body"),

  // Inventory Tab
  inventorySearch: document.getElementById("inventory-search"),
  filterCategory: document.getElementById("filter-category"),
  filterColour: document.getElementById("filter-colour"),
  filterUnit: document.getElementById("filter-unit"),
  filterStatus: document.getElementById("filter-status"),
  filterLocation: document.getElementById("filter-location"),
  inventoryTableBody: document.getElementById("inventory-table-body"),
  exportBtn: document.getElementById("export-btn"),
  
  // Activity Log Tab
  transactionsSearch: document.getElementById("transactions-search"),
  filterTransactionType: document.getElementById("filter-transaction-type"),
  filterTransactionDate: document.getElementById("filter-transaction-date"),
  clearDateBtn: document.getElementById("clear-date-btn"),
  periodFiltersContainer: document.getElementById("period-filters"),
  sortOrderBtn: document.getElementById("sort-order-btn"),
  sortOrderText: document.getElementById("sort-order-text"),
  transactionsTableBody: document.getElementById("transactions-table-body"),
  
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
  addStockProductSelect: document.getElementById("add-stock-product-select"),
  addStockCategoryDisplay: document.getElementById("add-stock-category-display"),
  addStockColourSelect: document.getElementById("add-stock-colour-select"),
  addStockCustomColourGroup: document.getElementById("add-stock-custom-colour-group"),
  addStockCustomColour: document.getElementById("add-stock-custom-colour"),
  addStockUnit: document.getElementById("add-stock-unit"),
  addStockQty: document.getElementById("add-stock-qty"),
  addStockPrice: document.getElementById("add-stock-price"),
  addStockBrand: document.getElementById("add-stock-brand"),
  addStockBuyDate: document.getElementById("add-stock-buy-date"),
  addStockTxType: document.getElementById("add-stock-tx-type"),
  addStockBillNoGroup: document.getElementById("add-stock-bill-no-group"),
  addStockBillNo: document.getElementById("add-stock-bill-no"),
  addStockChallanNoGroup: document.getElementById("add-stock-challan-no-group"),
  addStockChallanNo: document.getElementById("add-stock-challan-no"),
  addStockLocation: document.getElementById("add-stock-location"),
  addStockRag: document.getElementById("add-stock-rag"),
  
  // Stock Action Modal (Sell / Damage)
  modalStockAction: document.getElementById("modal-stock-action"),
  formStockAction: document.getElementById("form-stock-action"),
  stockActionTitle: document.getElementById("stock-action-title"),
  actionItemId: document.getElementById("action-item-id"),
  actionType: document.getElementById("action-type"),
  actionProductName: document.getElementById("action-product-name"),
  actionProductColour: document.getElementById("action-product-colour"),
  actionCurrentQty: document.getElementById("action-current-qty"),
  actionStorageLocation: document.getElementById("action-storage-location"),
  actionQtyLabel: document.getElementById("action-qty-label"),
  actionQty: document.getElementById("action-qty"),
  actionQtyUnitLabel: document.getElementById("action-qty-unit-label"),
  actionQtyError: document.getElementById("action-qty-error"),
  actionRemainingVal: document.getElementById("action-remaining-val"),
  
  // Sell Extra Fields
  sellExtraFields: document.getElementById("sell-extra-fields"),
  actionPrice: document.getElementById("action-price"),
  actionSaleDate: document.getElementById("action-sale-date"),
  actionBrand: document.getElementById("action-brand"),
  actionColourSelect: document.getElementById("action-colour-select"),
  actionCustomColourGroup: document.getElementById("action-custom-colour-group"),
  actionCustomColour: document.getElementById("action-custom-colour"),
  actionTxType: document.getElementById("action-tx-type"),
  actionBillNoGroup: document.getElementById("action-bill-no-group"),
  actionBillNo: document.getElementById("action-bill-no"),
  actionChallanNoGroup: document.getElementById("action-challan-no-group"),
  actionChallanNo: document.getElementById("action-challan-no"),
  actionNotesGroup: document.getElementById("action-notes-group"),
  actionNotes: document.getElementById("action-notes"),
  stockActionSubmitBtn: document.getElementById("stock-action-submit-btn")
};

// ================= INITIALIZATION & ROUTING =================
async function init() {
  const savedSession = localStorage.getItem("stocktaker_session");
  const savedTheme = localStorage.getItem("stocktaker_theme") || "dark-theme";

  document.body.className = savedTheme;
  updateThemeUI(savedTheme);

  // Check system status
  try {
    const res = await apiFetch("/api/status");
    updateDbStatusUI(res.data.dbConnected ? "mongodb" : "local_fallback");
  } catch (e) {
    updateDbStatusUI("local_fallback");
  }

  setupEventListeners();

  if (state.token && savedSession) {
    try {
      state.currentUser = JSON.parse(savedSession);
      await loadShopData();
      showAppLayout();
    } catch (e) {
      console.error("Failed to load session:", e);
      state.token = null;
      state.currentUser = null;
      localStorage.removeItem("stocktaker_token");
      localStorage.removeItem("stocktaker_session");
      showAuthScreen();
    }
  } else {
    showAuthScreen();
  }
}

async function loadShopData() {
  if (!state.currentUser || !state.currentUser.shopId) return;

  const shopId = state.currentUser.shopId;

  try {
    // 1. Fetch Shop details
    try {
      const shopRes = await apiFetch(`/api/shops/${shopId}`);
      state.shopInfo = shopRes.data;
    } catch (e) {
      state.shopInfo = { id: shopId, name: "My Shop", phone: "", email: "" };
    }

    // 2. Fetch Master Products
    await loadProducts();

    // 3. Fetch Stocks
    const stocksRes = await apiFetch(`/api/stocks`);
    state.inventory = stocksRes.data || [];

    // 4. Fetch Activities
    await fetchActivities();

    // 5. Fetch Staff if Owner
    if (state.currentUser.role === "owner") {
      try {
        const usersRes = await apiFetch(`/api/users`);
        state.users = usersRes.data || [];
      } catch (e) {
        state.users = [];
      }
    }

    renderAll();
  } catch (e) {
    showToast("Failed to load data from database: " + e.message, "danger");
  }
}

async function loadProducts() {
  if (!state.currentUser) return;
  try {
    const res = await apiFetch(`/api/products`);
    state.products = res.data || [];
    populateAddStockProductDropdown();
    renderProductsTable();
  } catch (e) {
    console.error("Failed to load products:", e);
    state.products = [];
  }
}

function populateAddStockProductDropdown() {
  if (!dom.addStockProductSelect) return;
  dom.addStockProductSelect.innerHTML = `<option value="">-- Select Product --</option>`;
  state.products.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id || p.productId;
    opt.textContent = `${p.name} (${p.category})`;
    dom.addStockProductSelect.appendChild(opt);
  });
}

async function fetchActivities() {
  if (!state.currentUser) return;

  let query = `?sort=${state.sortOrder}`;
  if (state.activeDate) {
    query += `&date=${state.activeDate}`;
  } else if (state.activePeriod && state.activePeriod !== "all") {
    query += `&period=${state.activePeriod}`;
  }

  const actRes = await apiFetch(`/api/activities${query}`);
  state.transactions = actRes.data || [];
}

// ================= SCREEN ROUTING =================
function showAuthScreen() {
  dom.authScreen.classList.remove("hidden");
  dom.shopSetupScreen.classList.add("hidden");
  dom.appLayout.classList.add("hidden");
  dom.loginForm.reset();
  state.token = null;
  state.currentUser = null;
  localStorage.removeItem("stocktaker_token");
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

  const user = state.currentUser;
  dom.userName.textContent = user.username.toUpperCase();
  dom.userAvatar.textContent = user.username.charAt(0).toUpperCase();
  dom.userBadge.textContent = user.role.toUpperCase();
  dom.userBadge.className = `badge-role ${user.role}-role`;

  applyRolePermissions(user.role);
  switchTab("dashboard");
}

function updateShopTextUI() {
  const shopName = state.shopInfo ? state.shopInfo.name : "My Shop";
  const shopEmail = state.shopInfo ? state.shopInfo.email : "Registered Shop";

  dom.sidebarShopName.textContent = shopName;
  dom.sidebarShopEmail.textContent = shopEmail;
  dom.mobileShopTitle.textContent = shopName;
  if (dom.dashboardShopSubtitle) {
    dom.dashboardShopSubtitle.textContent = state.shopInfo
      ? `Inventory summary for ${state.shopInfo.name} (${state.shopInfo.phone || 'No phone'})`
      : "Inventory summary for your shop.";
  }
}

function applyRolePermissions(role) {
  const ownerElements = document.querySelectorAll(".owner-only");
  if (role === "owner") {
    ownerElements.forEach(el => el.classList.remove("hidden"));
  } else {
    ownerElements.forEach(el => el.classList.add("hidden"));
  }
}

// ================= CORE EVENT LISTENERS =================
function setupEventListeners() {
  // Login Form
  dom.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = dom.loginUsername.value.trim().toLowerCase();
    const password = dom.loginPassword.value;

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { username, password }
      });

      state.token = res.data.token;
      state.currentUser = res.data.user;

      localStorage.setItem("stocktaker_token", state.token);
      localStorage.setItem("stocktaker_session", JSON.stringify(state.currentUser));

      await loadShopData();
      showToast(`Welcome back, ${state.currentUser.username.toUpperCase()}!`, "success");
      showAppLayout();
    } catch (err) {
      showToast(err.message || "Invalid username or password.", "danger");
    }
  });

  // Toggle Auth / Setup Screens
  const goToRegister = document.getElementById("go-to-register");
  const goToLogin = document.getElementById("go-to-login");
  if (goToRegister) goToRegister.addEventListener("click", (e) => { e.preventDefault(); showShopSetupScreen(); });
  if (goToLogin) goToLogin.addEventListener("click", (e) => { e.preventDefault(); showAuthScreen(); });

  // Shop Setup Form
  dom.shopSetupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const shopName = dom.setupShopName.value.trim();
    const phone = dom.setupShopPhone.value.trim();
    const email = dom.setupShopEmail.value.trim();
    const ownerUsername = document.getElementById("setup-owner-username").value.trim().toLowerCase();
    const ownerPassword = document.getElementById("setup-owner-password").value;

    if (ownerUsername.length < 3) {
      showToast("Owner username must be at least 3 characters.", "warning");
      return;
    }

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: { shopName, phone, email, ownerUsername, ownerPassword }
      });

      state.token = res.data.token;
      state.currentUser = res.data.user;
      localStorage.setItem("stocktaker_token", state.token);
      localStorage.setItem("stocktaker_session", JSON.stringify(state.currentUser));

      showToast("Shop registered successfully!", "success");
      await loadShopData();
      showAppLayout();
    } catch (err) {
      showToast(err.message || "Registration failed.", "danger");
    }
  });

  // Edit Shop Profile
  dom.shopEditForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.currentUser || !state.shopInfo) return;

    const name = dom.editShopName.value.trim();
    const phone = dom.editShopPhone.value.trim();
    const email = dom.editShopEmail.value.trim();

    try {
      const res = await apiFetch(`/api/shops/${state.currentUser.shopId}`, {
        method: "PUT",
        body: { name, phone, email }
      });

      state.shopInfo = res.data;
      updateShopTextUI();
      showToast("Shop profile updated successfully!", "success");
    } catch (err) {
      showToast("Failed to update profile: " + err.message, "danger");
    }
  });

  // Logout Handlers
  const handleLogout = () => {
    showToast("Logged out successfully.", "info");
    showAuthScreen();
  };
  if (dom.logoutBtn) dom.logoutBtn.addEventListener("click", handleLogout);
  if (dom.mobileLogoutBtn) dom.mobileLogoutBtn.addEventListener("click", handleLogout);

  // Sidebar / Mobile Navigation
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
      switchTab(e.target.getAttribute("data-tab-link"));
    }
  });

  // Master Product Form Handler
  dom.formAddProduct.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = dom.addProductName.value.trim();
    const category = dom.addProductCategory.value.trim();

    if (!name || !category) {
      showToast("Product name and category are required.", "warning");
      return;
    }

    try {
      const res = await apiFetch("/api/products", {
        method: "POST",
        body: { name, category }
      });

      showToast(res.message || `Product "${name}" added to master list!`, "success");
      closeModal("modal-add-product");
      dom.formAddProduct.reset();

      await loadProducts();
    } catch (err) {
      showToast(err.message || "Failed to add product.", "danger");
    }
  });

  // Product Selection in Add Stock Form (Auto-fill Category)
  dom.addStockProductSelect.addEventListener("change", () => {
    const pId = dom.addStockProductSelect.value;
    const prod = state.products.find(p => (p.id || p.productId) === pId);
    if (prod) {
      dom.addStockCategoryDisplay.value = prod.category;
    } else {
      dom.addStockCategoryDisplay.value = "";
    }
  });

  // Add Stock Conditional Colour Dropdown Handler
  dom.addStockColourSelect.addEventListener("change", () => {
    if (dom.addStockColourSelect.value === "Other") {
      dom.addStockCustomColourGroup.classList.remove("hidden");
    } else {
      dom.addStockCustomColourGroup.classList.add("hidden");
      dom.addStockCustomColour.value = "";
    }
  });

  // Add Stock Conditional Transaction Type Handler
  dom.addStockTxType.addEventListener("change", () => {
    const val = dom.addStockTxType.value;
    if (val === "bill") {
      dom.addStockBillNoGroup.classList.remove("hidden");
      dom.addStockChallanNoGroup.classList.add("hidden");
      dom.addStockChallanNo.value = "";
    } else if (val === "challan") {
      dom.addStockChallanNoGroup.classList.remove("hidden");
      dom.addStockBillNoGroup.classList.add("hidden");
      dom.addStockBillNo.value = "";
    } else {
      dom.addStockBillNoGroup.classList.add("hidden");
      dom.addStockChallanNoGroup.classList.add("hidden");
      dom.addStockBillNo.value = "";
      dom.addStockChallanNo.value = "";
    }
  });

  // Sell Stock Conditional Colour Dropdown Handler
  dom.actionColourSelect.addEventListener("change", () => {
    if (dom.actionColourSelect.value === "Other") {
      dom.actionCustomColourGroup.classList.remove("hidden");
    } else {
      dom.actionCustomColourGroup.classList.add("hidden");
      dom.actionCustomColour.value = "";
    }
  });

  // Sell Stock Conditional Transaction Type Handler
  dom.actionTxType.addEventListener("change", () => {
    const val = dom.actionTxType.value;
    if (val === "bill") {
      dom.actionBillNoGroup.classList.remove("hidden");
      dom.actionChallanNoGroup.classList.add("hidden");
      dom.actionChallanNo.value = "";
    } else if (val === "challan") {
      dom.actionChallanNoGroup.classList.remove("hidden");
      dom.actionBillNoGroup.classList.add("hidden");
      dom.actionBillNo.value = "";
    } else {
      dom.actionBillNoGroup.classList.add("hidden");
      dom.actionChallanNoGroup.classList.add("hidden");
      dom.actionBillNo.value = "";
      dom.actionChallanNo.value = "";
    }
  });

  // Catalog Filters & Search
  dom.inventorySearch.addEventListener("input", renderInventory);
  dom.filterCategory.addEventListener("change", renderInventory);
  dom.filterColour.addEventListener("change", renderInventory);
  dom.filterUnit.addEventListener("change", renderInventory);
  dom.filterStatus.addEventListener("change", renderInventory);
  if (dom.filterLocation) dom.filterLocation.addEventListener("change", renderInventory);

  // Activity Log Search & Filters
  dom.transactionsSearch.addEventListener("input", renderTransactions);
  dom.filterTransactionType.addEventListener("change", async () => {
    renderTransactions();
  });

  // Period Filter Buttons (All, Day, Week, Month, Year)
  if (dom.periodFiltersContainer) {
    dom.periodFiltersContainer.querySelectorAll(".period-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        dom.periodFiltersContainer.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        state.activePeriod = btn.getAttribute("data-period");
        state.activeDate = "";
        if (dom.filterTransactionDate) dom.filterTransactionDate.value = "";
        if (dom.clearDateBtn) dom.clearDateBtn.classList.add("hidden");

        await fetchActivities();
        renderTransactions();
      });
    });
  }

  // Date Picker Filter
  if (dom.filterTransactionDate) {
    dom.filterTransactionDate.addEventListener("change", async () => {
      const selectedVal = dom.filterTransactionDate.value;
      if (selectedVal) {
        state.activeDate = selectedVal;
        if (dom.clearDateBtn) dom.clearDateBtn.classList.remove("hidden");
        if (dom.periodFiltersContainer) {
          dom.periodFiltersContainer.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
        }
      } else {
        state.activeDate = "";
        if (dom.clearDateBtn) dom.clearDateBtn.classList.add("hidden");
      }
      await fetchActivities();
      renderTransactions();
    });
  }

  if (dom.clearDateBtn) {
    dom.clearDateBtn.addEventListener("click", async () => {
      dom.filterTransactionDate.value = "";
      state.activeDate = "";
      dom.clearDateBtn.classList.add("hidden");
      if (dom.periodFiltersContainer) {
        dom.periodFiltersContainer.querySelectorAll(".period-btn").forEach(b => {
          if (b.getAttribute("data-period") === "all") b.classList.add("active");
          else b.classList.remove("active");
        });
      }
      state.activePeriod = "all";
      await fetchActivities();
      renderTransactions();
    });
  }

  // Activity Log Sort Toggle
  if (dom.sortOrderBtn) {
    dom.sortOrderBtn.addEventListener("click", async () => {
      state.sortOrder = state.sortOrder === "desc" ? "asc" : "desc";
      dom.sortOrderText.textContent = state.sortOrder === "desc" ? "Newest → Oldest" : "Oldest → Newest";
      await fetchActivities();
      renderTransactions();
    });
  }

  // Staff Account Creation
  dom.staffRegisterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.currentUser) return;

    const username = dom.regUsername.value.trim().toLowerCase();
    const password = dom.regPassword.value;

    if (username.length < 3) {
      showToast("Username must be at least 3 characters.", "warning");
      return;
    }

    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: { username, password }
      });

      showToast(`Staff account "${username}" created!`, "success");
      dom.staffRegisterForm.reset();
      await loadShopData();
    } catch (err) {
      showToast(err.message || "Failed to create staff account.", "danger");
    }
  });

  // Modal Backdrop Close
  dom.modalBackdrop.addEventListener("click", closeAllModals);

  // Submit Add Stock Form
  dom.formAddStock.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (state.currentUser.role === "staff") {
      showToast("Staff accounts are not authorized to add stock.", "danger");
      return;
    }

    const productId = dom.addStockProductSelect.value;
    if (!productId) {
      showToast("Please select a product.", "warning");
      return;
    }

    const qty = parseInt(dom.addStockQty.value, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast("Quantity must be greater than 0.", "warning");
      return;
    }

    const colourSelectVal = dom.addStockColourSelect.value;
    let finalColour = colourSelectVal;
    let customCol = "";
    if (colourSelectVal === "Other") {
      customCol = dom.addStockCustomColour.value.trim();
    }

    const unit = dom.addStockUnit.value.toLowerCase();
    const priceVal = dom.addStockPrice.value !== "" ? parseFloat(dom.addStockPrice.value) : null;
    const brandName = dom.addStockBrand.value.trim();
    const buyDate = dom.addStockBuyDate.value;
    const txType = dom.addStockTxType.value;
    const billNo = dom.addStockBillNo.value.trim();
    const challanNo = dom.addStockChallanNo.value.trim();
    const location = dom.addStockLocation.value;
    const ragNumber = dom.addStockRag.value.trim();

    try {
      const res = await apiFetch("/api/stocks", {
        method: "POST",
        body: {
          productId,
          colour: finalColour,
          customColour: customCol,
          quantity: qty,
          unit,
          price: priceVal,
          brandName,
          buyDate,
          transactionType: txType,
          billNo,
          challanNo,
          location,
          ragNumber
        }
      });

      showToast(res.message || `Stock added successfully.`, "success");
      closeModal("modal-add-stock");
      dom.formAddStock.reset();
      dom.addStockCategoryDisplay.value = "";
      dom.addStockCustomColourGroup.classList.add("hidden");
      dom.addStockBillNoGroup.classList.add("hidden");
      dom.addStockChallanNoGroup.classList.add("hidden");

      await loadShopData();
    } catch (err) {
      showToast(err.message || "Failed to add stock.", "danger");
    }
  });

  // Submit Stock Action Form (Sell, Damage)
  dom.formStockAction.addEventListener("submit", async (e) => {
    e.preventDefault();
    const itemId = dom.actionItemId.value;
    const type = dom.actionType.value;
    const qty = parseInt(dom.actionQty.value, 10);
    const notes = dom.actionNotes.value.trim();

    const item = state.inventory.find(i => i.id === itemId || i.stockId === itemId);
    if (!item) return;

    if (isNaN(qty) || qty <= 0) {
      showToast("Quantity must be greater than 0.", "warning");
      return;
    }
    if (qty > item.quantity) {
      showToast(`Cannot exceed available stock level (${item.quantity} ${item.unit.toUpperCase()}).`, "danger");
      return;
    }

    try {
      let endpoint = `/api/stocks/${item.id || item.stockId}/sell`;
      let bodyData = { quantity: qty, notes };

      if (type === "sell") {
        const priceVal = dom.actionPrice.value !== "" ? parseFloat(dom.actionPrice.value) : null;
        const saleDate = dom.actionSaleDate.value;
        const brandName = dom.actionBrand.value.trim();
        const colourSelectVal = dom.actionColourSelect.value;
        const txType = dom.actionTxType.value;
        const billNo = dom.actionBillNo.value.trim();
        const challanNo = dom.actionChallanNo.value.trim();

        bodyData = {
          ...bodyData,
          price: priceVal,
          saleDate,
          brandName,
          colour: colourSelectVal,
          customColour: colourSelectVal === "Other" ? dom.actionCustomColour.value.trim() : "",
          transactionType: txType,
          billNo,
          challanNo
        };
      } else if (type === "damage") {
        endpoint = `/api/stocks/${item.id || item.stockId}/defective`;
      }

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: bodyData
      });

      showToast(res.message || `Stock action recorded for "${item.name}".`, "success");
      closeModal("modal-stock-action");
      dom.formStockAction.reset();

      await loadShopData();
    } catch (err) {
      showToast(err.message || "Failed to process stock action.", "danger");
    }
  });

  // Live Quantity Preview inside Sell Modal
  dom.actionQty.addEventListener("input", () => {
    const qty = parseInt(dom.actionQty.value, 10) || 0;
    const currentQty = parseInt(dom.actionCurrentQty.textContent, 10) || 0;
    const unitText = dom.actionQtyUnitLabel.textContent || "Piece";

    if (qty > currentQty) {
      dom.actionQtyError.classList.remove("hidden");
      dom.stockActionSubmitBtn.disabled = true;
      dom.actionRemainingVal.textContent = `0 ${unitText}`;
      dom.actionRemainingVal.className = "text-danger";
    } else {
      dom.actionQtyError.classList.add("hidden");
      dom.stockActionSubmitBtn.disabled = false;
      const remaining = Math.max(0, currentQty - qty);
      dom.actionRemainingVal.textContent = `${remaining} ${unitText}`;
      dom.actionRemainingVal.className = "text-success";
    }
  });

  // Export CSV
  dom.exportBtn.addEventListener("click", exportInventoryToCSV);
}

// ================= BUSINESS FUNCTIONS =================
window.deleteProduct = async function(id) {
  if (state.currentUser.role === "staff") return;

  const item = state.inventory.find(i => i.id === id || i.stockId === id);
  if (!item) return;

  if (confirm(`Delete "${item.name}" from the catalog? This removes the item entirely.`)) {
    try {
      await apiFetch(`/api/stocks/${item.id || item.stockId}`, {
        method: "DELETE"
      });
      showToast(`"${item.name}" deleted successfully.`, "info");
      await loadShopData();
    } catch (err) {
      showToast("Failed to delete product: " + err.message, "danger");
    }
  }
};

window.deleteStaffMember = async function(username) {
  if (state.currentUser.role === "staff") return;

  if (confirm(`Remove staff account "@${username}"?`)) {
    try {
      await apiFetch(`/api/users/${username}`, { method: "DELETE" });
      showToast(`Staff member "${username}" removed.`, "info");
      await loadShopData();
    } catch (err) {
      showToast("Failed to delete staff member: " + err.message, "danger");
    }
  }
};

// ================= TAB MANAGEMENT =================
function switchTab(tabName) {
  if (state.currentUser && state.currentUser.role === "staff") {
    if (tabName === "products" || tabName === "staff" || tabName === "settings") {
      tabName = "dashboard";
    }
  }

  dom.navLinks.forEach(link => {
    if (link.getAttribute("data-tab") === tabName) link.classList.add("active");
    else link.classList.remove("active");
  });

  dom.tabPanels.forEach(panel => {
    if (panel.id === `tab-${tabName}`) panel.classList.remove("hidden");
    else panel.classList.add("hidden");
  });

  if (tabName === "settings" && state.shopInfo) {
    dom.editShopName.value = state.shopInfo.name || "";
    dom.editShopPhone.value = state.shopInfo.phone || "";
    dom.editShopEmail.value = state.shopInfo.email || "";
  }

  if (tabName === "dashboard") renderDashboard();
  else if (tabName === "products") renderProductsTable();
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
  renderProductsTable();
  renderInventory();
  renderTransactions();
  renderStaff();
}

// 0. Master Products Table
function renderProductsTable() {
  if (!dom.productsTableBody) return;
  dom.productsTableBody.innerHTML = "";

  if (state.products.length === 0) {
    dom.productsTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
          No products created yet. Click "Add Product" to create your first product!
        </td>
      </tr>
    `;
    return;
  }

  state.products.forEach(p => {
    const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Product Name"><strong>${p.name}</strong></td>
      <td data-label="Category"><span class="badge badge-cyan">${p.category}</span></td>
      <td data-label="Created By"><code>@${p.createdBy || 'system'}</code></td>
      <td data-label="Date Added"><span class="text-muted">${createdDate}</span></td>
    `;
    dom.productsTableBody.appendChild(tr);
  });
}

// 1. Dashboard Tab
function renderDashboard() {
  const user = state.currentUser;
  if (!user) return;

  dom.welcomeName.textContent = user.username.toUpperCase();

  const uniqueItemsCount = state.inventory.length;
  const totalStockQuantity = state.inventory.reduce((sum, item) => sum + item.quantity, 0);

  const todayStr = new Date().toISOString().split("T")[0];
  const todaySoldQty = state.transactions
    .filter(t => t.type === "sell" && t.timestamp && String(t.timestamp).startsWith(todayStr))
    .reduce((sum, t) => sum + (t.quantity || 0), 0);

  const lowStockItems = state.inventory.filter(item => item.quantity <= item.minStock);
  const lowStockCount = lowStockItems.length;

  dom.statTotalItems.textContent = uniqueItemsCount;
  dom.statTotalQty.textContent = totalStockQuantity;
  dom.statTotalSales.textContent = todaySoldQty;
  dom.statLowStock.textContent = lowStockCount;

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
      const badgeClass = "badge-rose";
      const unitText = (item.unit || "piece").toUpperCase();

      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
        <div class="item-main">
          <div class="item-info">
            <span class="item-title">${item.name} <span class="colour-pill"><span class="colour-dot"></span>${item.colour || 'N/A'}</span></span>
            <span class="item-subtitle">${item.category}</span>
          </div>
        </div>
        <div class="item-meta">
          <span class="badge ${badgeClass}">${item.quantity} ${unitText} / ${item.minStock} Left</span>
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
      else if (tx.type === "add" || tx.type === "product_add") { badgeClass = "badge-violet"; prefix = "+"; }
      else if (tx.type === "damage") { badgeClass = "badge-rose"; prefix = "-"; }

      const timeAgo = formatTimeAgo(new Date(tx.timestamp));
      const unitText = (tx.unit || "piece").toUpperCase();

      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
        <div class="item-main">
          <div class="item-info">
            <span class="item-title">${tx.itemName} <span class="colour-pill"><span class="colour-dot"></span>${tx.colour || 'N/A'}</span></span>
            <span class="item-subtitle">${timeAgo} by @${tx.user}</span>
          </div>
        </div>
        <div class="item-meta">
          <strong class="item-amount ${tx.type === 'sell' ? 'text-success' : tx.type === 'damage' ? 'text-danger' : ''}">
            ${prefix}${tx.quantity} ${unitText}
          </strong>
          <div><span class="badge ${badgeClass}">${tx.type}</span></div>
        </div>
      `;
      dom.recentTransactionsList.appendChild(div);
    });
  }

  // Quick Action Bar
  dom.quickActionsBar.innerHTML = "";
  if (user.role === "owner") {
    dom.quickActionsBar.innerHTML = `
      <button class="btn btn-outline" onclick="openAddProductModal()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        <span>Add Product</span>
      </button>
      <button class="btn btn-primary" onclick="openAddStockModal()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span>Add Stock</span>
      </button>
      <button class="btn btn-outline" onclick="triggerQuickAction('sell')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        <span>Sell Stock</span>
      </button>
    `;
  } else {
    // Staff role: ONLY Sell Stock available (NO Add Stock!)
    dom.quickActionsBar.innerHTML = `
      <button class="btn btn-primary" onclick="triggerQuickAction('sell')">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        <span>Sell Stock</span>
      </button>
    `;
  }
}

window.triggerQuickAction = function(actionType) {
  if (state.inventory.length === 0) {
    showToast("No products available in stock catalog.", "warning");
    return;
  }
  openStockActionModal(state.inventory[0].id || state.inventory[0].stockId, actionType);
};

// 2. Inventory Tab
function renderInventory() {
  const user = state.currentUser;
  if (!user) return;

  const searchQuery = dom.inventorySearch.value.toLowerCase().trim();
  const selectedCategory = dom.filterCategory.value;
  const selectedColour = dom.filterColour.value;
  const selectedUnit = dom.filterUnit.value;
  const selectedStatus = dom.filterStatus.value;
  const selectedLocation = dom.filterLocation ? dom.filterLocation.value : "all";

  // Rebuild Datalists and Filters
  const categories = [...new Set(state.inventory.map(item => item.category).filter(Boolean))];
  const colours = [...new Set(state.inventory.map(item => item.colour).filter(Boolean))];

  // Category filter dropdown
  dom.filterCategory.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (cat === selectedCategory) opt.selected = true;
    dom.filterCategory.appendChild(opt);
  });

  // Colour filter dropdown
  dom.filterColour.innerHTML = `<option value="all">All Colours</option>`;
  colours.forEach(col => {
    const opt = document.createElement("option");
    opt.value = col;
    opt.textContent = col;
    if (col === selectedColour) opt.selected = true;
    dom.filterColour.appendChild(opt);
  });

  // Multi-Field Search & Filters
  const filteredInventory = state.inventory.filter(item => {
    const nameStr = (item.name || "").toLowerCase();
    const catStr = (item.category || "").toLowerCase();
    const colStr = (item.colour || "").toLowerCase();
    const brandStr = (item.brandName || "").toLowerCase();

    const matchesSearch = !searchQuery || 
                          nameStr.includes(searchQuery) || 
                          catStr.includes(searchQuery) ||
                          colStr.includes(searchQuery) ||
                          brandStr.includes(searchQuery);

    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesColour = selectedColour === "all" || (item.colour && item.colour.toLowerCase() === selectedColour.toLowerCase());
    const matchesUnit = selectedUnit === "all" || (item.unit && item.unit.toLowerCase() === selectedUnit.toLowerCase());
    const matchesLocation = selectedLocation === "all" || (item.location || "Shop") === selectedLocation;

    let matchesStatus = true;
    if (selectedStatus === "in-stock") matchesStatus = item.quantity > item.minStock;
    else if (selectedStatus === "low-stock") matchesStatus = item.quantity > 0 && item.quantity <= item.minStock;
    else if (selectedStatus === "out-of-stock") matchesStatus = item.quantity === 0;

    return matchesSearch && matchesCategory && matchesColour && matchesUnit && matchesStatus && matchesLocation;
  });

  // Render Table
  dom.inventoryTableBody.innerHTML = "";

  if (filteredInventory.length === 0) {
    dom.inventoryTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
          No stock items found matching your search or filters.
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
      statusClass = "badge-rose";
      statusText = "Low Stock";
    }

    const itemId = item.id || item.stockId;
    const unitDisplay = (item.unit || "piece").charAt(0).toUpperCase() + (item.unit || "piece").slice(1);
    const priceDisplay = item.price !== undefined && item.price !== null && item.price !== "" ? `₹${item.price}` : "-";

    let actionButtons = "";
    if (user.role === "owner") {
      actionButtons = `
        <button class="btn-action-icon" title="Sell Stock" onclick="openStockActionModal('${itemId}', 'sell')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        </button>
        <button class="btn-action-icon" title="Damage Stock" onclick="openStockActionModal('${itemId}', 'damage')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
        </button>
        <button class="btn-action-icon text-danger" title="Delete Product" onclick="deleteProduct('${itemId}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;
    } else {
      actionButtons = `
        <button class="btn-action-icon" title="Sell Stock" onclick="openStockActionModal('${itemId}', 'sell')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        </button>
      `;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Product Name">
        <strong class="product-name-highlight">${item.name}</strong>
        ${item.brandName ? `<span class="badge badge-cyan" style="margin-left: 6px; font-size: 10px;">${item.brandName}</span>` : ''}
        <div class="product-storage-info">
          <span class="storage-location-badge location-${(item.location || 'Shop').toLowerCase()}">${item.location || 'Shop'}</span>
          ${item.ragNumber ? `<span class="storage-rag-badge">Rag: ${item.ragNumber}</span>` : ''}
        </div>
      </td>
      <td data-label="Category"><span class="text-muted">${item.category}</span></td>
      <td data-label="Colour"><span class="colour-pill"><span class="colour-dot"></span>${item.colour || 'N/A'}</span></td>
      <td data-label="Quantity & Unit"><strong>${item.quantity} ${unitDisplay}</strong> <span class="text-muted" style="font-size: 11px;">(min ${item.minStock})</span></td>
      <td data-label="Price"><strong>${priceDisplay}</strong></td>
      <td data-label="Status"><span class="badge ${statusClass}">${statusText}</span></td>
      <td data-label="Actions" class="table-actions-cell"><div class="table-actions">${actionButtons}</div></td>
    `;
    dom.inventoryTableBody.appendChild(tr);
  });
}

// 3. Transactions / Activity Log Tab
function renderTransactions() {
  const user = state.currentUser;
  if (!user) return;

  const searchQuery = dom.transactionsSearch.value.toLowerCase().trim();
  const selectedType = dom.filterTransactionType.value;

  const filteredTxs = state.transactions.filter(tx => {
    const nameStr = (tx.itemName || "").toLowerCase();
    const colourStr = (tx.colour || "").toLowerCase();
    const userStr = (tx.user || "").toLowerCase();
    const notesStr = (tx.notes || "").toLowerCase();
    const billStr = (tx.billNo || "").toLowerCase();
    const challanStr = (tx.challanNo || "").toLowerCase();
    const brandStr = (tx.brandName || "").toLowerCase();

    const matchesSearch = !searchQuery || 
                          nameStr.includes(searchQuery) ||
                          colourStr.includes(searchQuery) ||
                          userStr.includes(searchQuery) ||
                          notesStr.includes(searchQuery) ||
                          billStr.includes(searchQuery) ||
                          challanStr.includes(searchQuery) ||
                          brandStr.includes(searchQuery);

    const matchesType = selectedType === "all" || tx.type === selectedType;
    return matchesSearch && matchesType;
  });

  dom.transactionsTableBody.innerHTML = "";

  if (filteredTxs.length === 0) {
    dom.transactionsTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
          No activities found for the selected period or filters.
        </td>
      </tr>
    `;
    return;
  }

  filteredTxs.forEach(tx => {
    let badgeClass = "badge-cyan";
    let prefix = "";

    if (tx.type === "sell") { badgeClass = "badge-emerald"; prefix = "-"; }
    else if (tx.type === "add" || tx.type === "product_add") { badgeClass = "badge-violet"; prefix = "+"; }
    else if (tx.type === "damage") { badgeClass = "badge-rose"; prefix = "-"; }

    const formattedDate = new Date(tx.timestamp).toLocaleString("en-US", {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const unitText = (tx.unit || "piece").toUpperCase();

    // Ref & Transaction details snippet
    let txDetailsHtml = "";
    if (tx.transactionType) {
      const typeLabel = tx.transactionType.toUpperCase();
      let refNo = "";
      if (tx.transactionType === "bill" && tx.billNo) refNo = ` (${tx.billNo})`;
      else if (tx.transactionType === "challan" && tx.challanNo) refNo = ` (${tx.challanNo})`;
      txDetailsHtml += `<div style="font-size: 11px; font-weight: 600; color: var(--accent-cyan); margin-top: 2px;">Type: ${typeLabel}${refNo}</div>`;
    }
    if (tx.price !== undefined && tx.price !== null && tx.price !== "") {
      txDetailsHtml += `<div style="font-size: 11px; color: var(--text-muted);">Price: ₹${tx.price}</div>`;
    }

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td data-label="Timestamp"><span class="text-muted" style="font-size: 12px;">${formattedDate}</span></td>
      <td data-label="Product & Colour">
        <strong>${tx.itemName}</strong>
        ${tx.brandName ? `<span class="badge badge-cyan" style="margin-left: 4px; font-size: 10px;">${tx.brandName}</span>` : ''}
        <span class="colour-pill" style="margin-left: 6px;"><span class="colour-dot"></span>${tx.colour || 'N/A'}</span>
        ${tx.notes ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${tx.notes}</div>` : ""}
      </td>
      <td data-label="Activity Type"><span class="badge ${badgeClass}">${tx.type}</span></td>
      <td data-label="Tx Info / Ref">${txDetailsHtml || '<span class="text-muted">-</span>'}</td>
      <td data-label="Quantity Changed"><strong class="${tx.type === 'sell' ? 'text-success' : tx.type === 'damage' ? 'text-danger' : ''}">${prefix}${tx.quantity} ${unitText}</strong></td>
      <td data-label="Logged By"><code style="background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">@${tx.user}</code></td>
    `;
    dom.transactionsTableBody.appendChild(tr);
  });
}

// 4. Staff Tab
function renderStaff() {
  if (!state.currentUser || state.currentUser.role !== "owner") return;

  dom.staffListBody.innerHTML = "";
  const staffMembers = state.users.filter(u => u.role === "staff");

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
      <td data-label="Username"><strong>${member.username}</strong></td>
      <td data-label="Role Badge"><span class="badge badge-cyan">Staff</span></td>
      <td data-label="Action" class="table-actions-cell">
        <button class="btn btn-danger-outline" style="padding: 4px 10px; font-size: 11px;" onclick="deleteStaffMember('${member.username}')">
          Delete Account
        </button>
      </td>
    `;
    dom.staffListBody.appendChild(tr);
  });
}

// ================= MODAL MANAGERS =================
window.openAddProductModal = function() {
  if (state.currentUser.role === "staff") return;
  dom.formAddProduct.reset();
  openModal("modal-add-product");
};

window.openAddStockModal = function() {
  if (state.currentUser.role === "staff") {
    showToast("Staff accounts are not authorized to add stock.", "warning");
    return;
  }
  dom.formAddStock.reset();
  dom.addStockCategoryDisplay.value = "";
  dom.addStockCustomColourGroup.classList.add("hidden");
  dom.addStockBillNoGroup.classList.add("hidden");
  dom.addStockChallanNoGroup.classList.add("hidden");

  populateAddStockProductDropdown();

  if (state.products.length === 0) {
    showToast("Please add at least one product to master list first.", "info");
    openAddProductModal();
    return;
  }

  openModal("modal-add-stock");
};

window.openStockActionModal = function(itemId, actionType) {
  const item = state.inventory.find(i => i.id === itemId || i.stockId === itemId);
  if (!item) return;

  dom.actionItemId.value = item.id || item.stockId;
  dom.actionType.value = actionType;

  dom.actionProductName.textContent = item.name;
  dom.actionProductColour.textContent = item.colour || 'N/A';
  
  const unitText = (item.unit || "piece").charAt(0).toUpperCase() + (item.unit || "piece").slice(1);
  dom.actionCurrentQty.textContent = `${item.quantity} ${unitText}`;
  dom.actionQtyUnitLabel.textContent = unitText;

  dom.actionQty.value = "";
  dom.actionQty.max = item.quantity;
  dom.actionQtyError.classList.add("hidden");
  dom.stockActionSubmitBtn.disabled = false;
  dom.actionRemainingVal.textContent = `${item.quantity} ${unitText}`;
  dom.actionRemainingVal.className = "text-success";

  const locVal = item.location || "Shop";
  const ragVal = item.ragNumber ? ` (Rag: ${item.ragNumber})` : "";
  if (dom.actionStorageLocation) dom.actionStorageLocation.textContent = `${locVal}${ragVal}`;

  // Reset extra sell fields
  dom.formStockAction.reset();
  dom.actionItemId.value = item.id || item.stockId;
  dom.actionType.value = actionType;
  dom.actionCustomColourGroup.classList.add("hidden");
  dom.actionBillNoGroup.classList.add("hidden");
  dom.actionChallanNoGroup.classList.add("hidden");

  if (actionType === "sell") {
    dom.stockActionTitle.textContent = "Sell Stock";
    dom.actionQtyLabel.textContent = "Sell Quantity*";
    dom.sellExtraFields.classList.remove("hidden");
    dom.stockActionSubmitBtn.className = "btn btn-primary";
    dom.stockActionSubmitBtn.textContent = "Complete Sale";
  } else if (actionType === "damage") {
    dom.stockActionTitle.textContent = "Report Defective Stock";
    dom.actionQtyLabel.textContent = "Defective Quantity*";
    dom.sellExtraFields.classList.add("hidden");
    dom.stockActionSubmitBtn.className = "btn btn-primary btn-danger";
    dom.stockActionSubmitBtn.textContent = "Log Defective Stock";
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

// ================= TOAST NOTIFICATIONS =================
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

  toast.innerHTML = `${icon}<span class="toast-message">${message}</span>`;
  const container = document.getElementById("toast-container");
  if (container) container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ================= UTILITIES =================
function formatTimeAgo(date) {
  if (isNaN(date.getTime())) return "recently";
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
  csvContent += "Product ID,Product Name,Category,Colour,Quantity,Unit,Price,Brand,Location,Rag Number\n";

  state.inventory.forEach(item => {
    const row = [
      item.id || item.stockId,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.colour || '').replace(/"/g, '""')}"`,
      item.quantity,
      `"${(item.unit || 'piece').replace(/"/g, '""')}"`,
      item.price !== undefined && item.price !== null ? item.price : "",
      `"${(item.brandName || '').replace(/"/g, '""')}"`,
      `"${(item.location || 'Shop').replace(/"/g, '""')}"`,
      `"${(item.ragNumber || '').replace(/"/g, '""')}"`
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

// ================= APP INITIALIZATION =================
window.addEventListener("DOMContentLoaded", init);
