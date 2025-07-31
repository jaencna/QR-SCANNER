"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, X, AlertCircle, RefreshCw } from "lucide-react"

interface SimpleQRScannerProps {
  onScan: (data: any) => void
  onClose: () => void
}

export function SimpleQRScanner({ onScan, onClose }: SimpleQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const startCamera = async () => {
    setError(null)
    setIsLoading(true)

    try {
      console.log("Requesting camera access...")

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Try back camera first
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      console.log("Camera access granted")
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded")
          videoRef.current?.play()
          setIsLoading(false)
        }
      }
    } catch (err: any) {
      console.error("Camera error:", err)

      // Try with basic constraints
      try {
        console.log("Trying basic camera constraints...")
        const basicStream = await navigator.mediaDevices.getUserMedia({ video: true })
        setStream(basicStream)

        if (videoRef.current) {
          videoRef.current.srcObject = basicStream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            setIsLoading(false)
          }
        }
      } catch (basicErr: any) {
        console.error("Basic camera failed:", basicErr)
        setError(`Camera access failed: ${basicErr.message}`)
        setIsLoading(false)
      }
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  const handleDemoScan = () => {
    const demoData = {
      studentId: "202210042",
      name: "Demo Student",
      email: "demo@university.edu",
      section: "A",
      yearLevel: "2nd Year",
      major: "Information Technology",
      course: "BSIT",
      id: Date.now().toString(),
    }
    onScan(demoData)
  }

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>QR Scanner</span>
              </CardTitle>
              <CardDescription>Camera-based QR code scanner</CardDescription>
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
              <div>
                <p className="text-red-600 text-sm font-medium">Camera Error</p>
                <p className="text-red-600 text-xs mt-1">{error}</p>
              </div>
              <div className="space-y-2">
                <Button onClick={startCamera} variant="outline" className="w-full bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={handleDemoScan} className="w-full bg-blue-600 hover:bg-blue-700">
                  Use Demo Scan
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video ref={videoRef} className="w-full h-64 object-cover" autoPlay playsInline muted />

                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}

                {!isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 border-green-400"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 border-green-400"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 border-green-400"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 border-green-400"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center">
                {isLoading ? (
                  <p className="text-sm text-gray-600">Initializing camera...</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600 font-medium">Camera ready</span>
                    </div>
                    <p className="text-xs text-gray-500">Position QR code in the frame</p>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleDemoScan} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Demo Scan
                </Button>
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
