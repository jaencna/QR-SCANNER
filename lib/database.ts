import { supabase, type Student, type AttendanceRecord, type AdminAccount } from "./supabase"

// Simple check if tables exist
async function checkTablesExist() {
  try {
    // Try a simple query to check if tables exist
    const { error } = await supabase.from("admin_accounts").select("id").limit(1)
    return !error
  } catch {
    return false
  }
}

// Student operations
export const studentService = {
  async create(studentData: Omit<Student, "id" | "created_at" | "updated_at">) {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      throw new Error("Database not initialized. Please run the setup script in Supabase SQL Editor.")
    }

    const { data, error } = await supabase.from("students").insert([studentData]).select().single()

    if (error) throw error
    return data
  },

  async getAll() {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      throw new Error("Database not initialized. Please run the setup script in Supabase SQL Editor.")
    }

    const { data, error } = await supabase.from("students").select("*").order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  },

  async getByStudentId(studentId: string) {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      throw new Error("Database not initialized. Please run the setup script in Supabase SQL Editor.")
    }

    const { data, error } = await supabase.from("students").select("*").eq("student_id", studentId).single()

    if (error && error.code !== "PGRST116") throw error
    return data
  },

  async update(id: string, updates: Partial<Student>) {
    const { data, error } = await supabase.from("students").update(updates).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("students").delete().eq("id", id)

    if (error) throw error
  },

  // Real-time subscription
  subscribe(callback: (payload: any) => void) {
    return supabase
      .channel("students_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, callback)
      .subscribe()
  },
}

// Attendance operations
export const attendanceService = {
  async create(attendanceData: Omit<AttendanceRecord, "id" | "created_at">) {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      throw new Error("Database not initialized. Please run the setup script in Supabase SQL Editor.")
    }

    const { data, error } = await supabase.from("attendance_records").insert([attendanceData]).select().single()

    if (error) throw error
    return data
  },

  async getAll() {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      return [] // Return empty array if tables don't exist
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .order("timestamp", { ascending: false })

    if (error) throw error
    return data || []
  },

  async getByStudentId(studentId: string) {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      return [] // Return empty array if tables don't exist
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", studentId)
      .order("timestamp", { ascending: false })

    if (error) throw error
    return data || []
  },

  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .gte("login_date", startDate)
      .lte("login_date", endDate)
      .order("timestamp", { ascending: false })

    if (error) throw error
    return data || []
  },

  // Real-time subscription
  subscribe(callback: (payload: any) => void) {
    return supabase
      .channel("attendance_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, callback)
      .subscribe()
  },
}

// Admin operations
export const adminService = {
  async create(adminData: Omit<AdminAccount, "id" | "created_at" | "updated_at" | "last_login">) {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      throw new Error("Database not initialized. Please run the setup script in Supabase SQL Editor.")
    }

    const { data, error } = await supabase.from("admin_accounts").insert([adminData]).select().single()

    if (error) throw error
    return data
  },

  async getAll() {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      return [] // Return empty array if tables don't exist
    }

    const { data, error } = await supabase.from("admin_accounts").select("*").order("created_at", { ascending: false })

    if (error) throw error
    return data || []
  },

  async authenticate(username: string, password: string) {
    const tablesExist = await checkTablesExist()
    if (!tablesExist) {
      throw new Error("Database not initialized. Please run the setup script in Supabase SQL Editor.")
    }

    try {
      const { data, error } = await supabase
        .from("admin_accounts")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single()

      if (error && error.code !== "PGRST116") throw error
      return data
    } catch (error: any) {
      console.error("Authentication error:", error)
      throw error
    }
  },

  async updateLastLogin(id: string) {
    const { data, error } = await supabase
      .from("admin_accounts")
      .update({ last_login: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updatePassword(id: string, newPassword: string) {
    const { data, error } = await supabase
      .from("admin_accounts")
      .update({ password: newPassword })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("admin_accounts").delete().eq("id", id)

    if (error) throw error
  },

  // Session management
  async createSession(adminId: string) {
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 8) // 8 hours from now

    const { data, error } = await supabase
      .from("admin_sessions")
      .insert([
        {
          admin_id: adminId,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async validateSession(sessionToken: string) {
    const { data, error } = await supabase
      .from("admin_sessions")
      .select(`
        *,
        admin_accounts (*)
      `)
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (error && error.code !== "PGRST116") throw error
    return data
  },

  async deleteSession(sessionToken: string) {
    const { error } = await supabase.from("admin_sessions").delete().eq("session_token", sessionToken)

    if (error) throw error
  },

  // Real-time subscription
  subscribe(callback: (payload: any) => void) {
    return supabase
      .channel("admin_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_accounts" }, callback)
      .subscribe()
  },
}
