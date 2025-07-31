"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, User, Mail, Hash, Calendar, BookOpen, GraduationCap } from "lucide-react"

interface StudentData {
  studentId: string
  name: string
  email: string
  section: string
  yearLevel: string
  major: string
  course: string
  id: string
}

interface StudentDetailModalProps {
  student: StudentData
  onClose: () => void
  onConfirmAttendance: () => void
}

export function StudentDetailModal({ student, onClose, onConfirmAttendance }: StudentDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Information</CardTitle>
              <CardDescription>Confirm attendance for this student</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold">{student.name}</h3>
            <Badge variant="secondary" className="mt-2">
              {student.studentId}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-sm">{student.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Hash className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Section</p>
                <p className="font-medium">{student.section}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Year Level</p>
                <p className="font-medium">{student.yearLevel}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Major</p>
                <p className="font-medium">{student.major}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <GraduationCap className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Course</p>
                <p className="font-medium">{student.course}</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button onClick={onConfirmAttendance} className="flex-1 bg-green-600 hover:bg-green-700">
              ✓ Mark Present
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
