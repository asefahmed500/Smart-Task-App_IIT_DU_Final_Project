/**
 * Shared mention-parse helpers.
 *
 * Mentions are stored in comment/review text as delimited tokens:
 *
 *   @[<userId>|<Display Name>]
 *
 * The delimited format survives multi-word names (the old plain `@Name`
 * regex could not match names with spaces without over-grabbing the rest
 * of the sentence) and lets the renderer resolve a mention to a user by ID
 * instead of fuzzy name matching. Pure functions — safe for both server
 * actions and client components.
 */

export const MENTION_REGEX = /@\[([^\]|]+)\|([^\]]+)\]/g

export interface MentionToken {
  userId: string
  name: string
}

/** Extract all `@[id|Name]` tokens from a comment string. */
export function extractMentions(content: string): MentionToken[] {
  const mentions: MentionToken[] = []
  const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags)
  let match
  while ((match = regex.exec(content)) !== null) {
    mentions.push({ userId: match[1].trim(), name: match[2].trim() })
  }
  return mentions
}

/** Build a mention token string for a user. */
export function buildMentionToken(userId: string, name: string): string {
  return `@[${userId}|${name}]`
}
