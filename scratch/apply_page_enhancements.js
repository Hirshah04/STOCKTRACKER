const fs = require('fs');
const path = require('path');

function updateFile(relPath, transformFn) {
  const fullPath = path.join(__dirname, '..', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const updated = transformFn(content);
  fs.writeFileSync(fullPath, updated, 'utf8');
  console.log('[UPDATED PAGE]', relPath);
}

// 1. ForgotPassword.jsx
updateFile('src/pages/ForgotPassword.jsx', (content) => {
  // Prepend file header comment
  const header = `/**
 * ==============================================================================
 * FORGOT PASSWORD & OTP RECOVERY PAGE
 * ==============================================================================
 * Handles the secure 3-step account password recovery workflow:
 *  - Step 1 ('request_otp'): Validates email and dispatches 6-digit numeric OTP.
 *  - Step 2 ('verify_otp'): Verifies code validity, cooldown timer, and expiry.
 *  - Step 3 ('reset_password'): Issues single-use token to securely update password.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  // Insert lifecycle and debug logs
  updated = updated.replace(
    '  // Step state: \'request_otp\' | \'verify_otp\' | \'reset_password\' | \'success\'',
    `  // Step state: 'request_otp' | 'verify_otp' | 'reset_password' | 'success'
  useEffect(() => {
    console.log('[ForgotPassword] Page mounted. Initial step:', step);
  }, []);

  useEffect(() => {
    console.log('[ForgotPassword] Active recovery step transitioned to:', step);
  }, [step]);`
  );

  // Debug logs in handleSendOtp
  updated = updated.replace(
    `  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();`,
    `  // Step 1: Send OTP to User's Email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    console.log('[ForgotPassword] Initiating Send OTP request for email:', cleanEmail);`
  );

  updated = updated.replace(
    `      const res = await authService.forgotPasswordSendOtp(cleanEmail);
      showToast(res.message || 'If an account exists for this email, an OTP will be sent.', 'info');`,
    `      console.log('[ForgotPassword] Calling authService.forgotPasswordSendOtp...');
      const res = await authService.forgotPasswordSendOtp(cleanEmail);
      console.log('[ForgotPassword] Send OTP response received:', res);
      showToast(res.message || 'If an account exists for this email, an OTP will be sent.', 'info');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Failed to send OTP.', 'danger');`,
    `    } catch (err) {
      console.error('[ForgotPassword] Error sending OTP:', err);
      showToast(err.message || 'Failed to send OTP.', 'danger');`
  );

  // Debug logs in handleVerifyOtp
  updated = updated.replace(
    `  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();`,
    `  // Step 2: Verify the 6-Digit OTP code
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    const cleanEmail = email.trim().toLowerCase();
    console.log('[ForgotPassword] Submitting OTP verification for email:', cleanEmail, 'Entered OTP:', cleanOtp);`
  );

  updated = updated.replace(
    `      const res = await authService.forgotPasswordVerifyOtp(email.trim().toLowerCase(), cleanOtp);
      showToast('Verification code confirmed!', 'success');
      setResetToken(res.data.resetToken);
      setStep('reset_password');`,
    `      console.log('[ForgotPassword] Calling authService.forgotPasswordVerifyOtp...');
      const res = await authService.forgotPasswordVerifyOtp(cleanEmail, cleanOtp);
      console.log('[ForgotPassword] OTP verification response:', res);
      showToast('Verification code confirmed!', 'success');
      setResetToken(res.data.resetToken);
      setStep('reset_password');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Invalid or expired verification code.', 'danger');`,
    `    } catch (err) {
      console.error('[ForgotPassword] OTP verification failed:', err);
      showToast(err.message || 'Invalid or expired verification code.', 'danger');`
  );

  // Debug logs in handleResetPassword
  updated = updated.replace(
    `  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();`,
    `  // Step 3: Set New Password using Reset Token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    console.log('[ForgotPassword] Submitting password reset with token authorization...');`
  );

  updated = updated.replace(
    `      const res = await authService.forgotPasswordReset(resetToken, newPassword, confirmPassword);
      showToast(res.message || 'Password reset successfully!', 'success');
      setStep('success');`,
    `      console.log('[ForgotPassword] Calling authService.forgotPasswordReset...');
      const res = await authService.forgotPasswordReset(resetToken, newPassword, confirmPassword);
      console.log('[ForgotPassword] Password reset success response:', res);
      showToast(res.message || 'Password reset successfully!', 'success');
      setStep('success');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Failed to reset password. The session may have expired.', 'danger');`,
    `    } catch (err) {
      console.error('[ForgotPassword] Password reset error:', err);
      showToast(err.message || 'Failed to reset password. The session may have expired.', 'danger');`
  );

  return updated;
});

