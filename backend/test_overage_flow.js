const { query } = require('./config/db');
const { sendOverageAlertEmail } = require('./controllers/breakController');
require('dotenv').config();

async function runTest() {
  console.log("=== Sales Point Break Overage Test ===");

  try {
    // 1. Get the admin user
    const adminRes = await query("SELECT id, name, email FROM users WHERE email = 'admin@fieldtrack.com' LIMIT 1");
    if (adminRes.rows.length === 0) {
      console.error("Test failed: admin user not found in database.");
      process.exit(1);
    }
    const adminUser = adminRes.rows[0];
    const adminId = adminUser.id;
    console.log(`Using user: ${adminUser.name} (${adminUser.email})`);

    // 2. Clean up any active breaks for this user
    await query("DELETE FROM breaks WHERE employee_id = $1 AND ended_at IS NULL", [adminId]);
    console.log("Cleared existing active breaks.");

    // 3. Create a simulated active break started 20 minutes ago (limit is 15 mins)
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const startRes = await query(
      "INSERT INTO breaks (employee_id, break_type, status, emergency_status, started_at) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [adminId, 'Morning Break', 'Active', 'idle', twentyMinsAgo]
    );
    const createdBreak = startRes.rows[0];
    console.log(`Simulated active break created. started_at: ${createdBreak.started_at}`);

    // 4. Invoke sendOverageAlertEmail controller with mocked request
    console.log("Invoking overage alert logic (sends email via Brevo and updates DB)...");
    
    let resStatus = 200;
    let resJson = null;

    const mockReq = {
      user: { id: adminId, email: adminUser.email }
    };

    const mockRes = {
      status: function(code) {
        resStatus = code;
        return this;
      },
      json: function(data) {
        resJson = data;
        return this;
      }
    };

    const mockNext = (err) => {
      if (err) throw err;
    };

    await sendOverageAlertEmail(mockReq, mockRes, mockNext);

    console.log("Overage alert controller executed.");
    console.log("Response Status:", resStatus);
    console.log("Response JSON:", JSON.stringify(resJson));

    // 5. Verify the DB update
    const verifyRes = await query("SELECT * FROM breaks WHERE id = $1", [createdBreak.id]);
    const updatedBreak = verifyRes.rows[0];
    console.log("\n--- Database Verification ---");
    console.log("Updated Status:", updatedBreak.status);
    console.log("Updated Notes:", updatedBreak.notes);

    // 6. Check results
    const dbPassed = updatedBreak.status.startsWith("Overtime") && updatedBreak.notes === "Overage alert sent";
    const emailPassed = resStatus === 200 && resJson && resJson.success === true;

    if (dbPassed && emailPassed) {
      console.log("\n[PASSED] SMTP/Brevo Email and Database integrations tested successfully!");
      
      // Cleanup the test record
      await query("DELETE FROM breaks WHERE id = $1", [createdBreak.id]);
      console.log("Cleaned up test break record.");
      process.exit(0);
    } else {
      console.error("\n[FAILED] Verification checks failed.");
      process.exit(1);
    }

  } catch (err) {
    console.error("\n[ERROR] Test crashed:", err);
    process.exit(1);
  }
}

runTest();
