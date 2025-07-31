"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  QrCode,
  Download,
  Users,
  Clock,
  Calendar,
  ArrowLeft,
  Search,
  Camera,
  Menu,
  Settings,
  UserPlus,
  Key,
  AlertCircle,
  Wifi,
  WifiOff,
  Database,
} from "lucide-react"
import { RealQRScanner } from "@/components/real-qr-scanner"
import { studentService, attendanceService, adminService } from "@/lib/database"
import type { AdminAccount } from "@/lib/supabase"

interface GroupedAttendanceRecord {
  id: string
  studentName: string
  studentId: string
  email: string
  section: string
  yearLevel: string
  major: string
  course: string
  eventName: string
  loginTimestamps: { date: string; time: string; timestamp: string }[]
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(null)
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [attendanceRecords, setAttendanceRecords] = useState<GroupedAttendanceRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEvent, setSelectedEvent] = useState("all")
  const [showScanner, setShowScanner] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [databaseInitialized, setDatabaseInitialized] = useState(false)

  // Admin management states
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([])
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [newAdminForm, setNewAdminForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Check authentication and load initial data
  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const sessionToken = localStorage.getItem("adminSessionToken")
        if (sessionToken) {
          const session = await adminService.validateSession(sessionToken)
          if (session && session.admin_accounts) {
            setIsLoggedIn(true)
            setCurrentAdmin(session.admin_accounts as AdminAccount)
            setDatabaseInitialized(true)
            await loadData()
          } else {
            localStorage.removeItem("adminSessionToken")
          }
        }
      } catch (err: any) {
        console.error("Auth check error:", err)
        localStorage.removeItem("adminSessionToken")
        if (err.message?.includes("Database not initialized")) {
          setDatabaseInitialized(false)
        }
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [])

  // Set up real-time subscriptions when logged in
  useEffect(() => {
    if (!isLoggedIn || !databaseInitialized) return

    const attendanceSubscription = attendanceService.subscribe((payload) => {
      console.log("Attendance change:", payload)
      loadAttendanceData() // Reload attendance data on changes
    })

    const adminSubscription = adminService.subscribe((payload) => {
      console.log("Admin change:", payload)
      loadAdminAccounts() // Reload admin accounts on changes
    })

    return () => {
      attendanceSubscription.unsubscribe()
      adminSubscription.unsubscribe()
    }
  }, [isLoggedIn, databaseInitialized])

  const loadData = async () => {
    try {
      await Promise.all([loadAttendanceData(), loadAdminAccounts()])
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Failed to load data. Please refresh the page.")
    }
  }

  const loadAttendanceData = async () => {
    try {
      const records = await attendanceService.getAll()

      // Group records by student
      const groupedRecords = records.reduce((acc: { [key: string]: GroupedAttendanceRecord }, record) => {
        const key = record.student_id

        if (!acc[key]) {
          acc[key] = {
            id: record.id,
            studentName: record.student_name,
            studentId: record.student_id,
            email: record.student_email,
            section: record.section,
            yearLevel: record.year_level,
            major: record.major,
            course: record.course,
            eventName: record.event_name,
            loginTimestamps: [],
          }
        }

        acc[key].loginTimestamps.push({
          date: record.login_date,
          time: record.login_time,
          timestamp: record.timestamp,
        })

        return acc
      }, {})

      // Sort timestamps for each student
      Object.values(groupedRecords).forEach((record) => {
        record.loginTimestamps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      })

      setAttendanceRecords(Object.values(groupedRecords))
    } catch (err) {
      console.error("Error loading attendance data:", err)
    }
  }

  const loadAdminAccounts = async () => {
    try {
      const accounts = await adminService.getAll()
      setAdminAccounts(accounts)
    } catch (err) {
      console.error("Error loading admin accounts:", err)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const admin = await adminService.authenticate(loginForm.username, loginForm.password)
      if (!admin) {
        setError("Invalid credentials. Please check your username and password.")
        return
      }

      // Update last login and create session
      await adminService.updateLastLogin(admin.id)
      const session = await adminService.createSession(admin.id)

      localStorage.setItem("adminSessionToken", session.session_token)

      setIsLoggedIn(true)
      setCurrentAdmin(admin)
      setDatabaseInitialized(true)
      await loadData()
    } catch (err: any) {
      console.error("Login error:", err)

      if (err.message?.includes("Database not initialized")) {
        setError(
          "Database not initialized. Please run the setup script in your Supabase SQL Editor. Check the instructions below.",
        )
        setDatabaseInitialized(false)
      } else if (err.message?.includes("relation") && err.message?.includes("does not exist")) {
        setError(
          "Database tables do not exist. Please run the setup script in your Supabase SQL Editor. Check the instructions below.",
        )
        setDatabaseInitialized(false)
      } else if (err.message?.includes("network") || err.message?.includes("fetch")) {
        setError("Network error. Please check your internet connection and try again.")
      } else {
        setError("Login failed. Please try again.")
      }
    }
  }

  const handleLogout = async () => {
    try {
      const sessionToken = localStorage.getItem("adminSessionToken")
      if (sessionToken) {
        await adminService.deleteSession(sessionToken)
      }
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      localStorage.removeItem("adminSessionToken")
      setIsLoggedIn(false)
      setCurrentAdmin(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentAdmin) return

    if (changePasswordForm.currentPassword !== currentAdmin.password) {
      alert("Current password is incorrect")
      return
    }

    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      alert("New passwords do not match")
      return
    }

    if (changePasswordForm.newPassword.length < 6) {
      alert("New password must be at least 6 characters long")
      return
    }

    try {
      await adminService.updatePassword(currentAdmin.id, changePasswordForm.newPassword)
      setCurrentAdmin({ ...currentAdmin, password: changePasswordForm.newPassword })
      setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      alert("Password changed successfully!")
    } catch (err) {
      console.error("Password change error:", err)
      alert("Failed to change password. Please try again.")
    }
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newAdminForm.password !== newAdminForm.confirmPassword) {
      alert("Passwords do not match")
      return
    }

    if (newAdminForm.password.length < 6) {
      alert("Password must be at least 6 characters long")
      return
    }

    try {
      await adminService.create({
        username: newAdminForm.username,
        password: newAdminForm.password,
      })

      setNewAdminForm({ username: "", password: "", confirmPassword: "" })
      alert("Admin account created successfully!")
      await loadAdminAccounts()
    } catch (err: any) {
      console.error("Add admin error:", err)
      if (err.code === "23505") {
        alert("Username already exists")
      } else {
        alert("Failed to create admin account. Please try again.")
      }
    }
  }

  const deleteAdmin = async (adminId: string) => {
    if (adminId === currentAdmin?.id) {
      alert("You cannot delete your own account")
      return
    }

    if (confirm("Are you sure you want to delete this admin account?")) {
      try {
        await adminService.delete(adminId)
        await loadAdminAccounts()
      } catch (err) {
        console.error("Delete admin error:", err)
        alert("Failed to delete admin account. Please try again.")
      }
    }
  }

  const exportAttendance = () => {
    try {
      // Import the export utility
      const { exportAttendanceToCSV } = require("@/lib/excel-export")

      // Convert records to export format
      const exportData = filteredRecords.map((record) => ({
        studentName: record.studentName,
        studentId: record.studentId,
        course: record.course,
        section: record.section,
        major: record.major,
        yearLevel: record.yearLevel,
        eventName: record.eventName,
        loginTimestamps: record.loginTimestamps,
      }))

      if (exportData.length === 0) {
        alert("No attendance records to export.")
        return
      }

      // Export with year-level separation
      const summary = exportAttendanceToCSV(exportData)

      // Show export summary
      const yearSummary = Object.entries(summary.byYear)
        .map(([year, count]) => `${year}: ${count}`)
        .join(", ")

      alert(`✅ Export completed!\n\nTotal records: ${summary.totalRecords}\nBy year: ${yearSummary || "No data"}`)
    } catch (error) {
      console.error("Export error:", error)
      alert("❌ Export failed. Please try again.")
    }
  }

  const handleQRScan = async (studentData: any) => {
    try {
      console.log("🎯 QR Code scanned:", studentData)

      const now = new Date()
      const today = now.toISOString().split("T")[0]
      const currentTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })

      // Check if student exists in database
      const student = await studentService.getByStudentId(studentData.studentId)
      if (!student) {
        alert(`❌ Student ${studentData.studentId} not found in database. Please ensure the student is registered.`)
        return
      }

      // Check if already logged in today
      const todayRecords = await attendanceService.getByStudentId(studentData.studentId)
      const alreadyLoggedToday = todayRecords.some((record) => record.login_date === today)

      if (alreadyLoggedToday) {
        alert(`⚠️ ${studentData.name} (${studentData.studentId}) has already logged attendance today.`)
        setShowScanner(false)
        return
      }

      // Create attendance record
      await attendanceService.create({
        student_id: studentData.studentId,
        student_name: studentData.name,
        student_email: studentData.email,
        section: studentData.section,
        year_level: studentData.yearLevel,
        major: studentData.major,
        course: studentData.course,
        event_name: "Live Event",
        login_date: today,
        login_time: currentTime,
        timestamp: now.toISOString(),
      })

      setShowScanner(false)
      alert(
        `✅ Attendance recorded successfully!\n\nStudent: ${studentData.name}\nID: ${studentData.studentId}\nTime: ${currentTime}`,
      )

      // Data will be automatically updated via real-time subscription
    } catch (err) {
      console.error("QR scan error:", err)
      alert("❌ Failed to record attendance. Please try again.")
    }
  }

  const formatLoginTimestamps = (timestamps: { date: string; time: string; timestamp: string }[]) => {
    if (timestamps.length === 0) return <span className="text-gray-500 text-xs">No logins</span>

    return (
      <div className="space-y-1">
        {timestamps.map((entry, index) => {
          const date = new Date(entry.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          return (
            <div key={index} className="text-xs">
              <div className="font-medium text-gray-900">{date}</div>
              <div className="text-gray-600">{entry.time}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const formatMobileLoginTimestamps = (timestamps: { date: string; time: string; timestamp: string }[]) => {
    if (timestamps.length === 0) return "No logins"

    return (
      <div className="space-y-2 mt-2">
        {timestamps.map((entry, index) => {
          const date = new Date(entry.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
          return (
            <div key={index} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded text-xs">
              <span className="font-medium">{date}</span>
              <span className="text-gray-600">{entry.time}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEvent = selectedEvent === "all" || record.eventName === selectedEvent
    return matchesSearch && matchesEvent
  })

  const events = [...new Set(attendanceRecords.map((record) => record.eventName))]
  const totalStudents = new Set(attendanceRecords.map((record) => record.studentId)).size
  const todayRecords = attendanceRecords.filter((record) =>
    record.loginTimestamps.some((entry) => entry.date === new Date().toISOString().split("T")[0]),
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Navigation */}
        <nav className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <QrCode className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <span className="text-lg md:text-xl font-bold text-gray-900">QR Attend</span>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                <span className="text-xs text-gray-500">{isOnline ? "Online" : "Offline"}</span>
              </div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-sm">
                  <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Back to</span> Home
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Admin Login</h1>
              <p className="text-gray-600 text-sm md:text-base">Access the attendance management system</p>
            </div>

            <Card className="shadow-xl border-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg md:text-xl">Staff Login</CardTitle>
                <CardDescription className="text-sm">Enter your credentials to access attendance logs</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-red-700 text-sm font-medium">Setup Required</p>
                        <p className="text-red-600 text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {!databaseInitialized && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Database className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-blue-800 text-sm font-medium">Database Setup Required</p>
                        <p className="text-blue-700 text-sm mt-1">
                          Please run the setup script in your Supabase SQL Editor:
                        </p>
                        <ol className="text-blue-700 text-sm mt-2 list-decimal list-inside space-y-1">
                          <li>Go to your Supabase project dashboard</li>
                          <li>Click on "SQL Editor" in the sidebar</li>
                          <li>Create a new query and paste the setup script</li>
                          <li>Run the script to create the database tables</li>
                        </ol>
                        <p className="text-blue-700 text-sm mt-2">
                          The setup script is available in the project files: <code>scripts/manual-setup.sql</code>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter username"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      required
                      className="h-10 md:h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="h-10 md:h-12"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 md:h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm md:text-base"
                    disabled={!isOnline}
                  >
                    {isOnline ? "Login to Admin Panel" : "Offline - Cannot Login"}
                  </Button>
                </form>

                {databaseInitialized && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs md:text-sm text-green-800">
                      <strong>Default Credentials:</strong>
                      <br />
                      Username: admin
                      <br />
                      Password: password
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation with online status */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2">
              <QrCode className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <span className="text-lg md:text-xl font-bold text-gray-900">QR Attend</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
                <span className="text-xs text-gray-500">{isOnline ? "Online" : "Offline"}</span>
              </div>
              <Badge variant="secondary" className="px-3 py-1">
                Welcome, {currentAdmin?.username}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t pt-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-gray-500">{isOnline ? "Online" : "Offline"}</span>
                </div>
                <Badge variant="secondary" className="px-3 py-1 w-fit">
                  Welcome, {currentAdmin?.username}
                </Badge>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-fit">
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm md:text-base">Manage and monitor student attendance</p>
            {!isOnline && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">⚠️ You're offline. Some features may not work properly.</p>
              </div>
            )}
          </div>

          <Tabs defaultValue="attendance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-6">
              {/* Stats Cards - Mobile Responsive */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <Card className="shadow-lg border-0">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm text-gray-600">Total Students</p>
                        <p className="text-2xl md:text-3xl font-bold text-blue-600">{totalStudents}</p>
                      </div>
                      <Users className="h-8 w-8 md:h-12 md:w-12 text-blue-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm text-gray-600">Today's Logins</p>
                        <p className="text-2xl md:text-3xl font-bold text-green-600">{todayRecords.length}</p>
                      </div>
                      <Clock className="h-8 w-8 md:h-12 md:w-12 text-green-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 sm:col-span-2 lg:col-span-1">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs md:text-sm text-gray-600">Total Events</p>
                        <p className="text-2xl md:text-3xl font-bold text-purple-600">{events.length}</p>
                      </div>
                      <Calendar className="h-8 w-8 md:h-12 md:w-12 text-purple-600 opacity-20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Logs */}
              <Card className="shadow-xl border-0">
                <CardHeader className="pb-4">
                  <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    <div>
                      <CardTitle className="text-lg md:text-xl">Attendance Logs</CardTitle>
                      <CardDescription className="text-sm">
                        View and manage all attendance records (Real-time sync)
                      </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => window.open("/scanner", "_blank")}
                          className="bg-green-600 hover:bg-green-700 text-sm"
                          size="sm"
                          disabled={!isOnline}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Open Scanner
                        </Button>
                        <Button
                          onClick={() => setShowScanner(true)}
                          variant="outline"
                          className="bg-transparent text-sm"
                          size="sm"
                          disabled={!isOnline}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Quick Scan
                        </Button>
                        <Button
                          onClick={exportAttendance}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-sm"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mobile-friendly Filters */}
                  <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4 mb-4 md:mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name or ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-10 text-sm"
                        />
                      </div>
                    </div>
                    <select
                      value={selectedEvent}
                      onChange={(e) => setSelectedEvent(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
                    >
                      <option value="all">All Events</option>
                      {events.map((event) => (
                        <option key={event} value={event}>
                          {event}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="text-xs">Student Name</TableHead>
                          <TableHead className="text-xs">Student ID</TableHead>
                          <TableHead className="text-xs">Course & Year</TableHead>
                          <TableHead className="text-xs">Section</TableHead>
                          <TableHead className="text-xs">Event</TableHead>
                          <TableHead className="text-xs">Login Times</TableHead>
                          <TableHead className="text-xs">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium text-sm">{record.studentName}</TableCell>
                            <TableCell className="text-sm font-mono">{record.studentId}</TableCell>
                            <TableCell className="text-sm">
                              <div>
                                <div className="font-medium">{record.course}</div>
                                <div className="text-xs text-gray-500">{record.yearLevel}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{record.section}</TableCell>
                            <TableCell className="text-sm">{record.eventName}</TableCell>
                            <TableCell className="py-4">
                              <div className="min-w-32">{formatLoginTimestamps(record.loginTimestamps)}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {record.loginTimestamps.length} logins
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {filteredRecords.map((record) => (
                      <Card key={record.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-sm">{record.studentName}</h3>
                              <p className="text-xs text-gray-600 font-mono">{record.studentId}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {record.loginTimestamps.length} logins
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            <div>
                              <span className="text-gray-500">Course:</span>
                              <p className="font-medium">{record.course}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Year:</span>
                              <p className="font-medium">{record.yearLevel}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Section:</span>
                              <p className="font-medium">{record.section}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Event:</span>
                              <p className="font-medium">{record.eventName}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t">
                            <span className="text-gray-500 text-xs font-medium">Login History:</span>
                            {formatMobileLoginTimestamps(record.loginTimestamps)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {filteredRecords.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">No attendance records found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Change Password */}
                <Card className="shadow-xl border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-5 w-5 text-blue-600" />
                      <span>Change Password</span>
                    </CardTitle>
                    <CardDescription>Update your admin account password</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={changePasswordForm.currentPassword}
                          onChange={(e) =>
                            setChangePasswordForm({ ...changePasswordForm, currentPassword: e.target.value })
                          }
                          required
                          disabled={!isOnline}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={changePasswordForm.newPassword}
                          onChange={(e) =>
                            setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })
                          }
                          required
                          minLength={6}
                          disabled={!isOnline}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={changePasswordForm.confirmPassword}
                          onChange={(e) =>
                            setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })
                          }
                          required
                          minLength={6}
                          disabled={!isOnline}
                        />
                      </div>
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={!isOnline}>
                        {isOnline ? "Change Password" : "Offline - Cannot Change"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Add New Admin */}
                <Card className="shadow-xl border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <UserPlus className="h-5 w-5 text-green-600" />
                      <span>Add New Admin</span>
                    </CardTitle>
                    <CardDescription>Create a new admin account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddAdmin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="newUsername">Username</Label>
                        <Input
                          id="newUsername"
                          type="text"
                          value={newAdminForm.username}
                          onChange={(e) => setNewAdminForm({ ...newAdminForm, username: e.target.value })}
                          required
                          minLength={3}
                          disabled={!isOnline}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newAdminPassword">Password</Label>
                        <Input
                          id="newAdminPassword"
                          type="password"
                          value={newAdminForm.password}
                          onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                          required
                          minLength={6}
                          disabled={!isOnline}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmNewAdminPassword">Confirm Password</Label>
                        <Input
                          id="confirmNewAdminPassword"
                          type="password"
                          value={newAdminForm.confirmPassword}
                          onChange={(e) => setNewAdminForm({ ...newAdminForm, confirmPassword: e.target.value })}
                          required
                          minLength={6}
                          disabled={!isOnline}
                        />
                      </div>
                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={!isOnline}>
                        {isOnline ? "Add Admin Account" : "Offline - Cannot Add"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Admin Accounts List */}
              <Card className="shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    <span>Admin Accounts</span>
                  </CardTitle>
                  <CardDescription>Manage all admin accounts (Real-time sync)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {adminAccounts.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{admin.username}</h3>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(admin.created_at).toLocaleDateString()}
                          </p>
                          {admin.last_login && (
                            <p className="text-sm text-gray-500">
                              Last login: {new Date(admin.last_login).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {admin.id === currentAdmin?.id && <Badge variant="secondary">Current User</Badge>}
                          {admin.id !== currentAdmin?.id && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteAdmin(admin.id)}
                              disabled={!isOnline}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {showScanner && <RealQRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}
    </div>
  )
}