// 2. Login.jsx
updateFile('src/pages/Login.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * AUTHENTICATION PAGE (LOGIN & SHOP REGISTRATION)
 * ==============================================================================
 * Serves as the primary gateway to the application:
 *  - Handles user sign-in via Email/Username and Password with JWT issuance.
 *  - Supports single active session enforcement (revoking older device logins).
 *  - Allows new shop owners to register their shop and owner credentials.
 *  - Provides navigation link to ForgotPassword flow.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    '  // Login form state (Email ID & Password)',
    `  // Lifecycle debug logging
  React.useEffect(() => {
    console.log('[Login] Authentication page mounted. Mode:', isRegistering ? 'Register' : 'Login');
  }, []);

  React.useEffect(() => {
    console.log('[Login] Mode toggled. Registering:', isRegistering, 'ForgotPassword:', isForgotPassword);
  }, [isRegistering, isForgotPassword]);

  // Login form state (Email ID & Password)`
  );

  updated = updated.replace(
    `  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();`,
    `  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    console.log('[Login] Attempting sign-in for email/username:', cleanEmail);`
  );

  updated = updated.replace(
    `      await login(cleanEmail, password);
      showToast('Signed in successfully!', 'success');`,
    `      console.log('[Login] Calling authService login...');
      await login(cleanEmail, password);
      console.log('[Login] Signed in successfully!');
      showToast('Signed in successfully!', 'success');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Invalid email or password.', 'danger');`,
    `    } catch (err) {
      console.error('[Login] Sign-in failed:', err);
      showToast(err.message || 'Invalid email or password.', 'danger');`
  );

  updated = updated.replace(
    `  // Handle Shop Registration submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = registerEmail.trim().toLowerCase();`,
    `  // Handle Shop Registration submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = registerEmail.trim().toLowerCase();
    console.log('[Login] Registering new shop:', { shopName: shopName.trim(), email: cleanEmail, phone: phone.trim() });`
  );

  updated = updated.replace(
    `      await register({
        shopName: shopName.trim(),
        phone: phone.trim(),
        email: cleanEmail,
        ownerName: ownerName.trim() || 'Shop Owner',
        ownerPassword
      });
      showToast('Shop and owner account registered successfully!', 'success');`,
    `      console.log('[Login] Calling authService register...');
      await register({
        shopName: shopName.trim(),
        phone: phone.trim(),
        email: cleanEmail,
        ownerName: ownerName.trim() || 'Shop Owner',
        ownerPassword
      });
      console.log('[Login] Shop registration completed successfully!');
      showToast('Shop and owner account registered successfully!', 'success');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Registration failed.', 'danger');`,
    `    } catch (err) {
      console.error('[Login] Shop registration failed:', err);
      showToast(err.message || 'Registration failed.', 'danger');`
  );

  return updated;
});

// 3. Dashboard.jsx
updateFile('src/pages/Dashboard.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * DASHBOARD PAGE
 * ==============================================================================
 * Overview analytics page displaying key stock indicators:
 *  - Unique Products Count, Total Stock Quantity, Low Stock Items, Damaged Items.
 *  - Today's sales summary and quick shortcut navigation buttons.
 *  - Interactive summary modal inspection (unique catalog items, low stock alerts).
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    `  const loadDashboardData = async () => {
    try {
      setLoading(true);`,
    `  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('[Dashboard] Fetching dashboard data (products, stocks, activities)...');`
  );

  updated = updated.replace(
    `      setProducts(prodsRes.data || []);
      setInventory(stocksRes.data || []);
      setActivities(actsRes.data || []);`,
    `      console.log('[Dashboard] Data loaded successfully:', {
        productsCount: (prodsRes.data || []).length,
        stockItemsCount: (stocksRes.data || []).length,
        activitiesCount: (actsRes.data || []).length
      });
      setProducts(prodsRes.data || []);
      setInventory(stocksRes.data || []);
      setActivities(actsRes.data || []);`
  );

  updated = updated.replace(
    `  useEffect(() => {
    loadDashboardData();
  }, []);`,
    `  useEffect(() => {
    console.log('[Dashboard] Page mounted. Active user role:', user?.role, 'Shop:', shopInfo?.name);
    loadDashboardData();
  }, []);`
  );

  return updated;
});

