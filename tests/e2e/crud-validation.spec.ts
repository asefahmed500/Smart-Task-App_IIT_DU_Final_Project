import { test, expect } from "@playwright/test"
import { loginViaApi, loginViaForm } from "./helpers"

/** Click a task card by its title. Board tasks load asynchronously, so wait
 *  for the card first, then click it and confirm the details dialog opened. */
async function clickTaskCard(page: import("@playwright/test").Page, title: string) {
  const card = page.locator("h3", { hasText: title }).first()
  await expect(card).toBeVisible({ timeout: 20_000 })
  await card.click({ force: true })
  await expect(page.getByText("Task details editor")).toBeVisible({ timeout: 15_000 })
}

test.describe("Board CRUD + validation", () => {
  test("create board shows full-screen loading overlay then appears", async ({ page }) => {
    await loginViaApi(page, "admin")
    await page.goto("/admin/boards")
    await page.getByRole("button", { name: /create.*board/i }).first().click()
    await page.getByLabel("Board Name").fill("E2E Test Board")
    await page.getByRole("button", { name: "Create Board" }).click()

    // Full-screen loading overlay (role=status) appears during the mutation.
    await expect(page.getByRole("status")).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("Creating board...")).toBeVisible()
    // And it disappears afterwards.
    await expect(page.getByRole("status")).toHaveCount(0, { timeout: 20_000 })
  })

  test("empty board name cannot be submitted", async ({ page }) => {
    await loginViaApi(page, "admin")
    await page.goto("/admin/boards")
    await page.getByRole("button", { name: /create.*board/i }).first().click()
    await page.getByRole("button", { name: "Create Board" }).click()
    // Native required validation blocks submission — no success toast.
    await expect(page.getByText("Board created successfully")).toHaveCount(0)
  })

  test("member boards page lists their boards", async ({ page }) => {
    await loginViaApi(page, "member")
    await page.goto("/member/boards")
    await expect(page.getByText("Project Boards")).toBeVisible()
  })
})

test.describe("Task flow + interactive features", () => {
  test("member opens a task and posts a comment", async ({ page }) => {
    await loginViaApi(page, "member")
    await page.goto("/member/boards")
    const openBoard = page.getByRole("link", { name: "Open Board" }).first()
    await openBoard.click()
    await page.waitForURL(/dashboard\/board/)

    // Open first task card.
    await clickTaskCard(page, "Design Marketing Assets")

    // Activity & Comments tab.
    await page.getByRole("tab", { name: /activity & comments/i }).click()
    const commentBox = page.getByPlaceholder(/Write a comment/)
    await commentBox.fill(`e2e comment ${Date.now()}`)
    await page.getByRole("button", { name: "Comment" }).click()
    await expect(page.getByText(/Comment added/i)).toBeVisible()
  })

  test("request review flow works for member", async ({ page }) => {
    await loginViaApi(page, "member")
    await page.goto("/member/boards")
    await page.getByRole("link", { name: "Open Board" }).first().click()
    await page.waitForURL(/dashboard\/board/)

    // Create a fresh task so we always have one without a pending review.
    const title = `review-e2e-${Date.now()}`
    await page.locator("button", { hasText: "Add Task" }).first().click()
    await page.getByLabel("Task Title").fill(title)
    await page.getByRole("button", { name: "Create Task" }).click()
    await expect(page.getByText(/Task created/i)).toBeVisible()
    await page.getByText(title).first().click({ force: true })
    await expect(page.getByText("Task details editor")).toBeVisible()

    await page.getByRole("button", { name: "Request Review" }).click()
    await expect(page.getByText("Choose a member...")).toBeVisible()
    await page.getByText("Choose a member...").click()
    await page.getByRole("option").first().click()
    await page.getByRole("button", { name: "Submit Request" }).click()
    await expect(page.getByText(/Submitted for review/i)).toBeVisible()
  })
})

test.describe("Logout", () => {
  test("logout returns to login page", async ({ page }) => {
    await loginViaForm(page, "admin")
    await page.waitForURL("**/admin")
    await page.getByRole("button", { name: "Logout" }).click()
    await page.waitForURL(/\/login/, { timeout: 15_000 })
  })
})


