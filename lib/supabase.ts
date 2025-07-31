import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface Student {
  id: string
  student_id: string
  full_name: string
  email: string
  section: string
  year_level: string
  major: string
  course: string
  qr_code: string
  created_at: string
  updated_at: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  student_email: string
  section: string
  year_level: string
  major: string
  course: string
  event_name: string
  login_date: string
  login_time: string
  timestamp: string
  created_at: string
}

export interface AdminAccount {
  id: string
  username: string
  password: string
  created_at: string
  last_login?: string
  updated_at: string
}

export interface AdminSession {
  id: string
  admin_id: string
  session_token: string
  expires_at: string
  created_at: string
}
