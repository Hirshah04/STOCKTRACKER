// ================= STATE & API CLIENT =================
let state = {
  currentUser: null,
  shopInfo: null,
  users: [],
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
  migrationBanner: document.getElementById("migration-banner"),
  migrateBtn: document.getElementById("migrate-btn"),
  
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
  addStockColour: document.getElementById("add-stock-colour"),
  addStockUnit: document.getElementById("add-stock-unit"),
  addStockQty: document.getElementById("add-stock-qty"),
  addStockNotes: document.getElementById("add-stock-notes"),
  addStockLocation: document.getElementById("add-stock-location"),
  addStockRag: document.getElementById("add-stock-rag"),
  newProductFields: document.getElementById("new-product-fields"),
  newProdCategory: document.getElementById("new-prod-category"),
  newProdMin: document.getElementById("new-prod-min"),
  productNamesDatalist: document.getElementById("product-names-datalist"),
  categorySuggestions: document.getElementById("category-suggestions"),
  
  // Stock Action Modal (Sell, Damage, Remove)
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
  checkLocalStorageMigrationNeed();

  if (savedSession) {
    try {
      state.currentUser = JSON.parse(savedSession);
      await loadShopData();
      showAppLayout();
    } catch (e) {
      console.error("Failed to load session:", e);
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

    // 2. Fetch Stocks
    const stocksRes = await apiFetch(`/api/stocks?shopId=${shopId}`);
    state.inventory = stocksRes.data || [];

    // 3. Fetch Activities
    await fetchActivities();

    // 4. Fetch Staff if Owner
    if (state.currentUser.role === "owner") {
      try {
        const usersRes = await apiFetch(`/api/users?shopId=${shopId}`);
        state.users = usersRes.data || [];
      } catch (e) {
        state.users = [];
      }
    }

    renderAll();
  } catch (e) {
    showToast("Failed to load data from database. " + e.message, "danger");
  }
}

async function fetchActivities() {
  if (!state.currentUser) return;
  const shopId = state.currentUser.shopId;

  let query = `?shopId=${shopId}&sort=${state.sortOrder}`;
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
  const shopEmail = state.shopInfo ? state.shopInfo.email : "Not Registered";

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
    if (dom.clearLogsBtn) dom.clearLogsBtn.style.display = "inline-flex";
  } else {
    ownerElements.forEach(el => el.classList.add("hidden"));
    if (dom.clearLogsBtn) dom.clearLogsBtn.style.display = "none";
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

      state.currentUser = res.data.user;
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
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: { shopName, phone, email, ownerUsername, ownerPassword }
      });

      showToast("Shop registered successfully! Please sign in.", "success");
      showAuthScreen();
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
        state.activeDate = ""; // Clear specific date picker if period pill clicked
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
        // Deactivate period pills
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
      // Re-activate 'All' period
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

  // Activity Log Sort Toggle (Newest <-> Oldest)
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
        body: { username, password, shopId: state.currentUser.shopId }
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

  // Add Stock Datalist Autocomplete
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

  // Submit Add Stock Form
  dom.formAddStock.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = dom.addStockName.value.trim();
    const colour = dom.addStockColour.value.trim() || "N/A";
    const unit = dom.addStockUnit.value.toLowerCase();
    const qty = parseInt(dom.addStockQty.value, 10);
    const notes = dom.addStockNotes.value.trim();
    const location = dom.addStockLocation.value;
    const ragNumber = dom.addStockRag.value.trim();
    const category = dom.newProdCategory.value.trim() || "General";
    const minStock = parseInt(dom.newProdMin.value, 10) || 5;

    if (qty <= 0) {
      showToast("Quantity must be greater than 0.", "warning");
      return;
    }

    try {
      const res = await apiFetch("/api/stocks", {
        method: "POST",
        body: {
          shopId: state.currentUser.shopId,
          name,
          category,
          colour,
          quantity: qty,
          unit,
          location,
          ragNumber,
          minStock,
          notes,
          user: state.currentUser.username
        }
      });

      showToast(res.message || `Added ${qty} ${unit.toUpperCase()} of "${name}".`, "success");
      closeModal("modal-add-stock");
      dom.formAddStock.reset();
      dom.newProductFields.classList.add("hidden");

      await loadShopData();
    } catch (err) {
      showToast(err.message || "Failed to add stock.", "danger");
    }
  });

  // Submit Stock Action Form (Sell, Damage, Remove)
  dom.formStockAction.addEventListener("submit", async (e) => {
    e.preventDefault();
    const itemId = dom.actionItemId.value;
    const type = dom.actionType.value;
    const qty = parseInt(dom.actionQty.value, 10);
    const notes = dom.actionNotes.value.trim();

    const item = state.inventory.find(i => i.id === itemId || i.stockId === itemId);
    if (!item) return;

    if (qty <= 0) {
      showToast("Quantity must be greater than 0.", "warning");
      return;
    }
    if (qty > item.quantity) {
      showToast(`Cannot exceed available stock level (${item.quantity} ${item.unit.toUpperCase()}).`, "danger");
      return;
    }

    try {
      let endpoint = `/api/stocks/${item.id || item.stockId}/sell`;
      if (type === "damage") endpoint = `/api/stocks/${item.id || item.stockId}/defective`;
      else if (type === "remove") endpoint = `/api/stocks/${item.id || item.stockId}/defective`;

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: {
          quantity: qty,
          notes,
          user: state.currentUser.username
        }
      });

      showToast(res.message || `Stock action recorded for "${item.name}".`, "success");
      closeModal("modal-stock-action");
      dom.formStockAction.reset();

      await loadShopData();
    } catch (err) {
      showToast(err.message || "Failed to process stock action.", "danger");
    }
  });

  // Live Quantity Preview inside Sell/Damage Modal
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

  // Clear Logs
  dom.clearLogsBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all activity logs?")) {
      state.transactions = [];
      renderTransactions();
      showToast("Activity logs cleared locally.", "info");
    }
  });

  // Local Storage Data Migration Button Handler
  if (dom.migrateBtn) {
    dom.migrateBtn.addEventListener("click", async () => {
      try {
        const localShops = JSON.parse(localStorage.getItem("stocktaker_shops") || "[]");
        const localUsers = JSON.parse(localStorage.getItem("stocktaker_users") || "[]");
        let localInventory = [];
        let localTransactions = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith("stocktaker_inventory_")) {
            const items = JSON.parse(localStorage.getItem(key) || "[]");
            const sId = key.replace("stocktaker_inventory_", "");
            items.forEach(it => { if (!it.shopId) it.shopId = sId; });
            localInventory = localInventory.concat(items);
          }
          if (key.startsWith("stocktaker_transactions_")) {
            const txs = JSON.parse(localStorage.getItem(key) || "[]");
            const sId = key.replace("stocktaker_transactions_", "");
            txs.forEach(t => { if (!t.shopId) t.shopId = sId; });
            localTransactions = localTransactions.concat(txs);
          }
        }

        const res = await apiFetch("/api/migrate", {
          method: "POST",
          body: {
            shops: localShops,
            users: localUsers,
            inventory: localInventory,
            transactions: localTransactions,
            shopId: state.currentUser ? state.currentUser.shopId : null
          }
        });

        showToast(res.message || "LocalStorage data migrated to database!", "success");
        if (dom.migrationBanner) dom.migrationBanner.classList.add("hidden");
        await loadShopData();
      } catch (err) {
        showToast("Migration failed: " + err.message, "danger");
      }
    });
  }
}

