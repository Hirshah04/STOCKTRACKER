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
  dbMode: "connecting",
  activeFilters: {
    product: "all",
    category: "all",
    colour: "all",
    brand: "all",
    unit: "all",
    txType: "all",
    status: "all",
    location: "all"
  },
  stagedFilters: {
    product: "all",
    category: "all",
    colour: "all",
    brand: "all",
    unit: "all",
    txType: "all",
    status: "all",
    location: "all"
  }
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
  statLowStock: document.getElementById("stat-low-stock"),
  statMinusStock: document.getElementById("stat-minus-stock"),
  cardStatUnique: document.getElementById("card-stat-unique"),
  cardStatLow: document.getElementById("card-stat-low"),
  cardStatMinus: document.getElementById("card-stat-minus"),
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
  btnOpenStockFilters: document.getElementById("btn-open-stock-filters"),
  stockFilterBadge: document.getElementById("stock-filter-badge"),
  stockFilterResultsText: document.getElementById("stock-filter-results-text"),
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
  addStockLowAlertEnabled: document.getElementById("add-stock-low-alert-enabled"),
  addStockLowThresholdGroup: document.getElementById("add-stock-low-threshold-group"),
  addStockLowThreshold: document.getElementById("add-stock-low-threshold"),

  // Dedicated Sell Stock Modal
  modalSellStock: document.getElementById("modal-sell-stock"),
  formSellStock: document.getElementById("form-sell-stock"),
  sellProductSelect: document.getElementById("sell-product-select"),
  sellColourGroup: document.getElementById("sell-colour-group"),
  sellColourSelect: document.getElementById("sell-colour-select"),
  sellColourAutoBadge: document.getElementById("sell-colour-auto-badge"),
  sellBrandGroup: document.getElementById("sell-brand-group"),
  sellBrandSelect: document.getElementById("sell-brand-select"),
  sellBrandAutoBadge: document.getElementById("sell-brand-auto-badge"),
  sellSummaryCard: document.getElementById("sell-summary-card"),
  sellAvailableQtyText: document.getElementById("sell-available-qty-text"),
  sellCategoryText: document.getElementById("sell-category-text"),
  sellQtyInput: document.getElementById("sell-qty-input"),
  sellUnitBadge: document.getElementById("sell-unit-badge"),
  sellResultingVal: document.getElementById("sell-resulting-val"),
  sellPriceInput: document.getElementById("sell-price-input"),
  sellDateInput: document.getElementById("sell-date-input"),
  sellTxTypeInput: document.getElementById("sell-tx-type-input"),
  sellBillNoGroup: document.getElementById("sell-bill-no-group"),
  sellBillNoInput: document.getElementById("sell-bill-no-input"),
  sellChallanNoGroup: document.getElementById("sell-challan-no-group"),
  sellChallanNoInput: document.getElementById("sell-challan-no-input"),
  sellNotesInput: document.getElementById("sell-notes-input"),
  sellSubmitBtn: document.getElementById("sell-submit-btn"),
  
  // Stock Action Modal (Defective Stock)
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
  actionNotes: document.getElementById("action-notes"),

  // Dashboard Modals
  modalMinusStock: document.getElementById("modal-minus-stock"),
  minusStockTableBody: document.getElementById("minus-stock-table-body"),
  modalLowStock: document.getElementById("modal-low-stock"),
  lowStockModalTableBody: document.getElementById("low-stock-modal-table-body"),
  modalUniqueProducts: document.getElementById("modal-unique-products"),
  uniqueProductsTableBody: document.getElementById("unique-products-table-body"),

  // Stock Filter Modal
  modalStockFilters: document.getElementById("modal-stock-filters"),
  modalFilterProduct: document.getElementById("modal-filter-product"),
  modalFilterCategory: document.getElementById("modal-filter-category"),
  modalFilterColour: document.getElementById("modal-filter-colour"),
  modalFilterBrand: document.getElementById("modal-filter-brand"),
  modalFilterUnit: document.getElementById("modal-filter-unit"),
  modalFilterTxType: document.getElementById("modal-filter-tx-type"),
  modalFilterStatus: document.getElementById("modal-filter-status"),
  modalFilterLocation: document.getElementById("modal-filter-location"),
  btnClearStockFilters: document.getElementById("btn-clear-stock-filters"),
  btnApplyStockFilters: document.getElementById("btn-apply-stock-filters")
};

// State variable for selected combination inside Sell Stock Modal
let currentSellCombination = {
  productId: "",
  productName: "",
  colour: "",
  brand: "",
  matchingItem: null,
  availableQty: 0,
  unit: "piece"
};

