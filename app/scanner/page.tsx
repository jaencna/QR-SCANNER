"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle, CheckCircle, Lock, RefreshCw } from "lucide-react"

interface StudentQRData {
  studentId: string
  name: string
  email: string
  section: string
  yearLevel: string
  major: string
  course: string
  id: string
}

export default function ScannerPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const returnTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastScannedStudent, setLastScannedStudent] = useState<StudentQRData | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (returnTimeoutRef.current) {
      clearTimeout(returnTimeoutRef.current)
      returnTimeoutRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setCameraStarted(false)
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    setError(null)
    setPermissionDenied(false)

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported in this browser")
      }

      // Try different camera configurations
      const constraints = [
        {
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        },
        {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        { video: true },
      ]

      let stream: MediaStream | null = null

      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break
        } catch (err) {
          continue
        }
      }

      if (!stream) {
        throw new Error("Could not access camera")
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        const handleLoadedMetadata = () => {
          setCameraStarted(true)
          videoRef.current?.play().then(() => {
            setIsScanning(true)
            startContinuousScanning()
          })
        }

        videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)
      }
    } catch (err: any) {
      console.error("Camera error:", err)

      if (err.name === "NotAllowedError") {
        setPermissionDenied(true)
        setError("Camera permission denied. Please allow camera access and refresh the page.")
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.")
      } else if (err.name === "NotReadableError") {
        setError("Camera is being used by another application.")
      } else {
        setError("Unable to access camera. Please check permissions and try again.")
      }
    }
  }, [])

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const adminSessionToken = localStorage.getItem("adminSessionToken")
      if (adminSessionToken) {
        setIsAuthenticated(true)
        // Start camera immediately after authentication
        setTimeout(() => {
          startCamera()
        }, 100)
      } else {
        router.push("/admin")
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  const startContinuousScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(() => {
      if (isScanning && videoRef.current && canvasRef.current && !showSuccess && videoRef.current.readyState === 4) {
        scanQRCode()
      }
    }, 500)
  }, [isScanning, showSuccess])

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Simulate QR detection (replace with real jsQR implementation)
    if (Math.random() > 0.995) {
      // Very low chance for demo
      const mockStudentData: StudentQRData = {
        studentId: `202${Math.floor(Math.random() * 3) + 1}10${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
        name: ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson", "David Brown"][Math.floor(Math.random() * 5)],
        email: "student@university.edu",
        section: ["A", "B", "C", "D", "E", "F"][Math.floor(Math.random() * 6)],
        yearLevel: ["1st Year", "2nd Year", "3rd Year", "4th Year"][Math.floor(Math.random() * 4)],
        major: ["Computer Science", "Information Technology", "Engineering", "Business"][Math.floor(Math.random() * 4)],
        course: ["BSCS", "BSIT", "BSEE", "BSBA"][Math.floor(Math.random() * 4)],
        id: Date.now().toString(),
      }

      handleSuccessfulScan(mockStudentData)
    }
  }, [])

  const handleSuccessfulScan = useCallback(
    (studentData: StudentQRData) => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }

      console.log("Attendance recorded:", {
        student: studentData,
        date: new Date().toISOString().split("T")[0],
        timestamp: new Date().toISOString(),
      })

      setLastScannedStudent(studentData)
      setShowSuccess(true)
      setScanCount((prev) => prev + 1)

      returnTimeoutRef.current = setTimeout(() => {
        setShowSuccess(false)
        setLastScannedStudent(null)

        if (isScanning && cameraStarted) {
          startContinuousScanning()
        }
      }, 3000)
    },
    [isScanning, cameraStarted, startContinuousScanning],
  )

  // Demo scan function
  const handleDemoScan = useCallback(() => {
    const demoStudent: StudentQRData = {
      studentId: "202210042",
      name: "Demo Student",
      email: "demo@university.edu",
      section: "A",
      yearLevel: "2nd Year",
      major: "Information Technology",
      course: "BSIT",
      id: Date.now().toString(),
    }
    handleSuccessfulScan(demoStudent)
  }, [handleSuccessfulScan])

  // Auto-start camera when authenticated
  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white p-8">
          <Lock className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-300 mb-6">You must be logged in as an admin to access the scanner.</p>
          <Link href="/admin">
            <Button className="bg-blue-600 hover:bg-blue-700">Go to Admin Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="text-white text-center">
            <h1 className="text-lg font-semibold">QR Scanner</h1>
            <p className="text-sm text-gray-300">Scans: {scanCount}</p>
          </div>
          <Button onClick={handleDemoScan} variant="ghost" size="sm" className="text-white hover:bg-white/20">
            Demo Scan
          </Button>
        </div>
      </div>

      {/* Camera View */}
      {!error && (
        <div className="relative w-full h-screen">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Loading overlay */}
          {!cameraStarted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg">Starting camera...</p>
              </div>
            </div>
          )}

          {/* Scanning Overlay */}
          {isScanning && cameraStarted && !showSuccess && (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Scanning Frame */}
              <div className="relative">
                <div className="w-64 h-64 md:w-80 md:h-80 border-4 border-white border-dashed rounded-2xl animate-pulse">
                  {/* Corner indicators */}
                  <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4 border-green-400 rounded-tl-lg"></div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4 border-green-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4 border-green-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4 border-green-400 rounded-br-lg"></div>
                </div>

                {/* Scanning line animation */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"></div>
                </div>
              </div>

              {/* Instructions */}
              <div className="absolute bottom-32 left-0 right-0 text-center">
                <div className="bg-black/70 backdrop-blur-sm rounded-full px-6 py-3 mx-4">
                  <div className="flex items-center justify-center space-x-2 text-white">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-lg font-medium">Scanning for QR codes...</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">Position QR code within the frame</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center h-screen bg-gray-900">
          <div className="text-center text-white p-8 max-w-md">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Camera Access Required</h2>
            <p className="text-gray-300 mb-6">{error}</p>

            {permissionDenied && (
              <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg text-left">
                <p className="text-yellow-200 text-sm font-medium mb-2">To enable camera:</p>
                <ul className="text-yellow-300 text-sm list-disc list-inside space-y-1">
                  <li>Click the camera icon in your browser's address bar</li>
                  <li>Select "Allow" for camera permissions</li>
                  <li>Refresh the page</li>
                </ul>
              </div>
            )}

            <div className="space-y-3">
              <Button onClick={startCamera} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <br />
              <Button
                onClick={handleDemoScan}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-black bg-transparent"
              >
                Demo Scan
              </Button>
              <br />
              <Link href="/admin">
                <Button
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-black bg-transparent"
                >
                  Go Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccess && lastScannedStudent && (
        <div className="absolute inset-0 bg-green-600 flex items-center justify-center z-30">
          <div className="text-center text-white p-8 max-w-md mx-4">
            <div className="mb-6">
              <CheckCircle className="h-24 w-24 mx-auto mb-4 animate-bounce" />
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Attendance Complete</h1>
              <div className="w-16 h-1 bg-white mx-auto rounded-full"></div>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-2">{lastScannedStudent.name}</h2>
              <p className="text-lg font-mono mb-1">{lastScannedStudent.studentId}</p>
              <p className="text-green-100">
                {lastScannedStudent.course} • {lastScannedStudent.yearLevel} • Section {lastScannedStudent.section}
              </p>
            </div>

            <div className="flex items-center justify-center space-x-2 text-green-100">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm">Returning to scanner...</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      {isScanning && cameraStarted && !showSuccess && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 z-20">
          <div className="flex items-center justify-center space-x-4 text-white">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Camera Active</span>
            </div>
            <div className="w-px h-4 bg-gray-400"></div>
            <div className="text-sm">Ready to scan</div>
          </div>
        </div>
      )}
    </div>
  )
}