function checkLocalStorageMigrationNeed() {
  const hasLocalShops = localStorage.getItem("stocktaker_shops");
  const hasLocalUsers = localStorage.getItem("stocktaker_users");
  let hasLocalInv = false;

  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).startsWith("stocktaker_inventory_")) {
      hasLocalInv = true;
      break;
    }
  }

  if ((hasLocalShops || hasLocalUsers || hasLocalInv) && dom.migrationBanner) {
    dom.migrationBanner.classList.remove("hidden");
  }
}

// ================= BUSINESS FUNCTIONS =================
window.deleteProduct = async function(id) {
  const item = state.inventory.find(i => i.id === id || i.stockId === id);
  if (!item) return;

  if (confirm(`Delete "${item.name}" from the catalog? This removes the item entirely.`)) {
    try {
      await apiFetch(`/api/stocks/${item.id || item.stockId}?user=${state.currentUser.username}`, {
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
  if (username === "owner") return;
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
      const isOut = item.quantity === 0;
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
      else if (tx.type === "add") { badgeClass = "badge-violet"; prefix = "+"; }
      else if (tx.type === "damage") { badgeClass = "badge-rose"; prefix = "-"; }
      else if (tx.type === "remove") { badgeClass = "badge-rose"; prefix = "-"; }

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

  // Datlists
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

  // Multi-Field Search (Name, Category, Colour) & Filters
  const filteredInventory = state.inventory.filter(item => {
    const nameStr = (item.name || "").toLowerCase();
    const catStr = (item.category || "").toLowerCase();
    const colStr = (item.colour || "").toLowerCase();

    const matchesSearch = !searchQuery || 
                          nameStr.includes(searchQuery) || 
                          catStr.includes(searchQuery) ||
                          colStr.includes(searchQuery);

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
        <td colspan="6" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
          No products found matching your search or filters.
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
        <div class="product-storage-info">
          <span class="storage-location-badge location-${(item.location || 'Shop').toLowerCase()}">${item.location || 'Shop'}</span>
          ${item.ragNumber ? `<span class="storage-rag-badge">Rag: ${item.ragNumber}</span>` : ''}
        </div>
      </td>
      <td data-label="Category"><span class="text-muted">${item.category}</span></td>
      <td data-label="Colour"><span class="colour-pill"><span class="colour-dot"></span>${item.colour || 'N/A'}</span></td>
      <td data-label="Quantity & Unit"><strong>${item.quantity} ${unitDisplay}</strong> <span class="text-muted" style="font-size: 11px;">(min ${item.minStock})</span></td>
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

    const matchesSearch = !searchQuery || 
                          nameStr.includes(searchQuery) ||
                          colourStr.includes(searchQuery) ||
                          userStr.includes(searchQuery) ||
                          notesStr.includes(searchQuery);

    const matchesType = selectedType === "all" || tx.type === selectedType;
    return matchesSearch && matchesType;
  });

  dom.transactionsTableBody.innerHTML = "";

  if (filteredTxs.length === 0) {
    dom.transactionsTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px 0; color: var(--text-muted);">
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
    else if (tx.type === "add") { badgeClass = "badge-violet"; prefix = "+"; }
    else if (tx.type === "damage") { badgeClass = "badge-rose"; prefix = "-"; }
    else if (tx.type === "remove") { badgeClass = "badge-rose"; prefix = "-"; }

    const formattedDate = new Date(tx.timestamp).toLocaleString("en-US", {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const unitText = (tx.unit || "piece").toUpperCase();
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td data-label="Timestamp"><span class="text-muted" style="font-size: 12px;">${formattedDate}</span></td>
      <td data-label="Product & Colour">
        <strong>${tx.itemName}</strong>
        <span class="colour-pill" style="margin-left: 6px;"><span class="colour-dot"></span>${tx.colour || 'N/A'}</span>
        ${tx.notes ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${tx.notes}</div>` : ""}
      </td>
      <td data-label="Activity Type"><span class="badge ${badgeClass}">${tx.type}</span></td>
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
window.openAddStockModal = function() {
  dom.newProductFields.classList.add("hidden");
  dom.formAddStock.reset();
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

  if (actionType === "sell") {
    dom.stockActionTitle.textContent = "Sell Stock";
    dom.actionQtyLabel.textContent = "Selling Quantity";
    dom.stockActionSubmitBtn.className = "btn btn-primary";
    dom.stockActionSubmitBtn.textContent = "Complete Sale";
  } else if (actionType === "damage") {
    dom.stockActionTitle.textContent = "Report Defective Stock";
    dom.actionQtyLabel.textContent = "Defective Quantity";
    dom.stockActionSubmitBtn.className = "btn btn-primary btn-danger";
    dom.stockActionSubmitBtn.textContent = "Log Defective Stock";
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
  csvContent += "Product ID,Product Name,Category,Colour,Quantity,Unit,Min Threshold,Location,Rag Number\n";

  state.inventory.forEach(item => {
    const row = [
      item.id || item.stockId,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.colour || '').replace(/"/g, '""')}"`,
      item.quantity,
      `"${(item.unit || 'piece').replace(/"/g, '""')}"`,
      item.minStock,
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
