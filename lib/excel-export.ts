// Excel export utility for attendance data
export interface AttendanceExportData {
  studentName: string
  studentId: string
  course: string
  section: string
  major: string
  yearLevel: string
  eventName: string
  loginTimestamps: { date: string; time: string; timestamp: string }[]
}

export function exportAttendanceToCSV(records: AttendanceExportData[], filename?: string) {
  try {
    // Group records by year level
    const recordsByYear: { [key: string]: AttendanceExportData[] } = {
      "1st Year": [],
      "2nd Year": [],
      "3rd Year": [],
      "4th Year": [],
    }

    // Organize records by year level
    records.forEach((record) => {
      const yearLevel = record.yearLevel
      if (recordsByYear[yearLevel]) {
        recordsByYear[yearLevel].push(record)
      }
    })

    // Create CSV content with separate sections for each year
    let csvContent = ""
    let hasData = false

    Object.entries(recordsByYear).forEach(([yearLevel, yearRecords], index) => {
      if (yearRecords.length > 0) {
        hasData = true

        // Add separator between years
        if (index > 0) {
          csvContent += "\n\n"
        }

        // Add year level header
        csvContent += `"=== ${yearLevel} Students ==="\n`
        csvContent += `"Total Students: ${yearRecords.length}"\n\n`

        // Add column headers
        const headers = [
          "Student Name",
          "Student ID",
          "Course",
          "Section",
          "Major",
          "Event",
          "Login Dates & Times",
          "Total Login Days",
        ]
        csvContent += headers.map((header) => `"${header}"`).join(",") + "\n"

        // Add data rows
        yearRecords.forEach((record) => {
          const loginTimesFormatted = record.loginTimestamps
            .map((entry) => {
              const date = new Date(entry.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              return `${date} at ${entry.time}`
            })
            .join("; ")

          const row = [
            record.studentName,
            record.studentId,
            record.course,
            record.section,
            record.major,
            record.eventName,
            loginTimesFormatted,
            record.loginTimestamps.length.toString(),
          ]

          csvContent += row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",") + "\n"
        })

        // Add summary for this year
        csvContent += `\n"Summary for ${yearLevel}:"\n`
        csvContent += `"Total Students: ${yearRecords.length}"\n`
        csvContent += `"Total Login Sessions: ${yearRecords.reduce((sum, record) => sum + record.loginTimestamps.length, 0)}"\n`
      }
    })

    // If no data found
    if (!hasData) {
      csvContent = '"No attendance records found for any year level"\n'
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = filename || `attendance-by-year-${new Date().toISOString().split("T")[0]}.csv`

    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up the URL
    window.URL.revokeObjectURL(url)

    // Return export summary
    const summary = {
      totalRecords: records.length,
      byYear: Object.entries(recordsByYear)
        .filter(([_, yearRecords]) => yearRecords.length > 0)
        .reduce(
          (acc, [year, yearRecords]) => {
            acc[year] = yearRecords.length
            return acc
          },
          {} as { [key: string]: number },
        ),
    }

    return summary
  } catch (error) {
    console.error("Export error:", error)
    throw new Error("Failed to export attendance data")
  }
}
