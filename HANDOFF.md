# 캘린더 앱 — 개발 인수인계 문서

> 작성일: 2026-03-13
> 다음 작업 컴퓨터에서 Claude에게 이 파일을 읽힌 후 작업을 이어서 시작하세요.

---

## 프로젝트 개요

**기술 스택**: Next.js 16 (Turbopack) + React 19 + TypeScript
**스타일**: Tailwind CSS v4 + shadcn/ui (Toss 디자인 시스템, 주 색상 `#007AFF`)
**인증/DB**: Firebase Authentication + Firestore
**상태관리**: Zustand (UI) + TanStack Query (서버 데이터)
**알림**: Resend (이메일) + CoolSMS (문자) + Vercel Cron
**배포**: Vercel

**로컬 실행**: 프로젝트 루트에서 `npm run dev` → `http://localhost:3000`

---

## Firestore 컬렉션 구조

```
users/{userId}
users/{userId}/schedules/{scheduleId}   ← 일정
users/{userId}/tags/{tagId}             ← 태그
```

**Schedule 주요 필드**:
```ts
{
  title: string
  description: string          // Tiptap 에디터 HTML
  startAt: Timestamp
  endAt: Timestamp
  isAllDay: boolean
  color: string                // 'blue' | 'green' | 'red' 등
  priority: 'low' | 'medium' | 'high'
  isDone: boolean
  repeat: {
    enabled: boolean
    type: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    daysOfWeek: number[] | null   // 주간 반복용, null로 저장됨
    endType: 'never' | 'date' | 'count'
    endDate: Timestamp | null
    endCount: number | null       // null로 저장됨
  }
  notifications: {
    email: boolean
    sms: boolean
    advanceTimes: string[]        // ['10m', '1h', '1d', '7d', '15d', '30d']
    sentFlags: boolean[]          // advanceTimes와 1:1 대응
  }
}
```

---

## 폴더 구조 요약

```
src/
├── app/
│   ├── page.tsx                 ← 랜딩페이지 (비로그인) / 캘린더 리다이렉트 (로그인)
│   ├── icon.svg                 ← 파비콘 (파란 달력 아이콘)
│   ├── favicon.ico              ← 파비콘 ICO (레거시 브라우저용)
│   ├── (auth)/login/page.tsx    ← Google 로그인 페이지
│   └── (dashboard)/
│       ├── layout.tsx           ← 로그인 체크 + 앱 레이아웃 (사이드바/헤더/패널)
│       └── calendar/page.tsx    ← 메인 캘린더 뷰
├── components/
│   ├── calendar/                ← MonthView, WeekView 등 캘린더 뷰
│   ├── day/DayDetailPanel.tsx   ← 우측 날짜 상세 패널
│   ├── schedule/
│   │   ├── ScheduleForm.tsx     ← 일정 폼 (react-hook-form + zod)
│   │   └── ScheduleModal.tsx    ← 일정 추가/수정 모달
│   ├── upcoming/
│   │   ├── UpcomingItem.tsx     ← 마감 임박 아이템 (UpcomingPanel용)
│   │   └── UpcomingPanel.tsx    ← 마감 임박 패널 (별도 뷰)
│   └── layout/
│       ├── Sidebar.tsx          ← 좌측 사이드바 (미니 캘린더 + 마감 임박)
│       └── Header.tsx           ← 상단 헤더
├── hooks/
│   ├── useSchedules.ts          ← 일정 CRUD + TanStack Query
│   ├── useUpcoming.ts           ← 마감 임박 쿼리
│   └── useAuth.ts               ← Firebase Auth 훅
├── lib/firebase/
│   └── firestore.ts             ← Firestore CRUD 함수
└── types/index.ts               ← 전체 타입 정의
```

---

## 최근 세션에서 수정한 내용

### 1. 우측 패널 (DayDetailPanel) — 다중 날짜 범위 표시
**파일**: `src/components/day/DayDetailPanel.tsx`
**내용**: 하루짜리가 아닌 일정에 "3월 3일 ~ 3월 16일" 날짜 범위 표시 추가.
진행 중인 일정에는 "진행 중" 초록 뱃지 표시.

```tsx
// differenceInCalendarDays, startOfDay import 추가됨
// 멀티데이 판단: differenceInCalendarDays(endDate, startDate) >= 1
// 진행 중 판단: startDate < today && endDate >= today
```

---

### 2. 마감 임박 패널 D-Day — 종료일(endAt) 기준으로 수정
**파일**: `src/components/layout/Sidebar.tsx`
**핵심**: `SidebarUpcomingItem` 컴포넌트가 `startAt` 기준으로 D-Day를 계산하고 있었음.
→ `endAt` 기준으로 변경.

```tsx
function SidebarUpcomingItem({ schedule }: { schedule: Schedule }) {
  const endDate = schedule.endAt.toDate()   // ← startAt.toDate() 에서 수정
  const dday = getDDayNumber(endDate)
  const label = getDDayLabel(endDate)
  ...
}
```

> ⚠️ **주의**: `src/components/upcoming/UpcomingItem.tsx`는 **별도 컴포넌트**임.
> 사이드바에 실제 렌더되는 건 `Sidebar.tsx` 내부의 `SidebarUpcomingItem`임.

---

### 3. 마감 임박 패널 — 일정 변경 시 자동 리프레시
**파일**: `src/hooks/useSchedules.ts`
**내용**: 일정 생성/수정/삭제/완료 처리 시 마감 임박 쿼리도 함께 invalidate.

