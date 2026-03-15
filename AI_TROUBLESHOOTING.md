# Claude AI 정리 기능 - 문제 해결 가이드

## 에러: "AI 정리 실패: Unexpected token '<', "<!DOCTYPE "..."

### 원인
이 에러는 API가 JSON 대신 HTML을 반환할 때 발생합니다. 보통 다음 중 하나를 의미합니다:

1. **API 엔드포인트 에러** — `/api/ai/format-description`가 500 에러를 반환하고 있음
2. **Anthropic SDK 에러** — Claude API 호출 시 예상치 못한 에러 발생
3. **Invalid API Key** — 제공된 Claude API 키가 유효하지 않음

### 해결 방법

#### 1단계: API 키 확인
```
설정 > AI 설정에서:
✓ Claude API 키가 입력되어 있는가?
✓ 키가 https://console.anthropic.com에서 생성한 유효한 키인가?
✓ 저장 버튼을 눌렀는가?
```

#### 2단계: 브라우저 콘솔 확인
1. F12 → Console 탭 열기
2. "AI formatting error:" 메시지 찾기
3. 에러 내용 확인 (전체 스택 트레이스)
4. 콘솔에 출력된 정보를 보면 실제 원인을 알 수 있음

#### 3단계: 네트워크 요청 확인
1. F12 → Network 탭 열기
2. "AI로 정리" 버튼 클릭
3. `format-description` 요청 찾기
4. Request/Response 확인:
   - **Response가 HTML이면**: API에서 오류 발생 (5단계로)
   - **Response가 JSON이면**: 클라이언트 오류 가능성

#### 4단계: 서버 로그 확인
터미널에서 `npm run dev` 출력을 확인:
```
AI 포맷팅 오류: [실제 에러 메시지]
```

#### 5단계: 일반적인 해결책

| 증상 | 원인 | 해결책 |
|------|------|--------|
| "Claude API 키가 필요합니다" | API 키 미입력 | 설정에서 API 키 입력 |
| "Claude API 키가 유효하지 않습니다" | 잘못된 API 키 | console.anthropic.com에서 새 키 생성 |
| "Claude API 응답이 비어있습니다" | Claude API 오류 | 제목과 설명 확인, 다시 시도 |
| 3초 이상 로딩 | 네트워크 지연 | 인터넷 연결 확인, 다시 시도 |
| 매번 다르게 실패 | 일시적 오류 | 페이지 새로고침 후 다시 시도 |

## 디버깅 팁

### API 엔드포인트 직접 테스트
터미널에서 API를 직접 호출해보기:

```bash
# 유효하지 않은 키로 테스트
curl -X POST http://localhost:3000/api/ai/format-description \
  -H "Content-Type: application/json" \
  -d '{
    "title": "테스트",
    "description": "테스트 설명",
    "apiKey": "invalid-key"
  }'

# 응답 예시:
# {"error": "Claude API 키가 유효하지 않습니다"}
```

### 필드 검증
API는 다음을 검증합니다:
- `title`: 필수 (빈 문자열 불가)
- `apiKey`: 필수 (빈 문자열 불가)
- `description`: 선택사항 (빈 문자열 가능, 자동으로 "(no description provided)" 표시)

### 성능 최적화
- Claude API 호출: 1~3초
- 네트워크 지연 제외: ~1초
- 느리면 인터넷 연결 확인

## 에러 메시지별 대응

### "설정 > AI 설정에서 API 키를 입력해주세요"
- 설정을 열었는지 확인
- API 설정 섹션을 찾았는지 확인
- 저장 버튼을 눌렀는지 확인
- Firestore에 저장되었는지 확인:
  - Firebase Console → Firestore → users/{userId}
  - `claudeApiKey` 필드 있는지 확인

### "서버 오류: 500 Internal Server Error"
- 서버 터미널에서 에러 메시지 확인
- 일반적 원인:
  - Anthropic SDK 문제
  - API 키 형식 오류
  - 네트워크 문제
- 해결책: 페이지 새로고침 후 재시도

### 중간에 정지/응답 없음
- 브라우저 개발자 도구 Network 탭에서:
  - 요청이 pending 상태면 서버가 응답 안 함
  - 서버 상태 확인: `npm run dev` 출력 보기
  - 서버 재시작: Ctrl+C → `npm run dev`

## 기술 스택 확인

**필요한 것들:**
- ✓ `@anthropic-ai/sdk` npm 패키지
- ✓ Claude API 엔드포인트 (`/api/ai/format-description`)
- ✓ useAIFormatting 훅
- ✓ Firestore (claudeApiKey 저장)

**확인 명령어:**
```bash
# SDK 설치 확인
npm ls @anthropic-ai/sdk

# API 경로 확인
ls -la src/app/api/ai/format-description/route.ts

# 훅 확인
ls -la src/hooks/useAI.ts
```

## 최후의 수단

### 캐시 초기화
```bash
# 브라우저
F12 → Application → Clear site data

# 또는 시크릿 창에서 테스트
```

### 서버 완전 재시작
```bash
# 터미널에서
pkill -f "next dev"    # 서버 종료
npm run dev             # 재시작
```

### 의존성 재설치
```bash
rm -rf node_modules
npm install
npm run dev
```

## 여전히 안 되면

1. **console 전체 에러 메시지** 확인
2. **네트워크 탭**에서 실제 응답 확인
3. **서버 터미널** 에러 메시지 전체 확인
4. 이 세 가지 정보로 문제 진단 가능

**상황 별 정보 수집:**
- API 키 관련: 설정 화면 스크린샷
- 네트워크 오류: Network 탭 스크린샷
- 서버 오류: 터미널 에러 메시지 복사
