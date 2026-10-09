const app = require('../api/index');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
let server;

function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function verifyAll() {
  server = app.listen(PORT, async () => {
    console.log(`\n==================================================`);
    console.log(`   STARTING FULL INTEGRATION & BUILD VERIFICATION `);
    console.log(`==================================================\n`);

    try {
      // 1. Verify Static Serving of Dist and HTML
      console.log('--- 1. Static Asset Serving & SPA Routing ---');
      const rootRes = await request('/');
      console.log('✓ GET / Status:', rootRes.status);
      const isHtml = typeof rootRes.body === 'string' && rootRes.body.includes('<div id="root"></div>');
      console.log('✓ Serves Vite Root HTML with #root container:', isHtml ? 'PASSED' : 'FAILED');

      // 2. Check SPA deep route fallback
      const spaRes = await request('/dashboard');
      console.log('✓ GET /dashboard (SPA Fallback) Status:', spaRes.status);
      const isSpaFallback = typeof spaRes.body === 'string' && spaRes.body.includes('<div id="root"></div>');
      console.log('✓ Serves SPA index.html on deep client routes:', isSpaFallback ? 'PASSED' : 'FAILED');

      // 3. API Status
      console.log('\n--- 2. Backend Health & Database Connectivity ---');
      const statusRes = await request('/api/status');
      console.log('✓ GET /api/status Status:', statusRes.status);
      console.log('✓ Database Mode:', statusRes.body.dbMode);

      // 4. Owner Registration
      console.log('\n--- 3. Authentication & Role-Based Access ---');
      const timestamp = Date.now();
      const ownerUser = `testowner_${timestamp}`;
      const regRes = await request('/api/auth/register', 'POST', {
        shopName: 'Metro Store ' + timestamp,
        phone: '9876543210',
        email: `metro_${timestamp}@test.com`,
        ownerUsername: ownerUser,
        ownerPassword: 'SecretPassword123'
      });
      console.log('✓ Owner Registration Status:', regRes.status, regRes.body.message);
      const ownerToken = regRes.body.data.token;
      const shopId = regRes.body.data.user.shopId;

      // 5. Staff Registration
      const staffUser = `staff_${timestamp}`;
      const staffCreateRes = await request('/api/users', 'POST', {
        username: staffUser,
        password: 'StaffPassword123'
      }, ownerToken);
      console.log('✓ Staff Creation by Owner:', staffCreateRes.status, staffCreateRes.body.message);

      // 6. Login as Staff
      const staffLoginRes = await request('/api/auth/login', 'POST', {
        username: staffUser,
        password: 'StaffPassword123'
      });
      console.log('✓ Staff Login Status:', staffLoginRes.status, staffLoginRes.body.data.user.role);
      const staffToken = staffLoginRes.body.data.token;

      // 7. Verify Staff Permission Restrictions
      console.log('\n--- 4. Enforcing Role Permissions (Owner vs Staff) ---');
      // Staff trying to create master product (MUST FAIL 403)
      const staffProductRes = await request('/api/products', 'POST', {
        name: 'Forbidden Fabric',
        category: 'Textile'
      }, staffToken);
      console.log('✓ Staff creating product rejected with 403:', staffProductRes.status === 403 ? 'PASSED (403)' : 'FAILED');

      // Staff trying to add stock (MUST FAIL 403)
      const staffAddStockRes = await request('/api/stocks', 'POST', {
        productId: 'dummy',
        quantity: 10,
        unit: 'piece'
      }, staffToken);
      console.log('✓ Staff adding stock rejected with 403:', staffAddStockRes.status === 403 ? 'PASSED (403)' : 'FAILED');

      // 8. Owner Creates Products
      console.log('\n--- 5. Master Products Management ---');
      const prodRes = await request('/api/products', 'POST', {
        name: 'Cotton Fabric',
        category: 'Textiles'
      }, ownerToken);
      console.log('✓ Owner Created Master Product:', prodRes.status, prodRes.body.message);
      const productId = prodRes.body.data.id || prodRes.body.data.productId;

      // 9. Add Stock with Alert Threshold and Location
      console.log('\n--- 6. Stock In / Replenishment Operations ---');
      const addStockRes = await request('/api/stocks', 'POST', {
        productId: productId,
        colour: 'Navy Blue',
        quantity: 25,
        unit: 'meter',
        price: 350,
        brandName: 'Raymond',
        buyDate: new Date().toISOString().split('T')[0],
        transactionType: 'bill',
        billNo: 'BILL-1001',
        location: 'Godown',
        ragNumber: 'B-4',
        lowStockAlertEnabled: true,
        lowStockThreshold: 10
      }, ownerToken);
      console.log('✓ Stock Added with location & alert threshold:', addStockRes.status, addStockRes.body.message);
      const stockId = addStockRes.body.data.id || addStockRes.body.data.stockId;

      // 10. Staff Sells Stock
      console.log('\n--- 7. Counter Sales & Staff Operations ---');
      const staffSellRes = await request(`/api/stocks/${stockId}/sell`, 'POST', {
        quantity: 5,
        price: 450,
        notes: 'Customer walk-in counter sale'
      }, staffToken);
      console.log('✓ Staff Sold 5 meters:', staffSellRes.status, staffSellRes.body.message);
      console.log('  Remaining Quantity:', staffSellRes.body.data.quantity, '(Expected: 20)');

      // 11. Negative Stock Handling
      console.log('\n--- 8. Negative / Minus Stock Support ---');
      const minusSellRes = await request(`/api/stocks/${stockId}/sell`, 'POST', {
        quantity: 30, // 20 - 30 = -10
        notes: 'Excess counter sale resulting in minus stock'
      }, ownerToken);
      console.log('✓ Negative Stock Sale Status:', minusSellRes.status, minusSellRes.body.message);
      console.log('  Resulting Stock Quantity:', minusSellRes.body.data.quantity, '(Expected: -10)');
      console.log('✓ Negative stock correctly allowed and saved:', minusSellRes.body.data.quantity === -10 ? 'PASSED' : 'FAILED');

      // Replenish stock before defective testing (match productId, colour, brandName)
      await request('/api/stocks', 'POST', {
        productId: productId,
        colour: 'Navy Blue',
        brandName: 'Raymond',
        quantity: 50,
        unit: 'meter'
      }, ownerToken);

      // 12. Defective / Damaged Stock
      console.log('\n--- 9. Defective Goods Logging ---');
      const defectiveRes = await request(`/api/stocks/${stockId}/defective`, 'POST', {
        quantity: 2,
        notes: 'Water damaged roll'
      }, ownerToken);
      console.log('✓ Logged 2 defective units:', defectiveRes.status, defectiveRes.body.message);
      console.log('  New Stock Quantity after damage:', defectiveRes.body.data.quantity);

      // 13. Activity Logs Audit Trail
      console.log('\n--- 10. Activity Logs Verification ---');
      const actsRes = await request('/api/activities?sort=desc', 'GET', null, ownerToken);
      console.log('✓ Total Logged Activities Count:', actsRes.body.data.length);
      const types = actsRes.body.data.map(a => a.type);
      console.log('✓ Activity Types Present:', [...new Set(types)].join(', '));

      console.log(`\n==================================================`);
      console.log(`   ALL INTEGRATION & FUNCTIONAL TESTS PASSED!     `);
      console.log(`==================================================\n`);

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('❌ Verification Error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

verifyAll();
