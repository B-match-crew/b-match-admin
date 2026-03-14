# B-Match Admin

배드민턴 매칭 플랫폼 **B-Match**의 관리자 대시보드입니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Backend**: Supabase (Auth, Database)
- **상태관리**: Zustand
- **UI**: shadcn/ui + Tailwind CSS 4
- **차트**: Recharts
- **아키텍처**: FSD (Feature-Sliced Design)

## 주요 기능

| 메뉴 | 경로 | 설명 |
|------|------|------|
| 대시보드 | `/` | 핵심 지표 통계 (유저, 매칭, 신고) |
| 유저 관리 | `/users` | 유저 검색, 점수 조정, 정지/해제 |
| 매칭 모니터링 | `/matchings` | 매칭 목록 조회 및 관리 |
| 신고 관리 | `/reports` | 신고 접수 및 처리 (경고/정지/무혐의) |
| 알림 발송 | `/notifications` | 푸시 알림 작성 및 발송 이력 |
| 광고 관리 | `/ads` | 배너/핀 광고 관리, 소재 승인, 성과 분석 |
| 분석 | `/analytics` | GA4 이벤트 추적, 퍼널 분석 |
| 설정 | `/settings` | 배티켓 점수 규칙 설정 |

## 프로젝트 구조 (FSD)

```
app/                    # Next.js 페이지
src/
├── app/                # 프로바이더, 레이아웃
├── features/           # 기능별 모듈 (ui / api / model)
├── entities/           # 비즈니스 엔티티 타입
└── shared/             # 공용 유틸, UI, 설정
components/ui/          # shadcn/ui 컴포넌트
```

## 시작하기

```bash
npm install
npm run dev
```

### 환경 변수

`.env.local` 파일에 아래 값을 설정하세요:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
