# QR Attendance System

A modern QR-based attendance tracking system built with Next.js, Supabase, and Resend.

## Features

- 📱 Student registration with QR code generation
- 📧 Automatic email delivery of QR codes
- 📊 Real-time attendance tracking
- 👨‍💼 Admin dashboard with analytics
- 📱 Mobile-responsive design
- 🔒 Secure authentication system

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Email**: Resend API
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file with:

\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key
\`\`\`

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run the development server: `npm run dev`
5. Set up Supabase database using the SQL scripts in `/scripts`

## Deployment

This project is optimized for deployment on Vercel with Supabase as the database.
