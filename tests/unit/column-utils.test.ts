import { describe, it, expect } from "vitest"
import { isDoneColumn, isInProgressColumn, isTodoColumn } from "@/utils/column-utils"

describe("column-utils", () => {
  it("detects done columns by synonym", () => {
    expect(isDoneColumn("Done")).toBe(true)
    expect(isDoneColumn("Completed")).toBe(true)
    expect(isDoneColumn("Resolved")).toBe(true)
    expect(isDoneColumn("Launch")).toBe(true)
    expect(isDoneColumn("Closed")).toBe(true)
    expect(isDoneColumn("Shipped")).toBe(true)
  })

  it("rejects non-done columns", () => {
    expect(isDoneColumn("To Do")).toBe(false)
    expect(isDoneColumn("In Progress")).toBe(false)
    expect(isDoneColumn(null)).toBe(false)
    expect(isDoneColumn(undefined)).toBe(false)
    expect(isDoneColumn("")).toBe(false)
  })

  it("detects in-progress columns", () => {
    expect(isInProgressColumn("In Progress")).toBe(true)
    expect(isInProgressColumn("Doing")).toBe(true)
    expect(isInProgressColumn("Review")).toBe(true)
    expect(isInProgressColumn("Development")).toBe(true)
  })

  it("detects todo/backlog columns", () => {
    expect(isTodoColumn("To Do")).toBe(true)
    expect(isTodoColumn("Backlog")).toBe(true)
    expect(isTodoColumn("Ready")).toBe(true)
    expect(isTodoColumn("Blocked")).toBe(true)
  })

  it("is case and whitespace insensitive", () => {
    expect(isDoneColumn("  done  ")).toBe(true)
    expect(isDoneColumn("DONE")).toBe(true)
  })
})