// ================= INITIALIZATION & ROUTING =================
async function init() {
  const savedSession = localStorage.getItem("stocktaker_session");
  const savedTheme = localStorage.getItem("stocktaker_theme") || "dark-theme";

  document.body.className = savedTheme;
  updateThemeUI(savedTheme);

  // Restrict all date pickers so future dates cannot be selected
  const todayStr = new Date().toISOString().split("T")[0];
  if (dom.addStockBuyDate) dom.addStockBuyDate.setAttribute("max", todayStr);
  if (dom.sellDateInput) dom.sellDateInput.setAttribute("max", todayStr);
  if (dom.filterTransactionDate) dom.filterTransactionDate.setAttribute("max", todayStr);

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
    try {
      const shopRes = await apiFetch(`/api/shops/${shopId}`);
      state.shopInfo = shopRes.data;
    } catch (e) {
      state.shopInfo = { id: shopId, name: "My Shop", phone: "", email: "" };
    }

    await loadProducts();

    const stocksRes = await apiFetch(`/api/stocks`);
    state.inventory = stocksRes.data || [];

    await fetchActivities();

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

  // Add Stock Product Dropdown Handler
  dom.addStockProductSelect.addEventListener("change", () => {
    const pId = dom.addStockProductSelect.value;
    const prod = state.products.find(p => (p.id || p.productId) === pId);
    if (prod) {
      dom.addStockCategoryDisplay.value = prod.category;
    } else {
      dom.addStockCategoryDisplay.value = "";
    }
  });

  // Add Stock Conditional Colour Dropdown
  dom.addStockColourSelect.addEventListener("change", () => {
    if (dom.addStockColourSelect.value === "Other") {
      dom.addStockCustomColourGroup.classList.remove("hidden");
    } else {
      dom.addStockCustomColourGroup.classList.add("hidden");
      dom.addStockCustomColour.value = "";
    }
  });

  // Add Stock Low Stock Alert Toggle
  if (dom.addStockLowAlertEnabled) {
    dom.addStockLowAlertEnabled.addEventListener("change", () => {
      if (dom.addStockLowAlertEnabled.value === "true") {
        dom.addStockLowThresholdGroup.classList.remove("hidden");
      } else {
        dom.addStockLowThresholdGroup.classList.add("hidden");
      }
    });
  }

  // Add Stock Transaction Type Handler
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

  // Dedicated Sell Stock Modal Event Handlers
  setupSellStockModalEvents();

  // Dashboard Stat Cards Click Handlers
  if (dom.cardStatUnique) dom.cardStatUnique.addEventListener("click", openUniqueProductsModal);
  if (dom.cardStatLow) dom.cardStatLow.addEventListener("click", openLowStockModal);
  if (dom.cardStatMinus) dom.cardStatMinus.addEventListener("click", openMinusStockModal);

  // Stock Catalog Filter Modal Buttons
  if (dom.btnOpenStockFilters) dom.btnOpenStockFilters.addEventListener("click", openStockFilterModal);
  if (dom.btnClearStockFilters) dom.btnClearStockFilters.addEventListener("click", resetStagedStockFilters);
  if (dom.btnApplyStockFilters) dom.btnApplyStockFilters.addEventListener("click", applyStockFilters);

  // Search input live filtering
  dom.inventorySearch.addEventListener("input", renderInventory);

  // Activity Log Search & Filters
  dom.transactionsSearch.addEventListener("input", renderTransactions);
  dom.filterTransactionType.addEventListener("change", () => renderTransactions());

  // Period Filter Buttons
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

    const buyDate = dom.addStockBuyDate.value;
    if (buyDate && isFutureDateString(buyDate)) {
      showToast("Buy Date cannot be in the future.", "danger");
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
    const txType = dom.addStockTxType.value;
    const billNo = dom.addStockBillNo.value.trim();
    const challanNo = dom.addStockChallanNo.value.trim();
    const location = dom.addStockLocation.value;
    const ragNumber = dom.addStockRag.value.trim();
    const lowStockAlertEnabled = dom.addStockLowAlertEnabled.value === "true";
    const lowStockThreshold = dom.addStockLowThreshold.value !== "" ? parseInt(dom.addStockLowThreshold.value, 10) : 10;

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
          ragNumber,
          lowStockAlertEnabled,
          lowStockThreshold
        }
      });

      showToast(res.message || `Stock added successfully.`, "success");
      closeModal("modal-add-stock");
      dom.formAddStock.reset();
      dom.addStockCategoryDisplay.value = "";
      dom.addStockCustomColourGroup.classList.add("hidden");
      dom.addStockBillNoGroup.classList.add("hidden");
      dom.addStockChallanNoGroup.classList.add("hidden");
      dom.addStockLowThresholdGroup.classList.add("hidden");

      await loadShopData();
    } catch (err) {
      showToast(err.message || "Failed to add stock.", "danger");
    }
  });

  // Submit Stock Action Form (Defective Stock)
  dom.formStockAction.addEventListener("submit", async (e) => {
    e.preventDefault();
    const itemId = dom.actionItemId.value;
    const qty = parseInt(dom.actionQty.value, 10);
    const notes = dom.actionNotes.value.trim();

    const item = state.inventory.find(i => i.id === itemId || i.stockId === itemId);
    if (!item) return;

    if (isNaN(qty) || qty <= 0) {
      showToast("Quantity must be greater than 0.", "warning");
      return;
    }

    try {
      const res = await apiFetch(`/api/stocks/${item.id || item.stockId}/defective`, {
        method: "POST",
        body: { quantity: qty, notes }
      });

      showToast(res.message || `Logged defective stock for "${item.name}".`, "success");
      closeModal("modal-stock-action");
      dom.formStockAction.reset();

      await loadShopData();
    } catch (err) {
      showToast(err.message || "Failed to report defective stock.", "danger");
    }
  });

  // Export CSV
  dom.exportBtn.addEventListener("click", exportInventoryToCSV);
}