// 4. AddStock.jsx
updateFile('src/pages/AddStock.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * ADD STOCK PAGE
 * ==============================================================================
 * Allows shop owners and staff to record inventory replenishment:
 *  - Links incoming stock batches to existing master products.
 *  - Captures quantity, unit price, color, brand, bill/challan, and shelf location.
 *  - Configures customizable low-stock threshold alert triggers.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    `    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await productService.getProducts();
        setProducts(res.data || []);`,
    `    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log('[AddStock] Fetching available master products list...');
        const res = await productService.getProducts();
        console.log('[AddStock] Loaded products for stock entry:', (res.data || []).length);
        setProducts(res.data || []);`
  );

  updated = updated.replace(
    `  const handleSubmit = async (e) => {
    e.preventDefault();`,
    `  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[AddStock] Submitting new stock receipt entry...');`
  );

  updated = updated.replace(
    `      const res = await stockService.addStock(payload);
      showToast(res.message || 'Stock added successfully!', 'success');`,
    `      console.log('[AddStock] Dispatching payload to stockService.addStock:', payload);
      const res = await stockService.addStock(payload);
      console.log('[AddStock] Stock added successfully response:', res);
      showToast(res.message || 'Stock added successfully!', 'success');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Failed to add stock.', 'danger');`,
    `    } catch (err) {
      console.error('[AddStock] Failed to add stock:', err);
      showToast(err.message || 'Failed to add stock.', 'danger');`
  );

  return updated;
});

// 5. SellStock.jsx
updateFile('src/pages/SellStock.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * SELL STOCK (COUNTER SALES) PAGE
 * ==============================================================================
 * Point-of-sale interface for decrementing inventory when items are sold:
 *  - Calculates aggregate available stock across colors and variations.
 *  - Validates requested quantity against current physical inventory levels.
 *  - Logs sale transactions with bill/challan numbers and timestamps.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    `    const loadData = async () => {
      try {
        setLoading(true);
        const [prodsRes, stocksRes] = await Promise.all([
          productService.getProducts().catch(() => ({ data: [] })),
          stockService.getStocks().catch(() => ({ data: [] }))
        ]);`,
    `    const loadData = async () => {
      try {
        setLoading(true);
        console.log('[SellStock] Fetching catalog and live stock inventory...');
        const [prodsRes, stocksRes] = await Promise.all([
          productService.getProducts().catch(() => ({ data: [] })),
          stockService.getStocks().catch(() => ({ data: [] }))
        ]);
        console.log('[SellStock] Loaded catalog:', (prodsRes.data || []).length, 'stock records:', (stocksRes.data || []).length);`
  );

  updated = updated.replace(
    `  const handleSaleSubmit = async (e) => {
    e.preventDefault();`,
    `  const handleSaleSubmit = async (e) => {
    e.preventDefault();
    console.log('[SellStock] Processing sale submission...');`
  );

  updated = updated.replace(
    `      const res = await stockService.sellStock(payload);
      showToast(res.message || 'Stock sale recorded successfully!', 'success');`,
    `      console.log('[SellStock] Dispatching payload to stockService.sellStock:', payload);
      const res = await stockService.sellStock(payload);
      console.log('[SellStock] Sale recorded successfully response:', res);
      showToast(res.message || 'Stock sale recorded successfully!', 'success');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Failed to record sale.', 'danger');`,
    `    } catch (err) {
      console.error('[SellStock] Failed to record sale:', err);
      showToast(err.message || 'Failed to record sale.', 'danger');`
  );

  return updated;
});

