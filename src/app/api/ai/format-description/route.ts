import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  try {
    const { title, description, apiKey } = await req.json()

    // 필수 필드 검증
    if (!title) {
      return NextResponse.json({ error: '제목이 필요합니다' }, { status: 400 })
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Claude API 키가 필요합니다' }, { status: 400 })
    }

    // 서버 사이드에서 Anthropic 클라이언트 인스턴스화
    const client = new Anthropic({
      apiKey: apiKey,
    })

    const prompt = `You are a helpful assistant that improves and formats schedule/event descriptions.

Task: Improve and organize the following event description.

Event Title: "${title}"
Current Description: "${description || '(no description provided)'}"

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

    // 응답에서 텍스트 추출
    const responseText = (() => {
      if (!message.content || message.content.length === 0) {
        throw new Error('Claude API 응답이 비어있습니다')
      }

      const firstContent = message.content[0]
      if ('text' in firstContent) {
        return firstContent.text
      }

      throw new Error(`예상치 못한 응답 타입: ${(firstContent as any).type}`)
    })()

    return NextResponse.json({
      ok: true,
      formatted: responseText.trim(),
    })
  } catch (error) {
    console.error('AI 포맷팅 오류:', error)

    let errorMessage = 'AI 정리 실패'
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as any).message
    }

    // API 키 관련 에러 감지
    if (errorMessage.includes('invalid_api_key') || errorMessage.includes('401')) {
      errorMessage = 'Claude API 키가 유효하지 않습니다'
      statusCode = 401
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
