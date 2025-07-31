"use server"

export async function sendQRCodeEmailAction(emailData: {
  to: string
  subject: string
  studentName: string
  studentId: string
  qrCodeUrl: string
  qrData: string
}) {
  try {
    console.log("📧 Attempting to send email to:", emailData.to)

    // Check if Resend API key is available
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY not found in environment variables")
      return {
        success: false,
        error: "Email service not configured. Please contact administrator.",
      }
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "QR Attend <onboarding@resend.dev>", // Use Resend's default domain
        to: [emailData.to],
        subject: emailData.subject,
        html: generateEmailHTML(emailData),
        text: generateEmailText(emailData),
      }),
    })

    const responseData = await response.json()
    console.log("📧 Resend API response:", responseData)

    if (!response.ok) {
      console.error("❌ Resend API error:", responseData)
      return {
        success: false,
        error: `Email service error: ${responseData.message || "Unknown error"}`,
      }
    }

    console.log("✅ Email sent successfully:", responseData.id)
    return { success: true, error: null }
  } catch (error) {
    console.error("❌ Server action email error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}

function generateEmailHTML(emailData: {
  to: string
  subject: string
  studentName: string
  studentId: string
  qrCodeUrl: string
  qrData: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your QR Code - QR Attend</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8fafc;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 8px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .qr-section {
          text-align: center;
          margin: 32px 0;
          padding: 24px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .qr-code {
          max-width: 200px;
          height: auto;
          margin: 16px auto;
          display: block;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px;
          background: white;
        }
        .student-info {
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 4px 0;
        }
        .info-label {
          font-weight: 600;
          color: #374151;
        }
        .info-value {
          color: #1f2937;
          font-family: monospace;
        }
        .instructions {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
        }
        .instructions h3 {
          color: #166534;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .instructions ol {
          color: #166534;
          margin: 0;
          padding-left: 20px;
        }
        .instructions li {
          margin-bottom: 8px;
        }
        .footer {
          text-align: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎯 QR Attend</div>
          <h1 class="title">Your QR Code is Ready!</h1>
          <p>Welcome to the QR Attendance System</p>
        </div>

        <div class="qr-section">
          <h2>Your Personal QR Code</h2>
          <img src="${emailData.qrCodeUrl}" alt="Your QR Code for ${emailData.studentName}" class="qr-code" />
          <p><strong>Save this QR code</strong> - you'll need it for attendance at events!</p>
        </div>

        <div class="student-info">
          <h3>📋 Your Registration Details</h3>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${emailData.studentName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Student ID:</span>
            <span class="info-value">${emailData.studentId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${emailData.to}</span>
          </div>
        </div>

        <div class="instructions">
          <h3>📱 How to Use Your QR Code</h3>
          <ol>
            <li><strong>Save the QR code</strong> to your phone or print it out</li>
            <li><strong>Bring it to events</strong> - show it to staff at the entrance</li>
            <li><strong>Get scanned</strong> - your attendance will be logged automatically</li>
            <li><strong>That's it!</strong> - no more manual sign-ins or paper forms</li>
          </ol>
        </div>

        <div class="footer">
          <p>
            <strong>QR Attend</strong> - Modern Attendance Tracking<br>
            If you have any questions, contact your administrator.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateEmailText(emailData: {
  to: string
  subject: string
  studentName: string
  studentId: string
  qrCodeUrl: string
  qrData: string
}): string {
  return `
QR Attend - Your QR Code is Ready!

Hello ${emailData.studentName},

Welcome to the QR Attendance System! Your personal QR code has been generated and is ready to use.

Your Registration Details:
- Name: ${emailData.studentName}
- Student ID: ${emailData.studentId}
- Email: ${emailData.to}

Your QR Code: ${emailData.qrCodeUrl}

How to Use Your QR Code:
1. Save the QR code to your phone or print it out
2. Bring it to events - show it to staff at the entrance  
3. Get scanned - your attendance will be logged automatically
4. That's it! - no more manual sign-ins or paper forms

IMPORTANT: Keep this QR code private and don't share it with others.

---
QR Attend - Modern Attendance Tracking
  `.trim()
}
