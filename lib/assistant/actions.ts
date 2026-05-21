import type { AssistantSuggestedAction } from '@/types'

// Extract a suggested action from assistant response text if it contains action markers
export function extractSuggestedAction(text: string): AssistantSuggestedAction | undefined {
  // Look for JSON action block: <action>{ ... }</action>
  const match = text.match(/<action>([\s\S]+?)<\/action>/)
  if (!match) return undefined
  try {
    return JSON.parse(match[1]) as AssistantSuggestedAction
  } catch {
    return undefined
  }
}

export function cleanResponseText(text: string): string {
  return text.replace(/<action>[\s\S]+?<\/action>/g, '').trim()
}