function isFutureDateString(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return d > todayEnd;
}

// ================= DEDICATED SELL STOCK MODAL LOGIC =================
function setupSellStockModalEvents() {
  if (!dom.sellProductSelect) return;

  // 1. Product Selection Changed
  dom.sellProductSelect.addEventListener("change", handleSellProductChange);

  // 2. Colour Selection Changed
  dom.sellColourSelect.addEventListener("change", handleSellColourChange);

  // 3. Brand Selection Changed
  dom.sellBrandSelect.addEventListener("change", handleSellBrandChange);

  // 4. Live Quantity Preview
  dom.sellQtyInput.addEventListener("input", updateSellResultingStockPreview);

  // 5. Transaction Type Toggle
  dom.sellTxTypeInput.addEventListener("change", () => {
    const val = dom.sellTxTypeInput.value;
    if (val === "bill") {
      dom.sellBillNoGroup.classList.remove("hidden");
      dom.sellChallanNoGroup.classList.add("hidden");
      dom.sellChallanNoInput.value = "";
    } else if (val === "challan") {
      dom.sellChallanNoGroup.classList.remove("hidden");
      dom.sellBillNoGroup.classList.add("hidden");
      dom.sellBillNoInput.value = "";
    } else {
      dom.sellBillNoGroup.classList.add("hidden");
      dom.sellChallanNoGroup.classList.add("hidden");
      dom.sellBillNoInput.value = "";
      dom.sellChallanNoInput.value = "";
    }
  });

  // 6. Form Submit Handler
  dom.formSellStock.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentSellCombination.productId) {
      showToast("Please select a product first.", "warning");
      return;
    }

    const sellQty = parseInt(dom.sellQtyInput.value, 10);
    if (isNaN(sellQty) || sellQty <= 0) {
      showToast("Selling quantity must be a positive number greater than 0.", "warning");
      return;
    }

    const saleDate = dom.sellDateInput.value;
    if (saleDate && isFutureDateString(saleDate)) {
      showToast("Sale Date cannot be in the future.", "danger");
      return;
    }

    const priceVal = dom.sellPriceInput.value !== "" ? parseFloat(dom.sellPriceInput.value) : null;
    const txType = dom.sellTxTypeInput.value;
    const billNo = dom.sellBillNoInput.value.trim();
    const challanNo = dom.sellChallanNoInput.value.trim();
    const notes = dom.sellNotesInput.value.trim();

    // Determine target stock item ID
    let targetStockId = currentSellCombination.matchingItem ? (currentSellCombination.matchingItem.id || currentSellCombination.matchingItem.stockId) : null;

    if (!targetStockId) {
      showToast("No stock record found for the selected combination.", "warning");
      return;
    }

    try {
      const res = await apiFetch(`/api/stocks/${targetStockId}/sell`, {
        method: "POST",
        body: {
          quantity: sellQty,
          price: priceVal,
          saleDate,
          brandName: currentSellCombination.brand,
          colour: currentSellCombination.colour,
          transactionType: txType,
          billNo,
          challanNo,
          notes
        }
      });

      showToast(res.message || `Sale recorded successfully!`, "success");
      closeModal("modal-sell-stock");
      dom.formSellStock.reset();

      await loadShopData();
    } catch (err) {
      showToast(err.message || "Failed to process sale.", "danger");
    }
  });
}

