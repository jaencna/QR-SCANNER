import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "QR Scanner - QR Attend",
  description: "Continuous QR code scanner for student attendance tracking",
}

export default function ScannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