// 6. DefectiveStock.jsx
updateFile('src/pages/DefectiveStock.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * DEFECTIVE / DAMAGED STOCK PAGE
 * ==============================================================================
 * Facilitates recording expired, damaged, or unsellable merchandise:
 *  - Deducts defective items from active inventory count.
 *  - Appends audit logs with specific failure reasons or notes.
 *  - Displays history of past defective stock reports.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    `  const loadData = async () => {
    try {
      setLoading(true);
      const [stocksRes, actsRes] = await Promise.all([
        stockService.getStocks(),
        stockService.getActivities({ period: 'all', sort: 'desc' })
      ]);`,
    `  const loadData = async () => {
    try {
      setLoading(true);
      console.log('[DefectiveStock] Loading inventory and damage activities...');
      const [stocksRes, actsRes] = await Promise.all([
        stockService.getStocks(),
        stockService.getActivities({ period: 'all', sort: 'desc' })
      ]);
      console.log('[DefectiveStock] Inventory items:', (stocksRes.data || []).length, 'Activities:', (actsRes.data || []).length);`
  );

  updated = updated.replace(
    `  const handleSubmit = async (e) => {
    e.preventDefault();`,
    `  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[DefectiveStock] Submitting damaged stock adjustment for stock ID:', stockId);`
  );

  updated = updated.replace(
    `      const res = await stockService.defectiveStock(stockId, {
        quantity: qtyNum,
        notes: notes.trim()
      });
      showToast(res.message || 'Defective stock recorded successfully!', 'success');`,
    `      console.log('[DefectiveStock] Dispatching defectiveStock call:', { stockId, quantity: qtyNum, notes: notes.trim() });
      const res = await stockService.defectiveStock(stockId, {
        quantity: qtyNum,
        notes: notes.trim()
      });
      console.log('[DefectiveStock] Defective stock saved response:', res);
      showToast(res.message || 'Defective stock recorded successfully!', 'success');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Failed to record defective stock.', 'danger');`,
    `    } catch (err) {
      console.error('[DefectiveStock] Error recording defective stock:', err);
      showToast(err.message || 'Failed to record defective stock.', 'danger');`
  );

  return updated;
});

// 7. StockCategory.jsx
updateFile('src/pages/StockCategory.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * STOCK CATEGORY (INVENTORY EXPLORER) PAGE
 * ==============================================================================
 * Main inventory catalog data grid with comprehensive controls:
 *  - Instant search across product name, category, colour, brand, and bill number.
 *  - Multi-attribute filter drawer (category, unit, transaction type, location).
 *  - Export full inventory dataset as a downloadable CSV spreadsheet.
 *  - Direct item quick actions: Sell, Mark Defective, or Delete item.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    `  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await stockService.getStocks();
      setInventory(res.data || []);`,
    `  const loadInventory = async () => {
    try {
      setLoading(true);
      console.log('[StockCategory] Loading full inventory records...');
      const res = await stockService.getStocks();
      console.log('[StockCategory] Inventory records loaded:', (res.data || []).length);
      setInventory(res.data || []);`
  );

  updated = updated.replace(
    `  const confirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);`,
    `  const confirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    console.log('[StockCategory] Deleting inventory item:', deleteItem.id || deleteItem.stockId);`
  );

  updated = updated.replace(
    `  const handleExportCSV = () => {
    if (filteredInventory.length === 0) {`,
    `  const handleExportCSV = () => {
    console.log('[StockCategory] Exporting filtered inventory to CSV. Total rows:', filteredInventory.length);
    if (filteredInventory.length === 0) {`
  );

  return updated;
});