// Open Sell Stock Modal with empty default product selection (Req 1)
window.openSellStockModal = function(preselectedProductId = null) {
  dom.formSellStock.reset();

  const todayStr = new Date().toISOString().split("T")[0];
  dom.sellDateInput.value = todayStr;
  dom.sellDateInput.setAttribute("max", todayStr);

  dom.sellColourGroup.classList.add("hidden");
  dom.sellBrandGroup.classList.add("hidden");
  dom.sellSummaryCard.classList.add("hidden");
  dom.sellBillNoGroup.classList.add("hidden");
  dom.sellChallanNoGroup.classList.add("hidden");

  currentSellCombination = {
    productId: "",
    productName: "",
    colour: "",
    brand: "",
    matchingItem: null,
    availableQty: 0,
    unit: "piece"
  };

  // Populate Product Dropdown with master products / inventory products
  dom.sellProductSelect.innerHTML = `<option value="">Select Product</option>`;
  
  // Aggregate distinct products from Master Products or Inventory
  const productMap = new Map();
  state.products.forEach(p => {
    const id = p.id || p.productId;
    productMap.set(id, { id, name: p.name, category: p.category });
  });
  state.inventory.forEach(i => {
    const id = i.productId || i.id;
    if (!productMap.has(id)) {
      productMap.set(id, { id, name: i.name, category: i.category });
    }
  });

  Array.from(productMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.category})`;
      dom.sellProductSelect.appendChild(opt);
    });

  // Requirement 1: Latest product is NOT automatically selected! Default state is "Select Product"
  if (preselectedProductId && productMap.has(preselectedProductId)) {
    dom.sellProductSelect.value = preselectedProductId;
    handleSellProductChange();
  } else {
    dom.sellProductSelect.value = "";
  }

  openModal("modal-sell-stock");
};

function handleSellProductChange() {
  const pId = dom.sellProductSelect.value;
  if (!pId) {
    dom.sellColourGroup.classList.add("hidden");
    dom.sellBrandGroup.classList.add("hidden");
    dom.sellSummaryCard.classList.add("hidden");
    currentSellCombination = { productId: "", productName: "", colour: "", brand: "", matchingItem: null, availableQty: 0, unit: "piece" };
    return;
  }

  const matchingStocks = state.inventory.filter(i => (i.productId || i.id) === pId || i.name.toLowerCase() === pId.toLowerCase());
  const prodObj = state.products.find(p => (p.id || p.productId) === pId) || matchingStocks[0];

  currentSellCombination.productId = pId;
  currentSellCombination.productName = prodObj ? prodObj.name : "Product";
  dom.sellCategoryText.textContent = prodObj ? prodObj.category : "-";

  // Requirement 2: Check available Colours
  const distinctColours = [...new Set(matchingStocks.map(i => (i.colour || "").trim()).filter(Boolean))];

  dom.sellColourSelect.innerHTML = `<option value="">Select Colour</option>`;
  if (distinctColours.length === 1) {
    // 1 Colour -> Auto Select
    const singleColour = distinctColours[0];
    const opt = document.createElement("option");
    opt.value = singleColour;
    opt.textContent = singleColour;
    opt.selected = true;
    dom.sellColourSelect.appendChild(opt);

    dom.sellColourGroup.classList.remove("hidden");
    dom.sellColourAutoBadge.classList.remove("hidden");
    dom.sellColourAutoBadge.textContent = `Auto-Selected: ${singleColour}`;
    currentSellCombination.colour = singleColour;
  } else if (distinctColours.length > 1) {
    // Multiple Colours -> Show dropdown
    distinctColours.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      dom.sellColourSelect.appendChild(opt);
    });
    dom.sellColourGroup.classList.remove("hidden");
    dom.sellColourAutoBadge.classList.add("hidden");
    currentSellCombination.colour = "";
  } else {
    // No colour recorded -> Optional
    dom.sellColourGroup.classList.add("hidden");
    currentSellCombination.colour = "";
  }

  handleSellColourChange();
}

function handleSellColourChange() {
  const pId = currentSellCombination.productId;
  if (!pId) return;

  const selectedCol = dom.sellColourGroup.classList.contains("hidden") ? "" : dom.sellColourSelect.value;
  currentSellCombination.colour = selectedCol;

  const matchingStocks = state.inventory.filter(i => {
    const pMatch = (i.productId || i.id) === pId || i.name.toLowerCase() === pId.toLowerCase();
    const cMatch = !selectedCol || (i.colour || "").toLowerCase() === selectedCol.toLowerCase();
    return pMatch && cMatch;
  });

  // Requirement 3: Check available Brands
  const distinctBrands = [...new Set(matchingStocks.map(i => (i.brandName || "").trim()).filter(Boolean))];

  dom.sellBrandSelect.innerHTML = `<option value="">Select Brand</option>`;
  if (distinctBrands.length === 1) {
    // 1 Brand -> Auto Select
    const singleBrand = distinctBrands[0];
    const opt = document.createElement("option");
    opt.value = singleBrand;
    opt.textContent = singleBrand;
    opt.selected = true;
    dom.sellBrandSelect.appendChild(opt);

    dom.sellBrandGroup.classList.remove("hidden");
    dom.sellBrandAutoBadge.classList.remove("hidden");
    dom.sellBrandAutoBadge.textContent = `Auto-Selected: ${singleBrand}`;
    currentSellCombination.brand = singleBrand;
  } else if (distinctBrands.length > 1) {
    // Multiple Brands -> Show dropdown
    distinctBrands.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      dom.sellBrandSelect.appendChild(opt);
    });
    dom.sellBrandGroup.classList.remove("hidden");
    dom.sellBrandAutoBadge.classList.add("hidden");
    currentSellCombination.brand = "";
  } else {
    dom.sellBrandGroup.classList.add("hidden");
    currentSellCombination.brand = "";
  }

  handleSellBrandChange();
}

function handleSellBrandChange() {
  const pId = currentSellCombination.productId;
  if (!pId) return;

  const selectedCol = currentSellCombination.colour;
  const selectedBrand = dom.sellBrandGroup.classList.contains("hidden") ? "" : dom.sellBrandSelect.value;
  currentSellCombination.brand = selectedBrand;

  // Find exact matching stock item
  const matchingItem = state.inventory.find(i => {
    const pMatch = (i.productId || i.id) === pId || i.name.toLowerCase() === pId.toLowerCase();
    const cMatch = !selectedCol || (i.colour || "").toLowerCase() === selectedCol.toLowerCase();
    const bMatch = !selectedBrand || (i.brandName || "").toLowerCase() === selectedBrand.toLowerCase();
    return pMatch && cMatch && bMatch;
  }) || state.inventory.find(i => (i.productId || i.id) === pId);

  if (matchingItem) {
    currentSellCombination.matchingItem = matchingItem;
    currentSellCombination.availableQty = matchingItem.quantity;
    currentSellCombination.unit = matchingItem.unit || "piece";

    const unitText = (matchingItem.unit || "piece").toUpperCase();
    dom.sellAvailableQtyText.textContent = `${matchingItem.quantity} ${unitText}`;
    dom.sellUnitBadge.textContent = unitText;
    dom.sellSummaryCard.classList.remove("hidden");
  } else {
    currentSellCombination.matchingItem = null;
    currentSellCombination.availableQty = 0;
    currentSellCombination.unit = "piece";
    dom.sellAvailableQtyText.textContent = `0 Piece`;
    dom.sellUnitBadge.textContent = "Piece";
    dom.sellSummaryCard.classList.remove("hidden");
  }

  updateSellResultingStockPreview();
}

// Requirements 5, 6, 29: Live Quantity Calculation Preview allowing Negative Stock
function updateSellResultingStockPreview() {
  const sellQty = parseInt(dom.sellQtyInput.value, 10) || 0;
  const available = currentSellCombination.availableQty;
  const unitText = (currentSellCombination.unit || "piece").toUpperCase();

  const resultingStock = available - sellQty;
  dom.sellResultingVal.textContent = `${resultingStock} ${unitText}${resultingStock < 0 ? ' (Minus Stock)' : ''}`;

  if (resultingStock < 0) {
    dom.sellResultingVal.className = "summary-value text-danger";
  } else {
    dom.sellResultingVal.className = "summary-value text-success";
  }
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

// 1. Dashboard Tab (Requirements 7, 11, 13, 16, 17, 18, 19, 20)
function renderDashboard() {
  const user = state.currentUser;
  if (!user) return;

  dom.welcomeName.textContent = user.username.toUpperCase();

  // Requirement 16 & 17: Unique Products Count (Distinct product names)
  const uniqueProductsSet = new Set(state.products.map(p => p.name.trim().toLowerCase()));
  state.inventory.forEach(i => uniqueProductsSet.add((i.name || "").trim().toLowerCase()));
  const uniqueProductsCount = uniqueProductsSet.size;

  // Available Stock sum
  const totalStockQuantity = state.inventory.reduce((sum, item) => sum + item.quantity, 0);

  // Requirement 9, 10, 11, 13: Low Stock items (lowStockAlertEnabled && quantity <= threshold, including negative stock)
  const lowStockItems = state.inventory.filter(item => {
    const isAlertOn = item.lowStockAlertEnabled === true || item.lowStockAlertEnabled === "true";
    const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : (item.minStock || 5);
    return isAlertOn && item.quantity <= threshold;
  });
  const lowStockCount = lowStockItems.length;

  // Requirement 6, 7, 19: Minus Stock items (quantity < 0)
  const minusStockItems = state.inventory.filter(item => item.quantity < 0);
  const minusStockCount = minusStockItems.length;

  dom.statTotalItems.textContent = uniqueProductsCount;
  dom.statTotalQty.textContent = totalStockQuantity;
  dom.statLowStock.textContent = lowStockCount;
  dom.statMinusStock.textContent = minusStockCount;

  // Low Stock Warnings Widget
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
      const badgeClass = item.quantity < 0 ? "badge-rose" : "badge-low";
      const unitText = (item.unit || "piece").toUpperCase();
      const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : (item.minStock || 5);

      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
        <div class="item-main">
          <div class="item-info">
            <span class="item-title">${item.name} <span class="colour-pill"><span class="colour-dot"></span>${item.colour || 'N/A'}</span></span>
            <span class="item-subtitle">${item.category} ${item.brandName ? `• ${item.brandName}` : ''}</span>
          </div>
        </div>
        <div class="item-meta">
          <span class="badge ${badgeClass}">${item.quantity} ${unitText} (Alert at ${threshold})</span>
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

  // Quick Action Bar (Requirement 1: Sell Stock opens Sell Stock modal with Product Dropdown!)
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
      <button class="btn btn-outline" onclick="openSellStockModal()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        <span>Sell Stock</span>
      </button>
    `;
  } else {
    dom.quickActionsBar.innerHTML = `
      <button class="btn btn-primary" onclick="openSellStockModal()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        <span>Sell Stock</span>
      </button>
    `;
  }
}

