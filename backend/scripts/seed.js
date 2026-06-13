const { query } = require('../config/db');
const bcrypt = require('bcrypt');
require('dotenv').config();

const schemaSql = `
-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'EMPLOYEE')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUSINESSES
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name VARCHAR(150) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUSINESS TIMINGS
CREATE TABLE IF NOT EXISTS business_timings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  timing_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY TYPES (e.g. Callings, Field Visits)
CREATE TABLE IF NOT EXISTS activity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL
);

-- DYNAMIC FORM FIELDS
CREATE TABLE IF NOT EXISTS form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type_id UUID NOT NULL REFERENCES activity_types(id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(30) NOT NULL DEFAULT 'number' CHECK (field_type IN ('number', 'text', 'textarea', 'select', 'checkbox')),
  required BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0
);

-- EMPLOYEE-BUSINESS ASSIGNMENT
CREATE TABLE IF NOT EXISTS employee_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, business_id)
);

-- TARGETS
CREATE TABLE IF NOT EXISTS targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  target_name VARCHAR(150) NOT NULL,
  target_value INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EMPLOYEE REPORTS (submission header)
CREATE TABLE IF NOT EXISTS employee_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  timing_id UUID NOT NULL REFERENCES business_timings(id),
  activity_type_id UUID NOT NULL REFERENCES activity_types(id),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPORT ANSWERS (dynamic field values)
CREATE TABLE IF NOT EXISTS report_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES employee_reports(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES form_fields(id),
  value TEXT
);

-- EMPLOYEE DOUBTS / QUERIES
CREATE TABLE IF NOT EXISTS employee_doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  response TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_employee_reports_employee_id ON employee_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_reports_business_id ON employee_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_employee_reports_date ON employee_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_report_answers_report_id ON report_answers(report_id);
CREATE INDEX IF NOT EXISTS idx_employee_businesses_employee ON employee_businesses(employee_id);
CREATE INDEX IF NOT EXISTS idx_targets_employee ON targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_doubts_employee ON employee_doubts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_doubts_business ON employee_doubts(business_id);
`;

async function seed() {
  try {
    console.log("Running schema...");
    await query(schemaSql);
    console.log("Schema created successfully.");

    // Check if admin exists
    const adminRes = await query("SELECT id FROM users WHERE email = $1", ["admin@fieldtrack.com"]);
    if (adminRes.rows.length === 0) {
      console.log("Creating Super Admin...");
      const hashedPassword = await bcrypt.hash("Admin@123", 12);
      await query(
        "INSERT INTO users (name, email, phone, password, role, status) VALUES ($1, $2, $3, $4, $5, $6)",
        ["Super Admin", "admin@fieldtrack.com", "0000000000", hashedPassword, "SUPER_ADMIN", "APPROVED"]
      );
      console.log("Super Admin created.");
    } else {
      console.log("Super Admin already exists. Skipping seed.");
      process.exit(0);
    }

    console.log("Creating Businesses...");
    const b1Res = await query("INSERT INTO businesses (business_name, description, active) VALUES ($1, $2, $3) RETURNING id", ["Real Estate", "Real Estate Branch", true]);
    const b2Res = await query("INSERT INTO businesses (business_name, description, active) VALUES ($1, $2, $3) RETURNING id", ["Insurance", "Insurance Branch", true]);
    
    const b1 = b1Res.rows[0].id;
    const b2 = b2Res.rows[0].id;

    console.log("Creating Timings...");
    const timings = ["11:00 AM", "5:00 PM", "8:00 PM"];
    for (const t of timings) {
      await query("INSERT INTO business_timings (business_id, timing_name) VALUES ($1, $2)", [b1, t]);
      await query("INSERT INTO business_timings (business_id, timing_name) VALUES ($1, $2)", [b2, t]);
    }

    console.log("Creating Activity Types & Fields...");
    // Real Estate -> Callings
    const act1Res = await query("INSERT INTO activity_types (business_id, name) VALUES ($1, $2) RETURNING id", [b1, "Callings"]);
    const act1 = act1Res.rows[0].id;

    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act1, "Number of Calls Made", "number", true, 1]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act1, "Number of Answered Calls", "number", true, 2]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act1, "Conversions", "number", true, 3]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act1, "Positive Leads", "number", true, 4]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act1, "Negative Leads", "number", true, 5]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act1, "Description", "textarea", false, 6]);

    // Real Estate -> Field Visits
    const act2Res = await query("INSERT INTO activity_types (business_id, name) VALUES ($1, $2) RETURNING id", [b1, "Field Visits"]);
    const act2 = act2Res.rows[0].id;
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act2, "Number of Visits", "number", true, 1]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act2, "Conversions", "number", true, 2]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act2, "Positive Leads", "number", true, 3]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act2, "Negative Leads", "number", true, 4]);
    await query("INSERT INTO form_fields (activity_type_id, field_name, field_type, required, display_order) VALUES ($1, $2, $3, $4, $5)", [act2, "Description", "textarea", false, 5]);

    console.log("Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
