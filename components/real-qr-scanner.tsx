"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, X, AlertCircle, RefreshCw, Flashlight, FlashlightOff } from "lucide-react"

// Install jsQR: npm install jsqr @types/jsqr
// For now, we'll use a CDN version
declare global {
  interface Window {
    jsQR: any
  }
}

interface RealQRScannerProps {
  onScan: (data: any) => void
  onClose: () => void
}

export function RealQRScanner({ onScan, onClose }: RealQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFlashlight, setHasFlashlight] = useState(false)
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [jsQRLoaded, setJsQRLoaded] = useState(false)

  // Load jsQR library
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"
    script.onload = () => {
      console.log("✅ jsQR library loaded")
      setJsQRLoaded(true)
    }
    script.onerror = () => {
      console.error("❌ Failed to load jsQR library")
      setError("Failed to load QR scanning library")
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
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
    setFlashlightOn(false)
  }, [])

  // Start camera
  const startCamera = useCallback(async () => {
    if (!jsQRLoaded) {
      setError("QR scanning library not loaded yet. Please wait...")
      return
    }

    setError(null)

    try {
      const constraints = [
        // Try back camera first (mobile)
        {
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        },
        // Fallback to any back camera
        {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Fallback to any camera
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Basic constraint
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

      // Check for flashlight capability
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.()
        if (capabilities?.torch) {
          setHasFlashlight(true)
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        const handleLoadedMetadata = () => {
          setCameraStarted(true)
          videoRef.current?.play().then(() => {
            setIsScanning(true)
            startQRScanning()
          })
        }

        videoRef.current.addEventListener("loadedmetadata", handleLoadedMetadata)
      }
    } catch (err: any) {
      console.error("Camera error:", err)
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access and try again.")
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.")
      } else {
        setError("Unable to access camera. Please try again.")
      }
    }
  }, [jsQRLoaded])

  // Start QR code scanning
  const startQRScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(() => {
      if (isScanning && videoRef.current && canvasRef.current && window.jsQR) {
        scanForQRCode()
      }
    }, 100) // Scan every 100ms for better responsiveness
  }, [isScanning])

  // Actual QR code scanning
  const scanForQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !window.jsQR) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for QR scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    try {
      // Use jsQR to detect QR codes
      const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (code) {
        console.log("✅ QR Code detected:", code.data)

        try {
          // Try to parse the QR code data as JSON (our format)
          const studentData = JSON.parse(code.data)

          // Validate that it has the expected structure
          if (studentData.studentId && studentData.name && studentData.email) {
            handleSuccessfulScan(studentData)
          } else {
            console.warn("⚠️ QR code doesn't match expected student format")
            // Still try to process it in case it's a different format
            handleSuccessfulScan({
              studentId: studentData.studentId || "Unknown",
              name: studentData.name || "Unknown Student",
              email: studentData.email || "unknown@email.com",
              section: studentData.section || "Unknown",
              yearLevel: studentData.yearLevel || "Unknown",
              major: studentData.major || "Unknown",
              course: studentData.course || "Unknown",
              id: studentData.id || Date.now().toString(),
            })
          }
        } catch (parseError) {
          console.warn("⚠️ QR code is not JSON format, treating as plain text")
          // If it's not JSON, create a basic student object
          handleSuccessfulScan({
            studentId: code.data,
            name: "QR Code Student",
            email: "qr@student.com",
            section: "Unknown",
            yearLevel: "Unknown",
            major: "Unknown",
            course: "Unknown",
            id: Date.now().toString(),
          })
        }
      }
    } catch (err) {
      console.error("QR scanning error:", err)
    }
  }, [])

  // Handle successful QR scan
  const handleSuccessfulScan = useCallback(
    (data: any) => {
      cleanup()
      onScan(data)
    },
    [cleanup, onScan],
  )

  // Toggle flashlight
  const toggleFlashlight = useCallback(async () => {
    if (!streamRef.current || !hasFlashlight) return

    try {
      const track = streamRef.current.getVideoTracks()[0]
      await track.applyConstraints({
        advanced: [{ torch: !flashlightOn }] as any,
      })
      setFlashlightOn(!flashlightOn)
    } catch (err) {
      console.error("Flashlight error:", err)
    }
  }, [flashlightOn, hasFlashlight])

  // Initialize camera when jsQR is loaded
  useEffect(() => {
    if (jsQRLoaded) {
      startCamera()
    }
    return cleanup
  }, [jsQRLoaded, startCamera, cleanup])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>QR Code Scanner</span>
              </CardTitle>
              <CardDescription>Point camera at student's QR code</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-red-600 text-sm font-medium">Scanner Error</p>
                <p className="text-red-600 text-xs">{error}</p>
              </div>
              <Button onClick={startCamera} variant="outline" className="w-full bg-transparent">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Camera View */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} className="w-full h-64 object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />

                {/* Loading overlay */}
                {!cameraStarted && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">{!jsQRLoaded ? "Loading QR scanner..." : "Starting camera..."}</p>
                    </div>
                  </div>
                )}

                {/* Scanning overlay */}
                {isScanning && cameraStarted && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Scanning frame */}
                      <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg">
                        {/* Corner indicators */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-green-400 rounded-tl"></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-green-400 rounded-tr"></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-green-400 rounded-bl"></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-green-400 rounded-br"></div>
                      </div>

                      {/* Scanning line */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-400 animate-pulse"></div>
                    </div>
                  </div>
                )}

                {/* Flashlight button */}
                {hasFlashlight && cameraStarted && (
                  <button
                    onClick={toggleFlashlight}
                    className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
                  >
                    {flashlightOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
                  </button>
                )}
              </div>

              {/* Status */}
              <div className="text-center space-y-2">
                {isScanning && cameraStarted ? (
                  <>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600 font-medium">Scanning for QR codes...</span>
                    </div>
                    <p className="text-xs text-gray-500">Position the QR code within the frame</p>
                  </>
                ) : cameraStarted ? (
                  <p className="text-sm text-gray-600">Camera ready, starting scanner...</p>
                ) : (
                  <p className="text-sm text-gray-600">Initializing camera...</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2">
                <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