// Requirement 8: Minus Stock Modal
function openMinusStockModal() {
  const minusStockItems = state.inventory
    .filter(item => item.quantity < 0)
    .sort((a, b) => a.quantity - b.quantity); // Most negative first

  dom.minusStockTableBody.innerHTML = "";

  if (minusStockItems.length === 0) {
    dom.minusStockTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 30px 0; color: var(--text-muted);">
          No products currently in minus stock.
        </td>
      </tr>
    `;
  } else {
    minusStockItems.forEach(item => {
      const tr = document.createElement("tr");
      const unitText = (item.unit || "piece").toUpperCase();
      tr.innerHTML = `
        <td data-label="Product Name"><strong>${item.name}</strong> ${item.category ? `<span class="text-muted">(${item.category})</span>` : ''}</td>
        <td data-label="Colour"><span class="colour-pill"><span class="colour-dot"></span>${item.colour || 'N/A'}</span></td>
        <td data-label="Brand">${item.brandName || '-'}</td>
        <td data-label="Current Stock"><strong class="text-danger">${item.quantity} ${unitText}</strong></td>
        <td data-label="Unit"><code>${unitText}</code></td>
      `;
      dom.minusStockTableBody.appendChild(tr);
    });
  }

  openModal("modal-minus-stock");
}

// Requirement 12: Low Stock Modal
function openLowStockModal() {
  const lowStockItems = state.inventory.filter(item => {
    const isAlertOn = item.lowStockAlertEnabled === true || item.lowStockAlertEnabled === "true";
    const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : (item.minStock || 5);
    return isAlertOn && item.quantity <= threshold;
  });

  dom.lowStockModalTableBody.innerHTML = "";

  if (lowStockItems.length === 0) {
    dom.lowStockModalTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 30px 0; color: var(--text-muted);">
          No products currently below low stock threshold.
        </td>
      </tr>
    `;
  } else {
    lowStockItems.forEach(item => {
      const tr = document.createElement("tr");
      const unitText = (item.unit || "piece").toUpperCase();
      const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : (item.minStock || 5);
      const isMinus = item.quantity < 0;

      tr.innerHTML = `
        <td data-label="Product Name"><strong>${item.name}</strong> ${item.category ? `<span class="text-muted">(${item.category})</span>` : ''}</td>
        <td data-label="Available Stock"><strong class="${isMinus ? 'text-danger' : 'text-warning'}">${item.quantity} ${unitText}</strong></td>
        <td data-label="Low Stock Threshold"><code>${threshold} ${unitText}</code></td>
        <td data-label="Colour"><span class="colour-pill"><span class="colour-dot"></span>${item.colour || 'N/A'}</span></td>
        <td data-label="Brand">${item.brandName || '-'}</td>
      `;
      dom.lowStockModalTableBody.appendChild(tr);
    });
  }

  openModal("modal-low-stock");
}

