"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, ArrowLeft, AlertCircle, Mail, CheckCircle } from "lucide-react"
import { studentService } from "@/lib/database"
import { sendQRCodeEmailAction } from "@/app/actions/send-email"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: "",
    studentId: "",
    email: "",
    yearLevel: "",
    major: "",
    course: "",
    section: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Check if major field should be shown (only for 2nd, 3rd, 4th year)
  const shouldShowMajor = ["2nd Year", "3rd Year", "4th Year"].includes(formData.yearLevel)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setEmailSent(false)
    setEmailError(null)

    try {
      // Validate course format (should be uppercase letters only)
      const coursePattern = /^[A-Z]+$/
      if (!coursePattern.test(formData.course)) {
        setError("Course should contain only uppercase letters (e.g., BSCS, BSIT, BSEE)")
        setIsLoading(false)
        return
      }

      // Check if student already exists
      const existingStudent = await studentService.getByStudentId(formData.studentId)
      if (existingStudent) {
        setError("A student with this ID already exists. Please use a different student ID.")
        setIsLoading(false)
        return
      }

      // Set major based on year level
      const finalMajor = shouldShowMajor ? formData.major || "Not specified" : "Not applicable"

      // Generate QR code data
      const qrData = JSON.stringify({
        studentId: formData.studentId,
        name: formData.fullName,
        email: formData.email,
        section: formData.section,
        yearLevel: formData.yearLevel,
        major: finalMajor,
        course: formData.course,
        id: crypto.randomUUID(),
      })

      // Create student record in database
      const studentData = {
        student_id: formData.studentId,
        full_name: formData.fullName,
        email: formData.email,
        section: formData.section,
        year_level: formData.yearLevel,
        major: finalMajor,
        course: formData.course,
        qr_code: qrData,
      }

      const newStudent = await studentService.create(studentData)

      // Generate QR code URL for email
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`

      // Send QR code via email using server action
      setEmailSending(true)
      try {
        const emailResult = await sendQRCodeEmailAction({
          to: formData.email,
          subject: `Your QR Code - QR Attend System`,
          studentName: formData.fullName,
          studentId: formData.studentId,
          qrCodeUrl: qrCodeUrl,
          qrData: qrData,
        })

        if (emailResult.success) {
          setEmailSent(true)
          console.log("✅ QR code email sent successfully")
        } else {
          setEmailError(emailResult.error || "Failed to send email")
          console.warn("⚠️ Email sending failed:", emailResult.error)
        }
      } catch (emailError) {
        console.error("❌ Email error:", emailError)
        setEmailError("Failed to send email, but registration was successful")
      } finally {
        setEmailSending(false)
      }

      // Store student ID in localStorage for dashboard access
      localStorage.setItem("currentStudentId", newStudent.student_id)

      // Small delay to show email status before redirect
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err: any) {
      console.error("Registration error:", err)
      if (err.code === "23505") {
        if (err.message.includes("email")) {
          setError("This email address is already registered. Please use a different email.")
        } else if (err.message.includes("student_id")) {
          setError("This student ID is already registered. Please use a different student ID.")
        } else {
          setError("This information is already registered. Please check your details.")
        }
      } else {
        setError("Registration failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Auto-uppercase course field
    if (name === "course") {
      setFormData({
        ...formData,
        [name]: value.toUpperCase(),
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }
  }

  const handleYearLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYearLevel = e.target.value
    setFormData({
      ...formData,
      yearLevel: newYearLevel,
      // Clear major if switching to 1st year
      major: ["2nd Year", "3rd Year", "4th Year"].includes(newYearLevel) ? formData.major : "",
    })
  }

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      section: e.target.value,
    })
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
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Registration</h1>
            <p className="text-gray-600">Create your account to get your unique QR code</p>
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle>Register Now</CardTitle>
              <CardDescription>Fill in your details to get started with QR attendance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-800 text-sm font-medium">Registration Error</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Email Status */}
              {emailSending && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5"></div>
                  <div>
                    <p className="text-blue-800 text-sm font-medium">Sending QR Code...</p>
                    <p className="text-blue-700 text-sm mt-1">We're sending your QR code to your email address.</p>
                  </div>
                </div>
              )}

              {emailSent && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-800 text-sm font-medium">QR Code Sent!</p>
                    <p className="text-green-700 text-sm mt-1">
                      Your QR code has been sent to <strong>{formData.email}</strong>. Check your inbox!
                    </p>
                  </div>
                </div>
              )}

              {emailError && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-800 text-sm font-medium">Email Issue</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Registration successful, but email failed: {emailError}. You can still download your QR code from
                      the dashboard.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="h-12"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
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
                    title="Student ID should be 9 digits (e.g., 202210042)"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">Format: YYYYNNNNN (Year + 5 digits)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>Email Address</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="h-12"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-blue-600">📧 Your QR code will be sent to this email</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearLevel">Year Level</Label>
                  <select
                    id="yearLevel"
                    name="yearLevel"
                    value={formData.yearLevel}
                    onChange={handleYearLevelChange}
                    required
                    className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value="">Select Year Level</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                {/* Conditional Major Field - Only show for 2nd, 3rd, 4th year */}
                {shouldShowMajor && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <Label htmlFor="major">
                      Major <span className="text-gray-400 text-sm">(Optional)</span>
                    </Label>
                    <Input
                      id="major"
                      name="major"
                      type="text"
                      placeholder="Enter your major (optional)"
                      value={formData.major}
                      onChange={handleInputChange}
                      className="h-12"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500">Specify your area of specialization or concentration</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    name="course"
                    type="text"
                    placeholder="Enter your course (e.g., BSCS, BSIT)"
                    value={formData.course}
                    onChange={handleInputChange}
                    required
                    className="h-12"
                    disabled={isLoading}
                    pattern="[A-Z]+"
                    title="Course should contain only uppercase letters"
                  />
                  <p className="text-xs text-gray-500">Use uppercase letters only (e.g., BSCS, BSIT, BSEE)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section</Label>
                  <select
                    id="section"
                    name="section"
                    value={formData.section}
                    onChange={handleSectionChange}
                    required
                    className="h-12 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value="">Select Section</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                    <option value="E">Section E</option>
                    <option value="F">Section F</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    "Register & Get QR Code"
                  )}
                </Button>
              </form>

              {/* Email Info */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-800 text-sm font-medium">QR Code Delivery</p>
                    <p className="text-blue-700 text-sm mt-1">
                      After registration, your QR code will be automatically sent to your email address. You can also
                      download it from your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Get your QR code here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
