import { expect, type Page } from "@playwright/test"

export const USERS = {
  admin: { email: "admin@gmail.com", password: "admin123", role: "ADMIN" },
  manager: { email: "manager@smarttask.com", password: "AdminPassword123!", role: "MANAGER" },
  member: { email: "member@smarttask.com", password: "AdminPassword123!", role: "MEMBER" },
} as const

export type RoleKey = keyof typeof USERS

/** Log in via the API so the httpOnly cookie is stored on the page's context. */
export async function loginViaApi(page: Page, role: RoleKey): Promise<void> {
  const { email, password } = USERS[role]
  const res = await page.request.post("/api/auth/login", { data: { email, password } })
  expect(res.status()).toBe(200)
}

/** Log in through the real form (UI path). */
export async function loginViaForm(page: Page, role: RoleKey): Promise<void> {
  const { email, password } = USERS[role]
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign In" }).click()
}

/** Expected role landing page. */
export function roleHome(role: RoleKey): string {
  const r = USERS[role].role
  return r === "ADMIN" ? "/admin" : r === "MANAGER" ? "/manager" : "/member"
}