// Requirement 16 & 17: Unique Products Summary Modal
function openUniqueProductsModal() {
  // Group stock quantities by Product Name AND Unit (Req 17: Do not combine quantities of different units incorrectly)
  const productGroupMap = new Map();

  state.inventory.forEach(item => {
    const name = item.name.trim();
    const unit = (item.unit || "piece").toLowerCase();
    const key = `${name}___${unit}`;

    if (!productGroupMap.has(key)) {
      productGroupMap.set(key, {
        name,
        unit,
        totalQty: 0,
        colours: new Set(),
        brands: new Set()
      });
    }

    const group = productGroupMap.get(key);
    group.totalQty += item.quantity;
    if (item.colour && item.colour !== "N/A") group.colours.add(item.colour);
    if (item.brandName) group.brands.add(item.brandName);
  });

  // Also include master products with 0 stock if not in inventory
  state.products.forEach(p => {
    const name = p.name.trim();
    const exists = Array.from(productGroupMap.values()).some(g => g.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const key = `${name}___piece`;
      productGroupMap.set(key, {
        name,
        unit: "piece",
        totalQty: 0,
        colours: new Set(),
        brands: new Set()
      });
    }
  });

  const uniqueList = Array.from(productGroupMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  dom.uniqueProductsTableBody.innerHTML = "";

  if (uniqueList.length === 0) {
    dom.uniqueProductsTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 30px 0; color: var(--text-muted);">
          No products created yet.
        </td>
      </tr>
    `;
  } else {
    uniqueList.forEach(p => {
      const tr = document.createElement("tr");
      const unitText = p.unit.toUpperCase();
      const coloursList = Array.from(p.colours).join(", ") || "N/A";
      const brandsList = Array.from(p.brands).join(", ") || "-";

      tr.innerHTML = `
        <td data-label="Product Name"><strong>${p.name}</strong></td>
        <td data-label="Available Stock"><strong class="${p.totalQty < 0 ? 'text-danger' : 'text-success'}">${p.totalQty} ${unitText}</strong></td>
        <td data-label="Unit"><code>${unitText}</code></td>
        <td data-label="Variants / Details"><span class="text-muted">Colours: ${coloursList} | Brands: ${brandsList}</span></td>
      `;
      dom.uniqueProductsTableBody.appendChild(tr);
    });
  }

  openModal("modal-unique-products");
}

// 2. Inventory Tab / Stock Catalog (Requirements 21-26)
function renderInventory() {
  const user = state.currentUser;
  if (!user) return;

  const searchQuery = dom.inventorySearch.value.toLowerCase().trim();
  const filters = state.activeFilters;

  // Filter logic implementing multi-condition AND matching (Req 25, 26)
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

    const matchesProduct = filters.product === "all" || (item.productId || item.id) === filters.product || item.name === filters.product;
    const matchesCategory = filters.category === "all" || item.category === filters.category;
    const matchesColour = filters.colour === "all" || (item.colour && item.colour.toLowerCase() === filters.colour.toLowerCase());
    const matchesBrand = filters.brand === "all" || (item.brandName && item.brandName.toLowerCase() === filters.brand.toLowerCase());
    const matchesUnit = filters.unit === "all" || (item.unit && item.unit.toLowerCase() === filters.unit.toLowerCase());
    const matchesLocation = filters.location === "all" || (item.location || "Shop") === filters.location;
    const matchesTxType = filters.txType === "all" || (item.transactionType && item.transactionType.toLowerCase() === filters.txType.toLowerCase());

    let matchesStatus = true;
    if (filters.status === "in-stock") matchesStatus = item.quantity > (item.lowStockThreshold || item.minStock || 5);
    else if (filters.status === "low-stock") {
      const isAlertOn = item.lowStockAlertEnabled === true || item.lowStockAlertEnabled === "true";
      const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : (item.minStock || 5);
      matchesStatus = isAlertOn && item.quantity <= threshold;
    }
    else if (filters.status === "minus-stock") matchesStatus = item.quantity < 0;
    else if (filters.status === "out-of-stock") matchesStatus = item.quantity === 0;

    return matchesSearch && matchesProduct && matchesCategory && matchesColour && matchesBrand && matchesUnit && matchesLocation && matchesTxType && matchesStatus;
  });

  // Requirement 25: Display result count
  const activeFilterCount = Object.values(filters).filter(v => v !== "all").length;
  if (dom.stockFilterBadge) {
    if (activeFilterCount > 0) {
      dom.stockFilterBadge.textContent = activeFilterCount;
      dom.stockFilterBadge.classList.remove("hidden");
    } else {
      dom.stockFilterBadge.classList.add("hidden");
    }
  }

  if (dom.stockFilterResultsText) {
    dom.stockFilterResultsText.textContent = `Showing: ${filteredInventory.length} matching product${filteredInventory.length !== 1 ? 's' : ''} (from ${state.inventory.length} total)`;
  }

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

    if (item.quantity < 0) {
      statusClass = "badge-rose";
      statusText = "Minus Stock";
    } else if (item.quantity === 0) {
      statusClass = "badge-rose";
      statusText = "Out of Stock";
    } else if (item.lowStockAlertEnabled && item.quantity <= (item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5)) {
      statusClass = "badge-low";
      statusText = "Low Stock";
    }

    const itemId = item.id || item.stockId;
    const unitDisplay = (item.unit || "piece").charAt(0).toUpperCase() + (item.unit || "piece").slice(1);
    const priceDisplay = item.price !== undefined && item.price !== null && item.price !== "" ? `₹${item.price}` : "-";

    let actionButtons = "";
    if (user.role === "owner") {
      actionButtons = `
        <button class="btn-action-icon" title="Sell Stock" onclick="openSellStockModal('${item.productId || item.id}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg>
        </button>
        <button class="btn-action-icon" title="Report Defective" onclick="openStockActionModal('${itemId}', 'damage')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
        </button>
        <button class="btn-action-icon text-danger" title="Delete Product" onclick="deleteProduct('${itemId}')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;
    } else {
      actionButtons = `
        <button class="btn-action-icon" title="Sell Stock" onclick="openSellStockModal('${item.productId || item.id}')">
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
      <td data-label="Quantity & Unit"><strong class="${item.quantity < 0 ? 'text-danger' : ''}">${item.quantity} ${unitDisplay}</strong></td>
      <td data-label="Price"><strong>${priceDisplay}</strong></td>
      <td data-label="Status"><span class="badge ${statusClass}">${statusText}</span></td>
      <td data-label="Actions" class="table-actions-cell"><div class="table-actions">${actionButtons}</div></td>
    `;
    dom.inventoryTableBody.appendChild(tr);
  });
}

