import { test, expect } from "@playwright/test"
import { USERS, loginViaForm, roleHome } from "./helpers"

test.describe("Authentication", () => {
  for (const role of ["admin", "manager", "member"] as const) {
    test(`login as ${role} redirects to ${role} dashboard`, async ({ page }) => {
      await loginViaForm(page, role)
      await page.waitForURL(`**${roleHome(role)}`)
      await expect(page).toHaveURL(new RegExp(roleHome(role)))
    })
  }

  test("rejects invalid credentials with an error message", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("admin@gmail.com")
    await page.getByLabel("Password").fill("wrong-password")
    await page.getByRole("button", { name: "Sign In" }).click()
    await expect(page.getByText(/Invalid credentials/i)).toBeVisible()
  })

  test("login form requires both fields (native validation)", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("button", { name: "Sign In" }).click()
    await expect(page.getByLabel("Email")).toHaveAttribute("required", "")
    await expect(page.getByLabel("Password")).toHaveAttribute("required", "")
  })

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/admin")
    await page.waitForURL(/\/login|\//)
    expect(page.url()).not.toContain("/admin")
  })
})

test.describe("RBAC guard rails", () => {
  test("member cannot access /admin", async ({ page }) => {
    await loginViaForm(page, "member")
    await page.waitForURL("**/member")
    await page.goto("/admin")
    await page.waitForURL(/\/member/)
    await expect(page).toHaveURL(/\/member/)
  })

  test("member cannot access /manager", async ({ page }) => {
    await loginViaForm(page, "member")
    await page.waitForURL("**/member")
    await page.goto("/manager")
    await page.waitForURL(/\/member/)
  })

  test("manager cannot access /admin", async ({ page }) => {
    await loginViaForm(page, "manager")
    await page.waitForURL("**/manager")
    await page.goto("/admin")
    await page.waitForURL(/\/manager/)
  })

  test("admin can access admin-only pages", async ({ page }) => {
    await loginViaForm(page, "admin")
    await page.waitForURL("**/admin")
    for (const path of ["/admin/users", "/admin/logs", "/admin/automation"]) {
      await page.goto(path)
      await expect(page).not.toHaveURL(/\/login/)
    }
  })
})
