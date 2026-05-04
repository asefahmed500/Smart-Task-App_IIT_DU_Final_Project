import { headers } from "next/headers"

export async function getClientIp(): Promise<string | null> {
  const headersList = await headers()
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headersList.get("x-real-ip") ??
    null
  )
}