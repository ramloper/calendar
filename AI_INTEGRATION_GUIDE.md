# Claude AI 일정 정리 기능 — 사용자 가이드

## 개요
캘린더 앱에 Claude AI를 통합하여 일정 설명을 자동으로 정리하고 개선하는 기능을 추가했습니다.

## 구조

### 1. 백엔드 API 엔드포인트
**경로**: `/api/ai/format-description`
**메서드**: POST
**요청 본문**:
```json
{
  "title": "미팅",
  "description": "팀과 함께 분기별 목표 검토하는 미팅 개최 및 회의",
  "apiKey": "sk-proj-..."
}
```

**응답 (성공)**:
```json
{
  "ok": true,
  "formatted": "분기별 목표 검토 미팅\n\n• 팀과 함께 진행\n• 분기 목표 검토"
}
```

**응답 (실패)**:
```json
{
  "error": "Claude API 키가 필요합니다"
}
```

### 2. useAIFormatting 훅
**위치**: `/src/hooks/useAI.ts`

```tsx
const { isLoading, error, formattedDescription, formatDescription, reset } = useAIFormatting()

// 사용 예
await formatDescription({
  title: '미팅',
  currentDescription: '팀 회의 내용...'
})

if (formattedDescription) {
  // 폼 업데이트
}
```

## 사용 방법

### 1. Claude API 키 발급
1. https://console.anthropic.com/ 접속
2. 계정 로그인
3. API 키 생성
4. 키 복사

### 2. 앱에서 API 키 설정
1. 캘린더 앱 로그인
2. 상단 우측 설정 > **AI 설정**
3. "Claude API 키" 입력란에 발급받은 키 붙여넣기
4. 저장

### 3. 일정 추가/수정 시 사용
1. 일정 추가 또는 수정 모달 열기
2. 설명 입력
3. **AI로 정리** 버튼 클릭
4. 로딩 완료 후 자동으로 설명 업데이트
5. 저장

## 주요 특징

✅ **사용자 API 키 관리**
- 각 사용자가 자신의 API 키를 입력
- 공유 키 노출 위험 없음

✅ **서버 사이드 처리**
- 클라이언트에서 직접 Claude API 호출 안 함
- 브라우저 환경 제약 없음

✅ **에러 처리**
- API 키 미설정 시 안내 메시지
- 네트워크 오류 시 에러 표시
- 자동 재시도 기능 (클라이언트 측)

## 기술 사항

### 모델
- **모델명**: `claude-3-5-sonnet-20241022`
- **최대 토큰**: 500
- **용도**: 일정 설명 정리 및 개선

### 프롬프트
설명 정리 시 다음을 수행합니다:
- 구조 정리 (불릿 포인트 등)
- 중복 제거
- 명시적 세부사항 추가
- 간결하고 완전한 형식
- 전문적이면서 친근한 톤

### 성능
- API 호출 시간: 약 1~3초 (네트워크 지연 포함)
- 입력 제한: 없음 (합리적 범위)
- 출력 제한: 500 토큰

## 개발 시 테스트 방법

### 수동 테스트
```bash
# 1. 로컬 서버 실행
npm run dev

# 2. 일정 추가 모달에서 테스트
# - 제목과 설명 입력
# - "AI로 정리" 버튼 클릭
# - 결과 확인
```

### API 직접 테스트 (curl)
```bash
curl -X POST http://localhost:3000/api/ai/format-description \
  -H "Content-Type: application/json" \
  -d '{
    "title": "미팅",
    "description": "팀과 분기별 목표 검토 하는 미팅",
    "apiKey": "sk-proj-..."
  }'
```

## 문제 해결

### "Claude API 키가 설정되지 않았습니다"
- 설정 > AI 설정에서 API 키를 입력하고 저장했는지 확인
- API 키가 유효한지 확인 (https://console.anthropic.com에서)
- 브라우저 캐시 초기화 후 새로고침

### "AI 정리 실패" (네트워크 오류)
- 인터넷 연결 확인
- 서버 상태 확인 (npm run dev 출력 확인)
- 브라우저 개발자 도구 > Network 탭에서 API 요청 상태 확인

### API 키가 계속 초기화됨
- Firestore 저장 확인: `users/{userId}` 문서에 `claudeApiKey` 필드 있는지 확인
- 저장 버튼이 제대로 눌렸는지 확인
- 에러 메시지 확인 (설정 폼 하단)

## 향후 개선 사항

- [ ] 로컬 벡터 DB를 사용한 오프라인 지원
- [ ] 다른 LLM 모델 지원 (GPT-4, Gemini 등)
- [ ] 배치 처리 (여러 일정 동시 정리)
- [ ] 프롬프트 커스터마이징 UI
- [ ] 사용 통계 및 비용 추적
