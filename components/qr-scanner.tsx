"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, X, AlertCircle, Flashlight, FlashlightOff, RefreshCw } from "lucide-react"

interface QRScannerProps {
  onScan: (data: any) => void
  onClose: () => void
}

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

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFlashlight, setHasFlashlight] = useState(false)
  const [flashlightOn, setFlashlightOn] = useState(false)
  const [cameraStarted, setCameraStarted] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
    setCameraStarted(false)
    setFlashlightOn(false)
  }, [])

  // Start camera with multiple fallback strategies
  const startCamera = useCallback(async () => {
    setError(null)
    setPermissionDenied(false)

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported in this browser")
      }

      // Try different camera configurations
      const constraints = [
        // Try back camera first (mobile)
        {
          video: {
            facingMode: { exact: "environment" },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
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
        // Fallback to front camera
        {
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Basic video constraint
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        // Minimal constraint
        { video: true },
      ]

      let stream: MediaStream | null = null
      let lastError: Error | null = null

      // Try each constraint until one works
      for (const constraint of constraints) {
        try {
          console.log("Trying camera constraint:", constraint)
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break
        } catch (err) {
          console.warn("Camera constraint failed:", constraint, err)
          lastError = err as Error
          continue
        }
      }

      if (!stream) {
        throw lastError || new Error("Could not access camera with any configuration")
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

      // Set up video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Wait for video to load
        const video = videoRef.current

        const handleLoadedMetadata = () => {
          console.log("Video metadata loaded")
          setCameraStarted(true)

          video
            .play()
            .then(() => {
              console.log("Video playing")
              setIsScanning(true)
              startScanning()
            })
            .catch((playErr) => {
              console.error("Video play error:", playErr)
              setError("Failed to start video playback. Please try again.")
            })
        }

        const handleError = (err: Event) => {
          console.error("Video error:", err)
          setError("Video playback error. Please try again.")
        }

        video.addEventListener("loadedmetadata", handleLoadedMetadata)
        video.addEventListener("error", handleError)

        // Cleanup event listeners
        return () => {
          video.removeEventListener("loadedmetadata", handleLoadedMetadata)
          video.removeEventListener("error", handleError)
        }
      }
    } catch (err: any) {
      console.error("Camera access error:", err)

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionDenied(true)
        setError("Camera permission denied. Please allow camera access and try again.")
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No camera found on this device.")
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError("Camera is being used by another application. Please close other camera apps and try again.")
      } else if (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError") {
        setError("Camera doesn't support the required settings. Trying basic mode...")
        // Try one more time with minimal constraints
        setTimeout(() => tryBasicCamera(), 1000)
      } else if (err.name === "SecurityError") {
        setError("Camera access blocked by security settings. Please check your browser permissions.")
      } else {
        setError(`Camera error: ${err.message || "Unknown error"}. Please try again.`)
      }
    }
  }, [])

  // Try basic camera as last resort
  const tryBasicCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraStarted(true)

        videoRef.current.play().then(() => {
          setIsScanning(true)
          startScanning()
          setError(null)
        })
      }
    } catch (err) {
      console.error("Basic camera failed:", err)
      setError("Unable to access camera with any settings. Please check your device and browser permissions.")
    }
  }, [])

  // Start scanning for QR codes
  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    scanIntervalRef.current = setInterval(() => {
      if (isScanning && videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        scanForQRCode()
      }
    }, 500)
  }, [isScanning])

  // Scan for QR codes
  const scanForQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      // For now, simulate QR detection (replace with jsQR when available)
      // In production, you would use: const code = jsQR(imageData.data, imageData.width, imageData.height)

      // Simulate finding a QR code occasionally for demo
      if (Math.random() > 0.98) {
        // 2% chance per scan
        const mockStudent: StudentQRData = {
          studentId: `202${Math.floor(Math.random() * 3) + 1}10${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
          name: ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson", "David Brown"][
            Math.floor(Math.random() * 5)
          ],
          email: "student@university.edu",
          section: ["A", "B", "C", "D", "E", "F"][Math.floor(Math.random() * 6)],
          yearLevel: ["1st Year", "2nd Year", "3rd Year", "4th Year"][Math.floor(Math.random() * 4)],
          major: ["Computer Science", "Information Technology", "Engineering", "Business"][
            Math.floor(Math.random() * 4)
          ],
          course: ["BSCS", "BSIT", "BSEE", "BSBA"][Math.floor(Math.random() * 4)],
          id: Date.now().toString(),
        }

        handleSuccessfulScan(mockStudent)
      }
    } catch (err) {
      console.error("QR scanning error:", err)
    }
  }, [])

  // Handle successful QR scan
  const handleSuccessfulScan = useCallback(
    (data: StudentQRData) => {
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

  // Manual demo scan
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

  // Initialize camera on mount
  useEffect(() => {
    startCamera()
    return cleanup
  }, [startCamera, cleanup])

  // Handle close
  const handleClose = useCallback(() => {
    cleanup()
    onClose()
  }, [cleanup, onClose])

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
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-red-600 text-sm font-medium">Camera Error</p>
                <p className="text-red-600 text-xs">{error}</p>
              </div>

              <div className="space-y-2">
                {permissionDenied && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                    <p className="text-yellow-800 text-xs font-medium">To enable camera:</p>
                    <ul className="text-yellow-700 text-xs mt-1 list-disc list-inside space-y-1">
                      <li>Click the camera icon in your browser's address bar</li>
                      <li>Select "Allow" for camera permissions</li>
                      <li>Refresh the page if needed</li>
                    </ul>
                  </div>
                )}

                <Button onClick={startCamera} variant="outline" className="w-full bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>

                <Button onClick={handleDemoScan} variant="outline" className="w-full bg-transparent">
                  Demo Scan (For Testing)
                </Button>
              </div>
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
                      <p className="text-sm">Starting camera...</p>
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
                <Button onClick={handleDemoScan} variant="outline" className="flex-1 bg-transparent">
                  Demo Scan
                </Button>
                <Button onClick={handleClose} variant="outline" className="flex-1 bg-transparent">
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
