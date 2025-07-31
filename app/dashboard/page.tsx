"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { QrCode, Download, User, Mail, Hash, Calendar, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react"
import { studentService } from "@/lib/database"
import type { Student } from "@/lib/supabase"

export default function DashboardPage() {
  const router = useRouter()
  const [studentData, setStudentData] = useState<Student | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        const currentStudentId = localStorage.getItem("currentStudentId")
        if (!currentStudentId) {
          router.push("/register")
          return
        }

        const student = await studentService.getByStudentId(currentStudentId)
        if (!student) {
          localStorage.removeItem("currentStudentId")
          router.push("/register")
          return
        }

        setStudentData(student)

        // Generate QR code URL
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(student.qr_code)}`
        setQrCodeUrl(qrUrl)
      } catch (err) {
        console.error("Error loading student data:", err)
        setError("Failed to load student data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    loadStudentData()
  }, [router])

  const downloadQRCode = async () => {
    if (!qrCodeUrl) return

    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${studentData?.student_id}-qr-code.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading QR code:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            <Link href="/register">
              <Button variant="outline">Register New Account</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Student data not found. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <QrCode className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">QR Attend</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="px-3 py-1">
              Student Dashboard
            </Badge>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Welcome, {studentData.full_name}!</h1>
            <p className="text-gray-600">Your QR code is ready for attendance tracking</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
            {/* QR Code Card */}
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <QrCode className="h-6 w-6 text-blue-600" />
                  <span>Your QR Code</span>
                </CardTitle>
                <CardDescription>Show this QR code at events for instant attendance logging</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="bg-white p-4 md:p-6 rounded-lg shadow-inner mb-4 md:mb-6 inline-block">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl || "/placeholder.svg"}
                      alt="Student QR Code"
                      className="w-48 h-48 md:w-64 md:h-64 mx-auto"
                      crossOrigin="anonymous"
                    />
                  )}
                </div>
                <Button
                  onClick={downloadQRCode}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </CardContent>
            </Card>

            {/* Email Confirmation Card */}
            <Card className="shadow-xl border-0 mt-6">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">QR Code Sent to Email</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your QR code has been sent to <strong>{studentData.email}</strong>. Check your inbox for easy
                      access to your QR code anytime!
                    </p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>

            {/* Profile Information Card */}
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-6 w-6 text-purple-600" />
                  <span>Profile Information</span>
                </CardTitle>
                <CardDescription>Your registered details and account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="font-medium">{studentData.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Hash className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Student ID</p>
                      <p className="font-medium">{studentData.student_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="font-medium">{studentData.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Hash className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Section</p>
                      <p className="font-medium">{studentData.section}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Year Level</p>
                      <p className="font-medium">{studentData.year_level}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Major</p>
                      <p className="font-medium">{studentData.major}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Hash className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Course</p>
                      <p className="font-medium">{studentData.course}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500">Registered On</p>
                      <p className="font-medium">{new Date(studentData.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-800 font-medium">Account Active</span>
                    </div>
                    <p className="text-green-700 text-sm mt-1">Your QR code is ready for attendance tracking</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions Card */}
          <Card className="shadow-xl border-0 mt-8">
            <CardHeader>
              <CardTitle>How to Use Your QR Code</CardTitle>
              <CardDescription>Follow these simple steps to log your attendance at events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Save Your QR Code</h3>
                  <p className="text-sm text-gray-600">Download and save your QR code to your phone or print it out</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Show at Events</h3>
                  <p className="text-sm text-gray-600">Present your QR code to staff at the event entrance</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Attendance Logged</h3>
                  <p className="text-sm text-gray-600">Your attendance will be automatically recorded with timestamp</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
