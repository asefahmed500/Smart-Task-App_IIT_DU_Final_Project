import { NextResponse } from "next/server"
import { logout } from "@/lib/auth-server"
import { createAuditLog } from "@/lib/create-audit-log"

export async function POST() {
  await logout()
  
  return NextResponse.json({ success: true })
}
