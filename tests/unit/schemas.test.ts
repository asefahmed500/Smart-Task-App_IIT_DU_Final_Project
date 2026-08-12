import { describe, it, expect } from "vitest"
import {
  idSchema,
  createTaskSchema,
  updateTaskSchema,
  createBoardSchema,
  createColumnSchema,
  createTagSchema,
  addAttachmentSchema,
  logTimeSchema,
  createCommentSchema,
  editCommentSchema,
  loginSchema,
  signupSchema,
  completeReviewSchema,
  createAutomationRuleSchema,
} from "@/lib/schemas"

describe("validation schemas — edge cases", () => {
  it("idSchema accepts a valid cuid and rejects invalid ids", () => {
    expect(idSchema.safeParse("cmsp48nvd0000lgfwr4czwbp6").success).toBe(true)
    expect(idSchema.safeParse("").success).toBe(false)
    expect(idSchema.safeParse("abc").success).toBe(false)
    expect(idSchema.safeParse(123).success).toBe(false)
  })

  describe("createTaskSchema", () => {
    const base = { title: "My task", columnId: "cmsp48nvd0000lgfwr4czwbp6" }

    it("accepts minimal valid task", () => {
      const r = createTaskSchema.safeParse(base)
      expect(r.success).toBe(true)
      if (r.success) expect(r.data.priority).toBe("MEDIUM")
    })

    it("rejects empty and whitespace-only titles", () => {
      expect(createTaskSchema.safeParse({ ...base, title: "" }).success).toBe(false)
      expect(createTaskSchema.safeParse({ ...base, title: "   " }).success).toBe(false)
    })

    it("rejects titles over 100 chars", () => {
      expect(createTaskSchema.safeParse({ ...base, title: "x".repeat(101) }).success).toBe(false)
    })

    it("accepts boundary 100-char title", () => {
      expect(createTaskSchema.safeParse({ ...base, title: "x".repeat(100) }).success).toBe(true)
    })

    it("rejects description over 1000 chars", () => {
      expect(createTaskSchema.safeParse({ ...base, description: "x".repeat(1001) }).success).toBe(false)
    })

    it("rejects invalid priority and issueType", () => {
      expect(createTaskSchema.safeParse({ ...base, priority: "EXTREME" }).success).toBe(false)
      expect(createTaskSchema.safeParse({ ...base, issueType: "NOT_A_TYPE" }).success).toBe(false)
    })

    it("rejects negative story points", () => {
      expect(createTaskSchema.safeParse({ ...base, storyPoints: -1 }).success).toBe(false)
      expect(createTaskSchema.safeParse({ ...base, storyPoints: 101 }).success).toBe(false)
    })

    it("rejects invalid columnId", () => {
      expect(createTaskSchema.safeParse({ title: "t", columnId: "nope" }).success).toBe(false)
    })
  })

  describe("createBoardSchema", () => {
    it("rejects empty name and >50 chars", () => {
      expect(createBoardSchema.safeParse({ name: "" }).success).toBe(false)
      expect(createBoardSchema.safeParse({ name: "x".repeat(51) }).success).toBe(false)
    })
    it("rejects whitespace-only name", () => {
      expect(createBoardSchema.safeParse({ name: "   " }).success).toBe(false)
    })
    it("rejects description >255 chars", () => {
      expect(createBoardSchema.safeParse({ name: "b", description: "x".repeat(256) }).success).toBe(false)
    })
  })

  describe("createColumnSchema", () => {
    it("rejects empty name, >30 chars, negative wipLimit", () => {
      expect(createColumnSchema.safeParse({ name: "", boardId: "cmsp48nvd0000lgfwr4czwbp6" }).success).toBe(false)
      expect(createColumnSchema.safeParse({ name: "x".repeat(31), boardId: "cmsp48nvd0000lgfwr4czwbp6" }).success).toBe(false)
      expect(createColumnSchema.safeParse({ name: "col", boardId: "cmsp48nvd0000lgfwr4czwbp6", wipLimit: -1 }).success).toBe(false)
    })
    it("rejects whitespace-only name", () => {
      expect(createColumnSchema.safeParse({ name: "   ", boardId: "cmsp48nvd0000lgfwr4czwbp6" }).success).toBe(false)
    })
  })

  describe("createTagSchema", () => {
    it("rejects invalid hex colors", () => {
      const base = { name: "urgent", boardId: "cmsp48nvd0000lgfwr4czwbp6" }
      expect(createTagSchema.safeParse({ ...base, color: "red" }).success).toBe(false)
      expect(createTagSchema.safeParse({ ...base, color: "#GGGGGG" }).success).toBe(false)
      expect(createTagSchema.safeParse({ ...base, color: "#FF0000" }).success).toBe(true)
      expect(createTagSchema.safeParse({ ...base, color: "#ff0000" }).success).toBe(true)
    })
  })

  describe("addAttachmentSchema", () => {
    const base = {
      taskId: "cmsp48nvd0000lgfwr4czwbp6",
      name: "file.pdf",
      url: "https://example.com/file.pdf",
      type: "application/pdf",
      size: 1000,
    }
    it("rejects non-url and oversized files (>10MB)", () => {
      expect(addAttachmentSchema.safeParse({ ...base, url: "not-a-url" }).success).toBe(false)
      expect(addAttachmentSchema.safeParse({ ...base, size: 10 * 1024 * 1024 + 1 }).success).toBe(false)
    })
    it("accepts boundary 10MB file", () => {
      expect(addAttachmentSchema.safeParse({ ...base, size: 10 * 1024 * 1024 }).success).toBe(true)
    })
  })

  describe("logTimeSchema", () => {
    it("rejects zero/negative duration", () => {
      expect(logTimeSchema.safeParse({ taskId: "cmsp48nvd0000lgfwr4czwbp6", duration: 0 }).success).toBe(false)
      expect(logTimeSchema.safeParse({ taskId: "cmsp48nvd0000lgfwr4czwbp6", duration: -5 }).success).toBe(false)
    })
  })

  describe("comment schemas", () => {
    it("rejects empty comments, whitespace-only, and >1000 chars", () => {
      expect(createCommentSchema.safeParse({ taskId: "cmsp48nvd0000lgfwr4czwbp6", content: "" }).success).toBe(false)
      expect(createCommentSchema.safeParse({ taskId: "cmsp48nvd0000lgfwr4czwbp6", content: "   " }).success).toBe(false)
      expect(createCommentSchema.safeParse({ taskId: "cmsp48nvd0000lgfwr4czwbp6", content: "x".repeat(1001) }).success).toBe(false)
      expect(editCommentSchema.safeParse({ id: "cmsp48nvd0000lgfwr4czwbp6", content: "ok" }).success).toBe(true)
    })
  })

  describe("auth schemas", () => {
    it("rejects invalid emails", () => {
      expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false)
      expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false)
    })
    it("rejects short passwords on signup", () => {
      expect(signupSchema.safeParse({ email: "a@b.co", password: "12345", name: "N" }).success).toBe(false)
      expect(signupSchema.safeParse({ email: "a@b.co", password: "123456", name: "" }).success).toBe(false)
    })
  })

  describe("completeReviewSchema", () => {
    it("rejects invalid status and overlong feedback", () => {
      const base = { reviewId: "cmsp48nvd0000lgfwr4czwbp6", status: "APPROVED" }
      expect(completeReviewSchema.safeParse({ ...base, status: "MAYBE" }).success).toBe(false)
      expect(completeReviewSchema.safeParse({ ...base, feedback: "x".repeat(1001) }).success).toBe(false)
    })
  })

  describe("createAutomationRuleSchema", () => {
    it("rejects empty name/action and invalid trigger", () => {
      const base = { trigger: "TASK_CREATED" }
      expect(createAutomationRuleSchema.safeParse({ ...base, name: "", action: "X" }).success).toBe(false)
      expect(createAutomationRuleSchema.safeParse({ ...base, name: "n", action: "" }).success).toBe(false)
      expect(createAutomationRuleSchema.safeParse({ ...base, name: "n", action: "X", trigger: "NOPE" }).success).toBe(false)
    })
  })
})
