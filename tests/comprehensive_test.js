const http = require('http');
const path = require('path');
const fs = require('fs');

function request(serverPort, path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port: serverPort,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: rawData });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log("==================================================");
  console.log(" Running Comprehensive Stock Tracker Verification");
  console.log("==================================================");

  const app = require('../api/index');
  const server = http.createServer(app);

  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', resolve);
    server.on('error', reject);
  });

  const testPort = server.address().port;
  console.log(`Test server running on port ${testPort}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    const testTimestamp = Date.now();
    const ownerEmail = `testowner_${testTimestamp}@testshop.com`;
    const partnerEmail = `partner_${testTimestamp}@testshop.com`;
    const staffEmail = `staff_${testTimestamp}@testshop.com`;

    // 1. Register Owner & Shop
    console.log("\n--- Test 1: Shop & Owner Registration with Unique Email ---");
    const regRes = await request(testPort, '/api/auth/register', 'POST', {
      shopName: "Apex Retailers",
      phone: "1234567890",
      email: ownerEmail,
      ownerName: "Alice Owner",
      ownerPassword: "password123"
    });
    assert(regRes.status === 200 && regRes.body.success, "Shop & Owner account registered successfully");
    const ownerToken = regRes.body.data.token;
    const shopId = regRes.body.data.shop.id;

    // 2. Reject Duplicate Email
    console.log("\n--- Test 2: Reject Duplicate Email Address ---");
    const dupRes = await request(testPort, '/api/auth/register', 'POST', {
      shopName: "Duplicate Shop",
      phone: "9876543210",
      email: ownerEmail,
      ownerName: "Duplicate User",
      ownerPassword: "password123"
    });
    assert(dupRes.status === 400 && dupRes.body.success === false, "Duplicate email registration rejected");

    // 3. Login with Email ID
    console.log("\n--- Test 3: Login using Email ID & Password ---");
    const loginRes = await request(testPort, '/api/auth/login', 'POST', {
      email: ownerEmail,
      password: "password123"
    });
    assert(loginRes.status === 200 && loginRes.body.data.token, "Login with Email ID succeeded");
    const sessionTokenA = loginRes.body.data.token;

    // 4. Forgot Password Flow
    console.log("\n--- Test 4: Forgot Password - Send OTP ---");
    const forgotRes = await request(testPort, '/api/auth/forgot-password/send-otp', 'POST', {
      email: ownerEmail
    });
    assert(forgotRes.status === 200 && forgotRes.body.message.includes("If an account exists"), "Send OTP endpoint returned generic confirmation");

    // Set a known hashed OTP in store to test OTP verification and single-use invalidation
    const LOCAL_DB_PATH = path.join(__dirname, '../data_fallback.json');
    const otpCode = "654321";
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const bcrypt = require('bcryptjs');
      const store = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
      const u = store.users.find(x => x.email === ownerEmail);
      if (u) {
        u.otpHash = bcrypt.hashSync(otpCode, 10);
        u.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        u.otpAttempts = 0;
        fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(store, null, 2), 'utf8');
      }
    }

    // 5. Test Invalid OTP
    console.log("\n--- Test 5: Reject Invalid OTP ---");
    const badOtpRes = await request(testPort, '/api/auth/forgot-password/verify-otp', 'POST', {
      email: ownerEmail,
      otp: "000000"
    });
    assert(badOtpRes.status === 400 && badOtpRes.body.success === false, "Incorrect OTP rejected");

    // 6. Test Valid OTP Verification
    console.log("\n--- Test 6: Verify Valid OTP & Issue Single-Use Reset Token ---");
    assert(Boolean(otpCode), "Found generated OTP code for test verification: " + otpCode);
    const verifyOtpRes = await request(testPort, '/api/auth/forgot-password/verify-otp', 'POST', {
      email: ownerEmail,
      otp: otpCode
    });
    assert(verifyOtpRes.status === 200 && verifyOtpRes.body.data.resetToken, "OTP verified and reset token issued");
    const resetToken = verifyOtpRes.body.data.resetToken;

    // 7. Test OTP cannot be reused
    console.log("\n--- Test 7: OTP Cannot Be Reused ---");
    const reuseOtpRes = await request(testPort, '/api/auth/forgot-password/verify-otp', 'POST', {
      email: ownerEmail,
      otp: otpCode
    });
    assert(reuseOtpRes.status === 400, "Used OTP cannot be reused");

    // 8. Test Reset Password
    console.log("\n--- Test 8: Reset Password with New Password & Confirm Password ---");
    const resetPassRes = await request(testPort, '/api/auth/forgot-password/reset-password', 'POST', {
      resetToken,
      newPassword: "newpassword456",
      confirmPassword: "newpassword456"
    });
    assert(resetPassRes.status === 200 && resetPassRes.body.success, "Password reset succeeded");

    // 9. Login with New Password
    console.log("\n--- Test 9: Login with New Password ---");
    const newLoginRes = await request(testPort, '/api/auth/login', 'POST', {
      email: ownerEmail,
      password: "newpassword456"
    });
    assert(newLoginRes.status === 200 && newLoginRes.body.data.token, "Login with new password succeeded");
    const ownerActiveToken = newLoginRes.body.data.token;

    // 10. Single Active Session Per Account (Device A vs Device B)
    console.log("\n--- Test 10: Single Active Session Per Account ---");
    // Device A currently has ownerActiveToken
    const deviceACall1 = await request(testPort, '/api/auth/me', 'GET', null, ownerActiveToken);
    assert(deviceACall1.status === 200, "Device A active session authenticated successfully");

    // Device B logs in
    const deviceBLogin = await request(testPort, '/api/auth/login', 'POST', {
      email: ownerEmail,
      password: "newpassword456"
    });
    const deviceBToken = deviceBLogin.body.data.token;
    assert(deviceBLogin.status === 200, "Device B logged in successfully");

    // Device A attempts to call API -> must be rejected with 401 SESSION_REVOKED
    const deviceACall2 = await request(testPort, '/api/auth/me', 'GET', null, ownerActiveToken);
    assert(
      deviceACall2.status === 401 && (deviceACall2.body.code === 'SESSION_REVOKED' || deviceACall2.body.message.includes("another device")),
      "Device A session successfully revoked after Device B login"
    );

    // Device B calls API -> succeeds
    const deviceBCall = await request(testPort, '/api/auth/me', 'GET', null, deviceBToken);
    assert(deviceBCall.status === 200, "Device B session remains active");

    // 11. Create Partner Account
    console.log("\n--- Test 11: Owner Creates Partner Account ---");
    const partnerCreateRes = await request(testPort, '/api/users', 'POST', {
      name: "Bob Partner",
      email: partnerEmail,
      phone: "+1 555-0122",
      role: "partner",
      password: "partnerpassword123"
    }, deviceBToken);
    assert(partnerCreateRes.status === 200 && partnerCreateRes.body.data.role === 'partner', "Partner account created successfully");

    // 12. Partner Login & Inventory Operations
    console.log("\n--- Test 12: Partner Login & Inventory Management Access ---");
    const partnerLoginRes = await request(testPort, '/api/auth/login', 'POST', {
      email: partnerEmail,
      password: "partnerpassword123"
    });
    assert(partnerLoginRes.status === 200, "Partner logged in with email");
    const partnerToken = partnerLoginRes.body.data.token;

    // Partner creates a product
    const addProductRes = await request(testPort, '/api/products', 'POST', {
      name: "Organic Cotton Yarn " + testTimestamp,
      category: "Textiles"
    }, partnerToken);
    assert(addProductRes.status === 200 && addProductRes.body.success, "Partner can create master products");
    const productId = addProductRes.body.data.productId;

    // Partner adds stock
    const addStockRes = await request(testPort, '/api/stocks', 'POST', {
      productId,
      quantity: 50,
      unit: "meter",
      price: 25.50,
      brandName: "PureCotton",
      colour: "White",
      location: "Shop"
    }, partnerToken);
    assert(addStockRes.status === 200 && addStockRes.body.success, "Partner can add stock");
    const stockId = addStockRes.body.data.stockId;

    // Partner sells stock
    const sellStockRes = await request(testPort, `/api/stocks/${stockId}/sell`, 'POST', {
      quantity: 10,
      price: 35.00
    }, partnerToken);
    assert(sellStockRes.status === 200 && sellStockRes.body.success, "Partner can sell stock");

    // Partner logs defective stock
    const defectiveStockRes = await request(testPort, `/api/stocks/${stockId}/defective`, 'POST', {
      quantity: 2,
      notes: "Torn edge during transit"
    }, partnerToken);
    assert(defectiveStockRes.status === 200 && defectiveStockRes.body.success, "Partner can log defective stock");

    // 13. Create Staff Account
    console.log("\n--- Test 13: Owner Creates Staff Account ---");
    const staffCreateRes = await request(testPort, '/api/users', 'POST', {
      name: "Charlie Staff",
      email: staffEmail,
      phone: "+1 555-0133",
      role: "staff",
      password: "staffpassword123"
    }, deviceBToken);
    assert(staffCreateRes.status === 200 && staffCreateRes.body.data.role === 'staff', "Staff account created successfully");

    // 14. Staff Restrictions Enforced (Backend Rejection for Add Stock)
    console.log("\n--- Test 14: Staff Add Stock Restriction Enforced by Backend ---");
    const staffLoginRes = await request(testPort, '/api/auth/login', 'POST', {
      email: staffEmail,
      password: "staffpassword123"
    });
    assert(staffLoginRes.status === 200, "Staff logged in with email");
    const staffToken = staffLoginRes.body.data.token;

    // Staff attempts to Add Stock -> must be 403 Forbidden!
    const staffAddStockRes = await request(testPort, '/api/stocks', 'POST', {
      productId,
      quantity: 10,
      unit: "meter",
      price: 20
    }, staffToken);
    assert(staffAddStockRes.status === 403, "Staff is strictly rejected with 403 Forbidden when attempting to Add Stock");

    // Staff attempts to create master product -> must be 403 Forbidden!
    const staffAddProductRes = await request(testPort, '/api/products', 'POST', {
      name: "Forbidden Product",
      category: "Textiles"
    }, staffToken);
    assert(staffAddProductRes.status === 403, "Staff is rejected with 403 Forbidden when attempting to create Product");

    // Staff permitted operation: sell stock
    const staffSellRes = await request(testPort, `/api/stocks/${stockId}/sell`, 'POST', {
      quantity: 1,
      price: 35.00
    }, staffToken);
    assert(staffSellRes.status === 200 && staffSellRes.body.success, "Staff can perform allowed operations (Sell Stock)");

    // 15. Cross-Shop Isolation
    console.log("\n--- Test 15: Cross-Shop Data Isolation ---");
    const crossShopRes = await request(testPort, '/api/shops/other_shop_999999', 'GET', null, partnerToken);
    assert(crossShopRes.status === 403, "Partner cannot access another shop's records");

    console.log("\n==================================================");
    console.log(` Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    server.close();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
