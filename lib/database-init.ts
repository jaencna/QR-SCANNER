import { supabase } from "./supabase"

export async function initializeDatabase() {
  try {
    console.log("Checking database initialization...")

    // Check if admin_accounts table exists by trying to query it
    const { data: adminCheck, error: adminError } = await supabase.from("admin_accounts").select("id").limit(1)

    if (!adminError) {
      console.log("Database already initialized")
      return true
    }

    console.log("Database not initialized, tables may not exist")

    // If we get here, tables likely don't exist
    // We'll create them using a different approach
    return await createTablesWithSQL()
  } catch (error) {
    console.error("Error checking database:", error)
    return false
  }
}

async function createTablesWithSQL() {
  try {
    console.log("Creating tables using SQL...")

    // Create all tables in one SQL statement
    const createSQL = `
      -- Create Admin Accounts table
      CREATE TABLE IF NOT EXISTS admin_accounts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create Students table
      CREATE TABLE IF NOT EXISTS students (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        student_id VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        section VARCHAR(10) NOT NULL,
        year_level VARCHAR(20) NOT NULL,
        major VARCHAR(255) NOT NULL,
        course VARCHAR(10) NOT NULL,
        qr_code TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create Attendance Records table
      CREATE TABLE IF NOT EXISTS attendance_records (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        student_email VARCHAR(255) NOT NULL,
        section VARCHAR(10) NOT NULL,
        year_level VARCHAR(20) NOT NULL,
        major VARCHAR(255) NOT NULL,
        course VARCHAR(10) NOT NULL,
        event_name VARCHAR(255) NOT NULL,
        login_date DATE NOT NULL,
        login_time TIME NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create Admin Sessions table
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        admin_id UUID NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE
      );

      -- Insert default admin account
      INSERT INTO admin_accounts (username, password) 
      VALUES ('admin', 'password') 
      ON CONFLICT (username) DO NOTHING;
    `

    // Use the sql method to execute raw SQL
    const { error } = await supabase.rpc("sql", { query: createSQL })

    if (error) {
      console.error("Error with sql RPC:", error)
      // If sql RPC doesn't work, try alternative approach
      return await createTablesAlternative()
    }

    console.log("Tables created successfully with SQL")
    return true
  } catch (error) {
    console.error("Error creating tables with SQL:", error)
    return await createTablesAlternative()
  }
}

async function createTablesAlternative() {
  try {
    console.log("Using alternative table creation method...")

    // Try to create default admin account directly
    const { error: insertError } = await supabase
      .from("admin_accounts")
      .insert([{ username: "admin", password: "password" }])

    if (insertError && !insertError.message.includes("duplicate")) {
      console.error("Failed to create default admin:", insertError)
      throw new Error("Database tables do not exist. Please run the setup script manually in Supabase SQL Editor.")
    }

    console.log("Default admin account created or already exists")
    return true
  } catch (error) {
    console.error("Alternative creation failed:", error)
    throw new Error("Database initialization failed. Please run the setup script manually in Supabase SQL Editor.")
  }
}
