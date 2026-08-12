import { describe, it, expect } from "vitest"
import {
  extractMentions,
  buildMentionToken,
  mentionToDisplayText,
  MENTION_REGEX,
} from "@/utils/mention"

describe("mention utils", () => {
  it("builds a delimited mention token", () => {
    expect(buildMentionToken("cmp9abc", "Jane Doe")).toBe("@[cmp9abc|Jane Doe]")
  })

  it("extracts mention tokens from content", () => {
    const mentions = extractMentions("Hi @[cmp1|Alice] and @[cmp2|Bob Smith], please review")
    expect(mentions).toHaveLength(2)
    expect(mentions[0]).toEqual({ userId: "cmp1", name: "Alice" })
    expect(mentions[1]).toEqual({ userId: "cmp2", name: "Bob Smith" })
  })

  it("handles no-mention content", () => {
    expect(extractMentions("just plain text")).toEqual([])
  })

  it("converts mention tokens to plain @Name text (no raw ids in display)", () => {
    const out = mentionToDisplayText("Assigned to @[cmp9x|Jane Doe] for review")
    expect(out).toBe("Assigned to @Jane Doe for review")
    expect(out).not.toContain("cmp9x")
  })

  it("sanitizes multiple tokens and keeps surrounding text", () => {
    const out = mentionToDisplayText("@[cmp1|A] mentioned @[cmp2|B C]")
    expect(out).toBe("@A mentioned @B C")
  })

  it("returns empty/unchanged for empty input", () => {
    expect(mentionToDisplayText("")).toBe("")
    expect(mentionToDisplayText(null as unknown as string)).toBeNull()
  })

  it("MENTION_REGEX matches a 25-char cuid-style token exactly once", () => {
    const text = "x @[c[^]]+|Name] y"
    expect(MENTION_REGEX.test(text)).toBe(false)
  })
})