// 8. AddProduct.jsx
updateFile('src/pages/AddProduct.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * MASTER PRODUCT CATALOG PAGE
 * ==============================================================================
 * Defines the standard product types and categories for the shop:
 *  - Restricted to Owners and authorized managerial roles.
 *  - Serves as the master list referenced when adding stock or selling items.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    `  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await productService.getProducts();
      setProducts(res.data || []);`,
    `  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('[AddProduct] Loading master products...');
      const res = await productService.getProducts();
      console.log('[AddProduct] Master products loaded:', (res.data || []).length);
      setProducts(res.data || []);`
  );

  updated = updated.replace(
    `  const handleCreateProduct = async (e) => {
    e.preventDefault();`,
    `  const handleCreateProduct = async (e) => {
    e.preventDefault();
    console.log('[AddProduct] Creating new master product:', { name: name.trim(), category: category.trim() });`
  );

  updated = updated.replace(
    `      const res = await productService.createProduct({
        name: name.trim(),
        category: category.trim()
      });
      showToast(res.message || \`Product "\${name}" added to master list!\`, 'success');`,
    `      const res = await productService.createProduct({
        name: name.trim(),
        category: category.trim()
      });
      console.log('[AddProduct] Master product created successfully:', res);
      showToast(res.message || \`Product "\${name}" added to master list!\`, 'success');`
  );

  updated = updated.replace(
    `    } catch (err) {
      showToast(err.message || 'Failed to create product.', 'danger');`,
    `    } catch (err) {
      console.error('[AddProduct] Failed to create product:', err);
      showToast(err.message || 'Failed to create product.', 'danger');`
  );

  return updated;
});

// 9. ActivityLog.jsx
updateFile('src/pages/ActivityLog.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * ACTIVITY LOG (TRANSACTION AUDIT TRAIL) PAGE
 * ==============================================================================
 * Displays the complete chronological history of all inventory movements:
 *  - Logs: Additions, Sales, Defective write-offs, and Catalog adjustments.
 *  - Filtering by timeframe (All time, Today, This Week, This Month, This Year).
 *  - Filtering by specific calendar date and transaction action type.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    `  const loadActivities = async () => {
    try {
      setLoading(true);
      const res = await stockService.getActivities({
        period,
        date: selectedDate,
        sort: sortOrder
      });
      setActivities(res.data || []);`,
    `  const loadActivities = async () => {
    try {
      setLoading(true);
      console.log('[ActivityLog] Fetching activity logs with filters:', { period, selectedDate, sortOrder });
      const res = await stockService.getActivities({
        period,
        date: selectedDate,
        sort: sortOrder
      });
      console.log('[ActivityLog] Activity log entries returned:', (res.data || []).length);
      setActivities(res.data || []);`
  );

  return updated;
});

// 10. Profile.jsx
updateFile('src/pages/Profile.jsx', (content) => {
  const header = `/**
 * ==============================================================================
 * SHOP SETTINGS & TEAM MANAGEMENT (PROFILE) PAGE
 * ==============================================================================
 * Manages store configuration and role-based staff access:
 *  - Store profile updates (Shop Name, Phone Number, Official Email).
 *  - Team account provisioning (Partner and Staff user accounts).
 *  - Account access revocation and user deletion for owners.
 * ==============================================================================
 */\n`;

  let updated = header + content;

  updated = updated.replace(
    `  const loadUsers = async () => {
    if (!isOwner) return;
    try {
      setLoadingUsers(true);
      const res = await authService.getUsers();
      setUsersList(res.data || []);`,
    `  const loadUsers = async () => {
    if (!isOwner) return;
    try {
      setLoadingUsers(true);
      console.log('[Profile] Loading team accounts list (Owner privilege)...');
      const res = await authService.getUsers();
      console.log('[Profile] Team accounts loaded:', (res.data || []).length);
      setUsersList(res.data || []);`
  );

  updated = updated.replace(
    `  // Update Shop Profile
  const handleSaveShopProfile = async (e) => {
    e.preventDefault();
    if (!user || !user.shopId) return;

    setSavingShop(true);`,
    `  // Update Shop Profile
  const handleSaveShopProfile = async (e) => {
    e.preventDefault();
    if (!user || !user.shopId) return;

    setSavingShop(true);
    console.log('[Profile] Saving shop profile updates for shopId:', user.shopId);`
  );

  updated = updated.replace(
    `  // Create Partner or Staff Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();`,
    `  // Create Partner or Staff Account
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    console.log('[Profile] Creating new team account:', { role: accountType, name: fullName.trim(), email: accountEmail.trim() });`
  );

  updated = updated.replace(
    `  // Confirm user deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingUser(true);`,
    `  // Confirm user deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingUser(true);
    console.log('[Profile] Deleting team member account:', deleteTarget.id, deleteTarget.email);`
  );

  return updated;
});

console.log('All 10 pages successfully updated with comments and debug console logs!');
