import { describe, it, expect, beforeEach } from "vitest"
import { getAvailableTriggers, getAvailableConditions, getAvailableActions } from "@/utils/automation-utils"

describe("automation-utils", () => {
  it("returns all six triggers", () => {
    const triggers = getAvailableTriggers()
    expect(triggers.map((t) => t.value)).toEqual([
      "TASK_CREATED",
      "TASK_MOVED",
      "TASK_UPDATED",
      "TASK_ASSIGNED",
      "SPRINT_STARTED",
      "SPRINT_COMPLETED",
    ])
    triggers.forEach((t) => expect(t.label.length).toBeGreaterThan(0))
  })

  it("includes priority and column conditions", () => {
    const conditions = getAvailableConditions()
    expect(conditions.some((c) => c.value === "priority=HIGH")).toBe(true)
    expect(conditions.some((c) => c.value === "column=Done")).toBe(true)
    expect(conditions.some((c) => c.value === "assignee=null")).toBe(true)
  })

  it("includes notification, priority, move and tag actions", () => {
    const actions = getAvailableActions()
    expect(actions.some((a) => a.value === "SEND_NOTIFICATION:manager")).toBe(true)
    expect(actions.some((a) => a.value === "SET_PRIORITY:HIGH")).toBe(true)
    expect(actions.some((a) => a.value === "MOVE_TASK:column:Done")).toBe(true)
    expect(actions.some((a) => a.value === "ADD_TAG:tag:urgent")).toBe(true)
  })
})
