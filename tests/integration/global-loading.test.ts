import { describe, it, expect, beforeEach } from "vitest"
import { useGlobalLoading } from "@/lib/store/use-global-loading"

describe("useGlobalLoading store", () => {
  beforeEach(() => {
    useGlobalLoading.setState({ active: 0, message: null })
  })

  it("starts and stops a single operation", () => {
    useGlobalLoading.getState().start("Creating board...")
    expect(useGlobalLoading.getState().active).toBe(1)
    expect(useGlobalLoading.getState().message).toBe("Creating board...")

    useGlobalLoading.getState().stop()
    expect(useGlobalLoading.getState().active).toBe(0)
    expect(useGlobalLoading.getState().message).toBeNull()
  })

  it("tracks nested operations with a count", () => {
    useGlobalLoading.getState().start("op1")
    useGlobalLoading.getState().start("op2")
    expect(useGlobalLoading.getState().active).toBe(2)

    useGlobalLoading.getState().stop()
    expect(useGlobalLoading.getState().active).toBe(1)
    expect(useGlobalLoading.getState().message).toBe("op2")
  })

  it("never goes below zero", () => {
    useGlobalLoading.getState().stop()
    useGlobalLoading.getState().stop()
    expect(useGlobalLoading.getState().active).toBe(0)
    expect(useGlobalLoading.getState().message).toBeNull()
  })

  it("clears message only when the last operation stops", () => {
    useGlobalLoading.getState().start("outer")
    useGlobalLoading.getState().start("inner")
    useGlobalLoading.getState().stop()
    expect(useGlobalLoading.getState().active).toBe(1)
    expect(useGlobalLoading.getState().message).toBe("inner")

    useGlobalLoading.getState().stop()
    expect(useGlobalLoading.getState().active).toBe(0)
    expect(useGlobalLoading.getState().message).toBeNull()
  })
})
