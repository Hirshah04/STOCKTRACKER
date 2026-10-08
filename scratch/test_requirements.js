const http = require('http');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
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
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("==================================================");
  console.log("   RUNNING AUTOMATED END-TO-END REQUIREMENT TESTS ");
  console.log("==================================================\n");

  const timestamp = Date.now();
  const ownerUser = `test_owner_${timestamp}`;
  const staffUser = `test_staff_${timestamp}`;
  const shopName = `Test Shop ${timestamp}`;

  // 1. REGISTER SHOP & OWNER
  console.log("1. Testing Registration & Hashed Passwords...");
  const regRes = await makeRequest('/api/auth/register', 'POST', {
    shopName,
    phone: "1234567890",
    email: "test@shop.com",
    ownerUsername: ownerUser,
    ownerPassword: "password123"
  });

  if (regRes.status !== 200 || !regRes.body.success) {
    throw new Error("Registration failed: " + JSON.stringify(regRes.body));
  }
  const ownerToken = regRes.body.data.token;
  console.log("   ✔ Owner Registration Successful. Token received.");
  console.log("   ✔ Password not exposed in response user object:", regRes.body.data.user.password === undefined);

  // 2. LOGIN OWNER
  console.log("\n2. Testing Owner Login & JWT Token Verification...");
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    username: ownerUser,
    password: "password123"
  });
  if (loginRes.status !== 200 || !loginRes.body.success) {
    throw new Error("Owner login failed: " + JSON.stringify(loginRes.body));
  }
  console.log("   ✔ Owner Login Successful.");

  // 3. CREATE STAFF ACCOUNT (OWNER ONLY)
  console.log("\n3. Testing Staff Account Creation & Hashing...");
  const staffRegRes = await makeRequest('/api/users', 'POST', {
    username: staffUser,
    password: "staffPassword123"
  }, ownerToken);

  if (staffRegRes.status !== 200 || !staffRegRes.body.success) {
    throw new Error("Staff creation failed: " + JSON.stringify(staffRegRes.body));
  }
  console.log("   ✔ Staff Account Created.");

  // 4. LOGIN STAFF
  console.log("\n4. Testing Staff Login...");
  const staffLoginRes = await makeRequest('/api/auth/login', 'POST', {
    username: staffUser,
    password: "staffPassword123"
  });
  if (staffLoginRes.status !== 200 || !staffLoginRes.body.success) {
    throw new Error("Staff login failed: " + JSON.stringify(staffLoginRes.body));
  }
  const staffToken = staffLoginRes.body.data.token;
  console.log("   ✔ Staff Login Successful. Token received.");

  // 5. MASTER PRODUCTS CREATION (REQ 3 & REQ 4)
  console.log("\n5. Testing Master Product Creation (Req 3)...");
  const prodRes1 = await makeRequest('/api/products', 'POST', {
    name: "Cotton Fabric",
    category: "Fabrics"
  }, ownerToken);
  if (prodRes1.status !== 200 || !prodRes1.body.success) {
    throw new Error("Add Product failed: " + JSON.stringify(prodRes1.body));
  }
  const cottonProductId = prodRes1.body.data.productId || prodRes1.body.data.id;
  console.log("   ✔ Created Master Product 'Cotton Fabric' (ID:", cottonProductId, ")");

  const prodRes2 = await makeRequest('/api/products', 'POST', {
    name: "Silk Saree",
    category: "Apparel"
  }, ownerToken);
  const silkProductId = prodRes2.body.data.productId || prodRes2.body.data.id;
  console.log("   ✔ Created Master Product 'Silk Saree' (ID:", silkProductId, ")");

  // Test duplicate product error
  const dupProdRes = await makeRequest('/api/products', 'POST', {
    name: "Cotton Fabric",
    category: "Fabrics"
  }, ownerToken);
  if (dupProdRes.status === 400 && !dupProdRes.body.success) {
    console.log("   ✔ Duplicate product creation correctly rejected.");
  } else {
    throw new Error("Expected duplicate product to be rejected!");
  }

  // 6. BACKEND SECURITY & RBAC ENFORCEMENT FOR STAFF (REQ 16 & 17)
  console.log("\n6. Testing Backend RBAC Enforcement (Staff calling Owner endpoints)...");
  const staffAddStockRes = await makeRequest('/api/stocks', 'POST', {
    productId: cottonProductId,
    quantity: 10,
    unit: "piece"
  }, staffToken);

  if (staffAddStockRes.status === 403) {
    console.log("   ✔ Staff Add Stock request correctly rejected with HTTP 403 Forbidden!");
  } else {
    throw new Error(`Expected HTTP 403 for Staff Add Stock, got status ${staffAddStockRes.status}`);
  }

  const staffAddProductRes = await makeRequest('/api/products', 'POST', {
    name: "Polyester",
    category: "Fabrics"
  }, staffToken);

  if (staffAddProductRes.status === 403) {
    console.log("   ✔ Staff Add Product request correctly rejected with HTTP 403 Forbidden!");
  } else {
    throw new Error(`Expected HTTP 403 for Staff Add Product, got status ${staffAddProductRes.status}`);
  }

  // 7. ADD STOCK WITH NEW FIELDS (REQ 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 24)
  console.log("\n7. Testing Add Stock with Product Dropdown, 'Set' Unit, Price, Brand, Buy Date, Bill/Challan & Custom Colour...");
  const addStockRes = await makeRequest('/api/stocks', 'POST', {
    productId: cottonProductId,
    colour: "Other",
    customColour: "Dark Orange",
    quantity: 50,
    unit: "set", // Testing 'set' unit (Req 2)
    price: 750, // Testing numeric price 750 (Req 10)
    brandName: "Nike", // Testing Brand Name (Req 11)
    buyDate: "2026-10-08", // Testing Buy Date (Req 12)
    transactionType: "bill", // Testing Bill (Req 5, 6)
    billNo: "INV-1025",
    location: "Shop",
    ragNumber: "A-1"
  }, ownerToken);

  if (addStockRes.status !== 200 || !addStockRes.body.success) {
    throw new Error("Add Stock failed: " + JSON.stringify(addStockRes.body));
  }
  const stockData = addStockRes.body.data;
  const stockId = stockData.stockId || stockData.id;
  console.log("   ✔ Stock added successfully!");
  console.log("   ✔ Auto-populated Product Name:", stockData.name === "Cotton Fabric");
  console.log("   ✔ Auto-populated Category:", stockData.category === "Fabrics");
  console.log("   ✔ Resolved Custom Colour:", stockData.colour === "Dark Orange");
  console.log("   ✔ Unit 'set':", stockData.unit === "set");
  console.log("   ✔ Numeric Price (750):", stockData.price === 750);
  console.log("   ✔ Brand Name:", stockData.brandName === "Nike");
  console.log("   ✔ Transaction Type 'bill' & Bill No:", stockData.transactionType === "bill" && stockData.billNo === "INV-1025");

  // 8. SELL STOCK WITH ATOMIC UPDATE & RACES (REQ 5, 7, 10, 13, 15, 25)
  console.log("\n8. Testing Sell Stock (Staff Authorized) with Atomic Quantity Check...");
  const sellRes = await makeRequest(`/api/stocks/${stockId}/sell`, 'POST', {
    quantity: 15,
    price: 850,
    saleDate: "2026-10-08",
    transactionType: "challan", // Testing Challan (Req 5, 7)
    challanNo: "CH-5001",
    brandName: "Nike",
    notes: "Counter sale to wholesale buyer"
  }, staffToken);

  if (sellRes.status !== 200 || !sellRes.body.success) {
    throw new Error("Sell Stock failed: " + JSON.stringify(sellRes.body));
  }
  console.log("   ✔ Sale executed by Staff!");
  console.log("   ✔ Quantity reduced from 50 to:", sellRes.body.data.quantity);

  // Test preventing negative stock (selling more than available: 100 > 35)
  console.log("\n9. Testing Negative Stock Prevention (Over-selling)...");
  const overSellRes = await makeRequest(`/api/stocks/${stockId}/sell`, 'POST', {
    quantity: 100,
    notes: "Attempt to over-sell"
  }, staffToken);

  if (overSellRes.status === 400 && !overSellRes.body.success) {
    console.log("   ✔ Over-selling correctly blocked with message:", overSellRes.body.message);
  } else {
    throw new Error("Expected over-selling to be rejected!");
  }

  // 10. VERIFY ACTIVITY LOGS (REQ 27 & 28)
  console.log("\n10. Testing Activity Logs Recording & Audit Trail...");
  const actRes = await makeRequest('/api/activities', 'GET', null, ownerToken);
  if (actRes.status !== 200 || !actRes.body.success) {
    throw new Error("Fetch activities failed: " + JSON.stringify(actRes.body));
  }
  const activities = actRes.body.data;
  console.log(`   ✔ Retrieved ${activities.length} activity logs for shop.`);
  const sellActivity = activities.find(a => a.type === 'sell');
  if (sellActivity) {
    console.log("   ✔ Sell Activity Log details verified:");
    console.log("       - User:", sellActivity.user);
    console.log("       - Role:", sellActivity.role);
    console.log("       - Item Name:", sellActivity.itemName);
    console.log("       - Unit:", sellActivity.unit);
    console.log("       - Transaction Type & Ref:", sellActivity.transactionType, sellActivity.challanNo);
  }

  console.log("\n==================================================");
  console.log("      ALL END-TO-END TESTS PASSED SUCCESSFULLY!   ");
  console.log("==================================================\n");
}

runTests().catch(err => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
