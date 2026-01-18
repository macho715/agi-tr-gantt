import { type NextRequest, NextResponse } from "next/server"

/**
 * Download endpoint for generated Excel files
 *
 * In production, this would:
 * 1. Retrieve the file from temporary storage (filesystem, S3, etc.)
 * 2. Stream it to the client
 * 3. Clean up after download
 *
 * For the MVP, we return a sample Excel file structure
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing file ID" }, { status: 400 })
  }

  // In production, retrieve the actual generated file
  // For MVP, generate a simple Excel-compatible XML (SpreadsheetML)
  const excelContent = generateSampleExcel()

  return new NextResponse(excelContent, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="gantt_schedule_${id}.xlsx"`,
    },
  })
}

function generateSampleExcel(): string {
  // Simple XML spreadsheet format that Excel can open
  // In production, your Python script generates the real .xlsx with VBA
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Schedule">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Task ID</Data></Cell>
    <Cell><Data ss:Type="String">Task Name</Data></Cell>
    <Cell><Data ss:Type="String">Duration</Data></Cell>
    <Cell><Data ss:Type="String">Start Day</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">TASK-001</Data></Cell>
    <Cell><Data ss:Type="String">Sample Task</Data></Cell>
    <Cell><Data ss:Type="Number">5</Data></Cell>
    <Cell><Data ss:Type="Number">0</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Instructions">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">This is a sample file. In production, your Python script generates the full workbook with:</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">- Control panel with settings</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">- Multiple scenario sheets</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">- VBA macros for interactivity</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`
}
