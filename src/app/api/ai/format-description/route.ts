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

    const prompt = `일정: "${title}"
설명: "${description || '(설명 없음)'}"

위 설명을 간결하게 정리하고 체계적으로 구성해주세요. 필요하면 bullet points를 사용하세요. 정리된 설명만 출력해주세요.`

    const message = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 250,
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
