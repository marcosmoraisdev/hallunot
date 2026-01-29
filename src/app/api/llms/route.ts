import { NextResponse } from "next/server"

// TODO: Task 9 will update this to use JSON data file
// Temporary stub to allow build to pass after Prisma removal

export async function GET() {
  // Return empty array until Task 9 implements JSON-based data access
  return NextResponse.json({ data: [] })
}