// Requirements 22, 23, 24: Stock Catalog Filter Modal Logic
function openStockFilterModal() {
  if (!dom.modalStockFilters) return;

  // Populate filter dropdowns from actual inventory data
  const products = [...new Set(state.inventory.map(i => i.name).filter(Boolean))];
  const categories = [...new Set(state.inventory.map(i => i.category).filter(Boolean))];
  const colours = [...new Set(state.inventory.map(i => i.colour).filter(Boolean))];
  const brands = [...new Set(state.inventory.map(i => i.brandName).filter(Boolean))];

  populateDropdown(dom.modalFilterProduct, products, "All Products");
  populateDropdown(dom.modalFilterCategory, categories, "All Categories");
  populateDropdown(dom.modalFilterColour, colours, "All Colours");
  populateDropdown(dom.modalFilterBrand, brands, "All Brands");

  // Sync select values with current active filters
  dom.modalFilterProduct.value = state.activeFilters.product;
  dom.modalFilterCategory.value = state.activeFilters.category;
  dom.modalFilterColour.value = state.activeFilters.colour;
  dom.modalFilterBrand.value = state.activeFilters.brand;
  dom.modalFilterUnit.value = state.activeFilters.unit;
  dom.modalFilterTxType.value = state.activeFilters.txType;
  dom.modalFilterStatus.value = state.activeFilters.status;
  dom.modalFilterLocation.value = state.activeFilters.location;

  openModal("modal-stock-filters");
}

