"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, ArrowLeft, AlertCircle, User, Mail } from "lucide-react"
import { studentService } from "@/lib/database"
import type { Student } from "@/lib/supabase"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    studentId: "",
  })
  const [studentData, setStudentData] = useState<Student | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setNotFound(false)
    setStudentData(null)
    setQrCodeUrl("")

    try {
      // First try to find by student ID
      let student = await studentService.getByStudentId(formData.studentId)

      if (!student) {
        // If not found by student ID, try to find by email
        const allStudents = await studentService.getAll()
        student = allStudents.find((s) => s.email.toLowerCase() === formData.email.toLowerCase())
      }

      if (!student) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      // Verify that both email and student ID match
      if (student.email.toLowerCase() !== formData.email.toLowerCase() || student.student_id !== formData.studentId) {
        setError("Email and Student ID do not match our records. Please check your information.")
        setIsLoading(false)
        return
      }

      // Generate QR code URL
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(student.qr_code)}`

      setStudentData(student)
      setQrCodeUrl(qrUrl)
    } catch (err: any) {
      console.error("Login error:", err)
      if (err.message?.includes("Database not initialized")) {
        setError("System not available. Please contact administrator.")
      } else {
        setError("Failed to retrieve your information. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const downloadQRCode = async () => {
    if (!qrCodeUrl || !studentData) return

    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${studentData.student_id}-qr-code.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading QR code:", error)
    }
  }

  const resetForm = () => {
    setFormData({ email: "", studentId: "" })
    setStudentData(null)
    setQrCodeUrl("")
    setError(null)
    setNotFound(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <QrCode className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            <span className="text-lg md:text-xl font-bold text-gray-900">QR Attend</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Already Registered?</h1>
            <p className="text-gray-600 text-sm md:text-base">Didn't get your QR code? Login here to retrieve it</p>
          </div>

          {!studentData ? (
            <Card className="shadow-xl border-0">
              <CardHeader>
                <CardTitle>Retrieve Your QR Code</CardTitle>
                <CardDescription>Enter your email and student ID to get your QR code</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-800 text-sm font-medium">Error</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {notFound && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-800 text-sm font-medium">Not Found</p>
                      <p className="text-yellow-700 text-sm mt-1">Not registered yet. Please register first.</p>
                      <Link href="/register" className="inline-block mt-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Register Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>Email Address</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your registered email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="h-12"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="studentId" className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>Student ID</span>
                    </Label>
                    <Input
                      id="studentId"
                      name="studentId"
                      type="text"
                      placeholder="Enter your student ID (e.g., 202210042)"
                      value={formData.studentId}
                      onChange={handleInputChange}
                      required
                      className="h-12"
                      pattern="[0-9]{9}"
                      title="Student ID should be 9 digits"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500">Format: YYYYNNNNN (Year + 5 digits)</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Searching...</span>
                      </div>
                    ) : (
                      "Get My QR Code"
                    )}
                  </Button>
                </form>

                <div className="text-center mt-6">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-blue-600 hover:underline">
                      Register here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Success State - Show QR Code */
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center">
                <CardTitle className="text-green-600">QR Code Retrieved!</CardTitle>
                <CardDescription>Here's your QR code for attendance tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Student Info */}
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg">{studentData.full_name}</h3>
                  <p className="text-gray-600 font-mono">{studentData.student_id}</p>
                  <p className="text-sm text-gray-500">{studentData.email}</p>
                </div>

                {/* QR Code */}
                <div className="text-center">
                  <div className="bg-white p-4 md:p-6 rounded-lg shadow-inner mb-4 inline-block">
                    {qrCodeUrl && (
                      <img
                        src={qrCodeUrl || "/placeholder.svg"}
                        alt="Student QR Code"
                        className="w-48 h-48 md:w-64 md:h-64 mx-auto"
                        crossOrigin="anonymous"
                      />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={downloadQRCode}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>

                  <Button onClick={resetForm} variant="outline" className="w-full bg-transparent">
                    Search Another Student
                  </Button>
                </div>

                {/* Additional Info */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Student Details:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-600">Course:</span>
                      <p className="font-medium">{studentData.course}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Year:</span>
                      <p className="font-medium">{studentData.year_level}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Section:</span>
                      <p className="font-medium">{studentData.section}</p>
                    </div>
                    <div>
                      <span className="text-blue-600">Major:</span>
                      <p className="font-medium">{studentData.major}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
