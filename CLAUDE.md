# Calendar App — 프로젝트 규칙

## 핵심 원칙: UI와 비즈니스 로직 분리

### 어디에 뭘 넣는가

| 코드 종류 | 위치 | 예시 |
|-----------|------|------|
| UI 렌더링, 스타일, 인터랙션 | `components/` | 버튼 클릭, 모달 열기, 색상 |
| 데이터 페칭 + 비즈니스 로직 | `hooks/` | `useSchedules`, `useAuth` |
| 전역 UI 상태 | `stores/` | 현재 날짜, 모달 열림 여부 |
| 외부 서비스 연동 | `lib/` | Firebase, 이메일, SMS |
| 타입 정의 | `types/index.ts` | 모든 interface, type |

### 컴포넌트 작성 규칙

```tsx
// ✅ 올바른 예 — 컴포넌트는 표시만, 로직은 hook에서
function ScheduleCard({ scheduleId }: Props) {
  const { schedule, handleDelete } = useSchedule(scheduleId) // 로직은 hook
  return <div onClick={handleDelete}>{schedule.title}</div>   // UI만
}

// ❌ 잘못된 예 — 컴포넌트 안에 Firebase 직접 호출
function ScheduleCard({ scheduleId }: Props) {
  const handleDelete = async () => {
    await deleteDoc(doc(db, 'schedules', scheduleId)) // 여기 넣으면 안됨
  }
}
```

### Hook 작성 규칙

```tsx
// hooks/useSchedules.ts
// - Firestore 쿼리, CRUD, 에러 처리 여기서
// - 컴포넌트는 이 hook만 import해서 사용
// - hook은 UI를 모름 (JSX 반환 금지)
```

### lib/ 작성 규칙

```ts
// lib/firebase/firestore.ts
// - Firebase SDK 직접 호출은 여기서만
// - hook에서 lib 함수를 import해서 사용
// - 컴포넌트에서 lib 직접 import 금지
```

---

## 폴더 구조

```
src/
├── app/
│   ├── (auth)/           # 로그인 전 페이지
│   ├── (dashboard)/      # 로그인 후 메인 앱
│   └── api/              # API Routes (Cron, 알림)
├── components/
│   ├── calendar/         # 캘린더 뷰 컴포넌트
│   ├── schedule/         # 일정 관련 컴포넌트
│   ├── upcoming/         # 마감 임박 패널
│   ├── layout/           # 사이드바, 헤더
│   └── ui/               # 공통 UI (shadcn 기반)
├── hooks/                # 비즈니스 로직 + 데이터 페칭
├── stores/               # Zustand 전역 상태 (UI 상태만)
├── lib/
│   ├── firebase/         # Firebase 연동
│   ├── notifications/    # 이메일, SMS
│   └── utils/            # 날짜, 반복 일정 유틸
└── types/
    └── index.ts          # 전체 타입 정의
```

---

## 기술 스택

- **Framework**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Auth + DB**: Firebase (Authentication + Firestore)
- **상태관리**: Zustand (UI) + TanStack Query (서버 데이터)
- **알림**: Resend (이메일) + CoolSMS (SMS) + Vercel Cron
- **다크모드**: next-themes
- **폼**: React Hook Form + Zod

---

## Firestore 컬렉션 구조

```
users/{userId}
users/{userId}/schedules/{scheduleId}
users/{userId}/tags/{tagId}
```

---

## 코딩 컨벤션

- 컴포넌트 파일명: PascalCase (`ScheduleCard.tsx`)
- hook 파일명: camelCase + use prefix (`useSchedules.ts`)
- 타입은 반드시 `types/index.ts`에 정의 (컴포넌트 파일 내 타입 정의 금지)
- 서버 컴포넌트 기본, 클라이언트 필요할 때만 `'use client'`
- API Routes는 `app/api/` 하위에만

---

## 미래 확장 계획 (코딩 시 염두)

- **Electron**: 시스템 트레이 알림 — API 레이어 분리돼있어서 래핑 용이
- **AI (Claude API)**: 일정 내용 자동 정리 — `schedule.description` / `schedule.descriptionFormatted` 필드 이미 설계됨