function populateDropdown(selectEl, itemsArray, defaultLabel) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="all">${defaultLabel}</option>`;
  itemsArray.sort().forEach(item => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    selectEl.appendChild(opt);
  });
}

function resetStagedStockFilters() {
  if (dom.modalFilterProduct) dom.modalFilterProduct.value = "all";
  if (dom.modalFilterCategory) dom.modalFilterCategory.value = "all";
  if (dom.modalFilterColour) dom.modalFilterColour.value = "all";
  if (dom.modalFilterBrand) dom.modalFilterBrand.value = "all";
  if (dom.modalFilterUnit) dom.modalFilterUnit.value = "all";
  if (dom.modalFilterTxType) dom.modalFilterTxType.value = "all";
  if (dom.modalFilterStatus) dom.modalFilterStatus.value = "all";
  if (dom.modalFilterLocation) dom.modalFilterLocation.value = "all";
}

function applyStockFilters() {
  state.activeFilters = {
    product: dom.modalFilterProduct ? dom.modalFilterProduct.value : "all",
    category: dom.modalFilterCategory ? dom.modalFilterCategory.value : "all",
    colour: dom.modalFilterColour ? dom.modalFilterColour.value : "all",
    brand: dom.modalFilterBrand ? dom.modalFilterBrand.value : "all",
    unit: dom.modalFilterUnit ? dom.modalFilterUnit.value : "all",
    txType: dom.modalFilterTxType ? dom.modalFilterTxType.value : "all",
    status: dom.modalFilterStatus ? dom.modalFilterStatus.value : "all",
    location: dom.modalFilterLocation ? dom.modalFilterLocation.value : "all"
  };

  closeModal("modal-stock-filters");
  renderInventory();
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
  dom.addStockLowThresholdGroup.classList.add("hidden");

  const todayStr = new Date().toISOString().split("T")[0];
  if (dom.addStockBuyDate) dom.addStockBuyDate.setAttribute("max", todayStr);

  populateAddStockProductDropdown();

  if (state.products.length === 0) {
    showToast("Please add at least one product to master list first.", "info");
    openAddProductModal();
    return;
  }

  openModal("modal-add-stock");
};

window.openStockActionModal = function(itemId, actionType) {
  if (actionType === "sell") {
    // Open dedicated sell stock modal!
    const item = state.inventory.find(i => i.id === itemId || i.stockId === itemId);
    const pId = item ? (item.productId || item.id) : null;
    openSellStockModal(pId);
    return;
  }

  // Handle damage/defective action
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
  dom.actionQtyError.classList.add("hidden");
  dom.actionRemainingVal.textContent = `${item.quantity} ${unitText}`;

  const locVal = item.location || "Shop";
  const ragVal = item.ragNumber ? ` (Rag: ${item.ragNumber})` : "";
  if (dom.actionStorageLocation) dom.actionStorageLocation.textContent = `${locVal}${ragVal}`;

  dom.formStockAction.reset();
  dom.actionItemId.value = item.id || item.stockId;
  dom.actionType.value = actionType;

  dom.stockActionTitle.textContent = "Report Defective Stock";
  dom.actionQtyLabel.textContent = "Defective Quantity*";

  openModal("modal-stock-action");
};

function openModal(modalId) {
  dom.modalBackdrop.classList.remove("hidden");
  const el = document.getElementById(modalId);
  if (el) el.classList.remove("hidden");
}

window.closeModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add("hidden");
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
