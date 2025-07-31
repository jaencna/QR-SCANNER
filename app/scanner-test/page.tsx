"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Camera, AlertCircle } from "lucide-react"

export default function ScannerTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraStarted, setCameraStarted] = useState(false)

  const startCamera = async () => {
    console.log("🎥 Starting camera...")
    setError(null)

    try {
      // Request camera permission
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      })

      console.log("✅ Camera access granted")
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream

        videoRef.current.onloadedmetadata = () => {
          console.log("📹 Video loaded, starting playback")
          videoRef.current
            ?.play()
            .then(() => {
              console.log("▶️ Video playing")
              setCameraStarted(true)
            })
            .catch((err) => {
              console.error("❌ Play error:", err)
              setError("Failed to start video playback")
            })
        }

        videoRef.current.onerror = (err) => {
          console.error("❌ Video error:", err)
          setError("Video playback error")
        }
      }
    } catch (err: any) {
      console.error("❌ Camera error:", err)
      setError(`Camera access failed: ${err.message}`)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setCameraStarted(false)
  }

  useEffect(() => {
    startCamera()
    return stopCamera
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="p-4 bg-black/50">
        <div className="flex items-center justify-between">
          <Link href="/admin">
            <Button variant="ghost" className="text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Camera Test</h1>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center p-4">
        {error ? (
          <div className="text-center max-w-md">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Camera Error</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={startCamera} className="w-full bg-blue-600 hover:bg-blue-700">
                <Camera className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <div className="text-sm text-gray-400">
                <p>Make sure to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Allow camera permissions</li>
                  <li>Close other camera apps</li>
                  <li>Try refreshing the page</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-96 object-cover" autoPlay playsInline muted />

              {!cameraStarted && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg">Starting camera...</p>
                  </div>
                </div>
              )}

              {cameraStarted && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-4 border-white border-dashed w-64 h-64 rounded-lg">
                    <div className="absolute -top-2 -left-2 w-8 h-8 border-l-4 border-t-4 border-green-400"></div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 border-r-4 border-t-4 border-green-400"></div>
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-4 border-b-4 border-green-400"></div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-4 border-b-4 border-green-400"></div>
                  </div>
                </div>
              )}
            </div>

            {cameraStarted && (
              <div className="text-center mt-4">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Camera Active</span>
                </div>
                <p className="text-gray-300">Camera is working! QR scanning would happen here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