```ts
import { upcomingKeys } from '@/hooks/useUpcoming'

function invalidateAll(queryClient, userId) {
  queryClient.invalidateQueries({ queryKey: scheduleKeys.all(userId) })
  queryClient.invalidateQueries({ queryKey: upcomingKeys.all(userId) })
}
// 모든 mutation의 onSuccess에서 invalidateAll 호출
```

---

### 4. 일정 수정 저장 버튼 안 눌리는 버그 — 3가지 수정
**파일**: `src/components/schedule/ScheduleModal.tsx`

#### 원인 1: `repeat.daysOfWeek` / `repeat.endCount` null vs undefined (핵심 버그)
Firestore는 optional 필드를 `null`로 저장하지만, Zod `.optional()`은 `undefined`만 허용하고 `null`은 거부함.
→ defaultValues 세팅 시 `?? undefined`로 변환.

```tsx
repeat: {
  ...editingSchedule.repeat,
  daysOfWeek: editingSchedule.repeat.daysOfWeek ?? undefined,  // null → undefined
  endCount:   editingSchedule.repeat.endCount   ?? undefined,  // null → undefined
  endDate: editingSchedule.repeat.endDate
    ? (editingSchedule.repeat.endDate as Timestamp).toDate()
    : undefined,
},
```

#### 원인 2: `repeat.interval` 비제어 입력
`defaultValue={1}` → `value={watch('repeat.interval') ?? 1}`으로 변경 (제어 컴포넌트).

#### 원인 3: 모달 재오픈 시 폼 미리마운트
`formKey` state + `useEffect`로 모달 열릴 때마다 폼 완전 리마운트.

```tsx
const [formKey, setFormKey] = useState(0)
const openCountRef = useRef(0)
useEffect(() => {
  if (isScheduleModalOpen) {
    openCountRef.current += 1
    setFormKey(openCountRef.current)
    setSaveError(null)
  }
}, [isScheduleModalOpen])

// ScheduleForm에 key 전달
<ScheduleForm key={`${editingScheduleId ?? 'create'}-${formKey}`} ... />
```

#### 추가: 에러 메시지 표시
`saveError` state + try/catch로 저장 실패 시 UI에 에러 메시지 표시.

---

### 5. notifications.sentFlags 유실 버그 수정
**파일**: `src/lib/firebase/firestore.ts`
**원인**: `updateSchedule`에서 `notifications` 객체를 통째로 덮어쓰면 Firestore의 기존 `sentFlags`가 사라짐.
→ dot notation으로 개별 필드만 업데이트.

```ts
// ❌ 기존 (sentFlags 유실)
data.notifications = { email, sms, advanceTimes }

// ✅ 수정 후 (dot notation)
data['notifications.email']        = notifications.email
data['notifications.sms']          = notifications.sms
data['notifications.advanceTimes'] = notifications.advanceTimes
data['notifications.sentFlags']    = notifications.advanceTimes.map(() => false)
```

---

### 6. 랜딩페이지 신규 추가
**파일**: `src/app/page.tsx` (기존: `/calendar` 리다이렉트만 있었음)

**라우팅 로직**:
- 비로그인 상태로 `/` 접속 → 랜딩페이지 표시
- 로그인 상태로 `/` 접속 → `/calendar` 자동 이동

**랜딩페이지 구성**:
- 고정 헤더 + "시작하기" 버튼
- 히어로 섹션 (타이틀 + CTA)
- 장식용 달력 미리보기 (목업)
- 기능 소개 카드 3개
- 하단 CTA + 푸터

---

### 7. 파비콘 교체
- `src/app/favicon.ico` → 새 파란 달력 아이콘 (PIL로 생성)
- `src/app/icon.svg` → 신규 추가 (모던 브라우저용 SVG 파비콘)

---

## 알림 advanceTimes 옵션 (사용자가 추가한 값)

`ScheduleForm.tsx`에서 기존 `['10m', '1h', '1d']` 외에 `'7d'`, `'15d'`, `'30d'` 추가됨.
Cron / API Route에서 이 값들을 파싱하는 로직도 확인 필요.

---

## 현재 git 상태

최신 커밋: `2852fea — 알림 설정 옵션 추가`

위 수정 사항들(4~7번)은 **아직 커밋되지 않은 상태**임.
다른 컴퓨터에서 작업 시작 전에 `git pull`로 최신 상태 확인 후,
변경된 파일들이 정상 반영됐는지 확인하고 커밋 진행.

**커밋 전 lock 파일 오류 해결**:
```bash
rm /Users/kimwooram/project/calendar-app/.git/index.lock
git add .
git commit -m "..."
```

---

## 향후 개발 예정 / 개선 고려 사항

1. **반복 일정 수정 시 "이 일정만 / 이후 모두 / 전체" 선택 UI** — 아직 미구현
2. **Cron API에서 `sentFlags` 업데이트 로직** — 알림 발송 후 해당 flag를 `true`로 변경하는 로직 확인 필요
3. **모바일 반응형** — 현재 데스크톱 중심 레이아웃
4. **태그 기능** — `users/{userId}/tags` 컬렉션 있으나 UI 연동 부분 미완성 가능성
5. **랜딩페이지 SEO** — 현재 `'use client'`라 SSR 미지원, 필요 시 서버 컴포넌트로 분리

---

## Claude에게 작업 이어받을 때 전달 메시지 예시

```
이 파일(HANDOFF.md)을 읽고 캘린더 앱 개발을 이어서 진행해줘.
프로젝트 경로: /Users/kimwooram/project/calendar-app
현재 브랜치: main
로컬 서버: npm run dev
```
