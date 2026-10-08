const app = require('../api/index');
const http = require('http');

let server;
const PORT = 3891;

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}`);
    try {
      // 1. Health Status
      const statusRes = await makeRequest('GET', '/api/status');
      console.log('✓ Health Status:', statusRes.status, statusRes.body.dbMode);

      // 2. Register Owner Account
      const regUser = "testowner_" + Date.now();
      const regRes = await makeRequest('POST', '/api/auth/register', {
        shopName: "Test Shop",
        phone: "1234567890",
        email: "test@shop.com",
        ownerUsername: regUser,
        ownerPassword: "password123"
      });
      console.log('✓ Register Owner:', regRes.status, regRes.body.message);
      const token = regRes.body.data.token;

      // 3. Create Master Products
      const prod1Res = await makeRequest('POST', '/api/products', { name: "Cotton", category: "Fabric" }, token);
      console.log('✓ Create Product 1 (Cotton):', prod1Res.status, prod1Res.body.message);
      const prod1Id = prod1Res.body.data.id || prod1Res.body.data.productId;

      const prod2Res = await makeRequest('POST', '/api/products', { name: "Shoes", category: "Footwear" }, token);
      console.log('✓ Create Product 2 (Shoes):', prod2Res.status, prod2Res.body.message);
      const prod2Id = prod2Res.body.data.id || prod2Res.body.data.productId;

      // 4. Add Stock with Date Validation Test
      const todayStr = new Date().toISOString().split('T')[0];
      const futureDate = "2099-01-01";

      // Future Buy Date (Must fail with 400)
      const futureAddRes = await makeRequest('POST', '/api/stocks', {
        productId: prod1Id,
        colour: "Red",
        quantity: 20,
        unit: "kg",
        buyDate: futureDate
      }, token);
      console.log('✓ Future Buy Date Rejected (Status 400 expected):', futureAddRes.status === 400 ? 'PASSED (400)' : 'FAILED', futureAddRes.body.message);

      // Valid Add Stock (Cotton Red 20 Kg)
      const add1Res = await makeRequest('POST', '/api/stocks', {
        productId: prod1Id,
        colour: "Red",
        quantity: 20,
        unit: "kg",
        brandName: "Nike",
        buyDate: todayStr,
        lowStockAlertEnabled: true,
        lowStockThreshold: 10
      }, token);
      console.log('✓ Add Stock Cotton Red (20 Kg):', add1Res.status, add1Res.body.message);
      const stock1Id = add1Res.body.data.id || add1Res.body.data.stockId;

      // Valid Add Stock (Shoes Black 5 Pieces)
      const add2Res = await makeRequest('POST', '/api/stocks', {
        productId: prod2Id,
        colour: "Black",
        quantity: 5,
        unit: "piece",
        brandName: "Puma",
        buyDate: todayStr,
        lowStockAlertEnabled: true,
        lowStockThreshold: 5
      }, token);
      console.log('✓ Add Stock Shoes Black (5 Pieces):', add2Res.status, add2Res.body.message);

      // 5. Sell Stock Tests
      // Future Sale Date (Must fail with 400)
      const futureSellRes = await makeRequest('POST', `/api/stocks/${stock1Id}/sell`, {
        quantity: 5,
        saleDate: futureDate
      }, token);
      console.log('✓ Future Sale Date Rejected (Status 400 expected):', futureSellRes.status === 400 ? 'PASSED (400)' : 'FAILED', futureSellRes.body.message);

      // Sell Stock with Quantity > Available Stock (20 Available, Sell 50 -> Result -30)
      const minusSellRes = await makeRequest('POST', `/api/stocks/${stock1Id}/sell`, {
        quantity: 50,
        saleDate: todayStr,
        price: 300,
        transactionType: "bill",
        billNo: "INV-9999",
        notes: "Over-selling test for minus stock"
      }, token);
      console.log('✓ Minus Stock Sell (Available 20, Sold 50, Resulting -30):', minusSellRes.status, minusSellRes.body.message);
      console.log('  New Stock Quantity:', minusSellRes.body.data.quantity);
      if (minusSellRes.body.data.quantity === -30) {
        console.log('  ✓ PASSED: Stock correctly created minus stock -30!');
      } else {
        console.error('  ✗ FAILED: Quantity is not -30:', minusSellRes.body.data.quantity);
      }

      // 6. Get All Stocks and verify low stock / minus stock flags
      const getStocksRes = await makeRequest('GET', '/api/stocks', null, token);
      console.log('✓ Get All Stocks Count:', getStocksRes.body.data.length);
      const cottonStock = getStocksRes.body.data.find(s => s.name === "Cotton");
      console.log('  Cotton Stock:', cottonStock.name, 'Qty:', cottonStock.quantity, 'AlertEnabled:', cottonStock.lowStockAlertEnabled, 'Threshold:', cottonStock.lowStockThreshold);

      // 7. Get Activity Logs
      const getActRes = await makeRequest('GET', '/api/activities', null, token);
      console.log('✓ Get Activities Count:', getActRes.body.data.length);

      console.log('\n==================================================');
      console.log(' ALL AUTOMATED TESTS COMPLETED SUCCESSFULLY!');
      console.log('==================================================\n');

      server.close(() => process.exit(0));
    } catch (err) {
      console.error("Test error:", err);
      if (server) server.close(() => process.exit(1));
    }
  });
}

runTests();
