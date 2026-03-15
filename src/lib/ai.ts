/**
 * Claude AI Integration for schedule description formatting
 * Uses Claude API to automatically organize and improve schedule descriptions
 */

import Anthropic from '@anthropic-ai/sdk'

export interface FormatDescriptionInput {
  title: string
  currentDescription: string
  apiKey: string
}

export interface FormatDescriptionResult {
  formatted: string
  summary?: string
}

/**
 * Format schedule description using Claude API
 * Improves clarity, adds structure, and removes redundancy
 */
export async function formatScheduleDescription(
  input: FormatDescriptionInput
): Promise<FormatDescriptionResult> {
  const { title, currentDescription, apiKey } = input

  if (!apiKey) {
    throw new Error('Claude API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.')
  }

  const client = new Anthropic({
    apiKey: apiKey,
  })

  const prompt = `You are a helpful assistant that improves and formats schedule/event descriptions.

Task: Improve and organize the following event description.

Event Title: "${title}"
Current Description: "${currentDescription || '(no description provided)'}"

Please:
1. Organize the description with clear structure (bullet points if needed)
2. Remove redundancy and repetition
3. Add important details that might be implicit
4. Keep it concise but complete
5. Use professional but friendly language
6. Output ONLY the improved description, no explanations

Format the response as plain text or markdown if structure is helpful.`

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : ''

  return {
    formatted: responseText.trim(),
    summary: `Formatted using Claude AI`,
  }
}

/**
 * Generate a short summary of the schedule description
 */
export async function generateScheduleSummary(description: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error('Claude API 키가 설정되지 않았습니다.')
  }

  const client = new Anthropic({
    apiKey: apiKey,
  })

  const prompt = `Summarize this schedule/event description in 1-2 sentences:

"${description}"

Output ONLY the summary, no explanations.`

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text.trim() : ''
}
