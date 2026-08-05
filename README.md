# B-Match Admin

배드민턴 매칭 플랫폼 **B-Match**의 운영 관리자 콘솔입니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **런타임**: Node.js 20+ (Next 16 요구사항)
- **패키지 매니저**: pnpm
- **Backend**: Supabase (Auth + Postgres). 집계는 `service_role` 서버 액션에서 RPC로 처리
- **서버 상태**: TanStack React Query · **인증 상태**: React Context
- **폼/검증**: react-hook-form + Zod
- **UI**: shadcn/ui (Base UI 기반) + Tailwind CSS 4. 앱과 톤을 맞춘 BDS(B-match Design System) 토큰을 `app/globals.css`에 이식
- **차트**: Recharts
- **외부 분석**: GA4 Data API (획득 지표) — 선택적

## 주요 기능

| 메뉴 | 경로 | 설명 |
|------|------|------|
| 대시보드 | `/` | 핵심 운영 지표 요약 |
| 통계 | `/stats` | 유입·누적 추이, 인구통계, 지역·시간대 분포, 신고·인기 매칭 |
| 분석 | `/analytics` | GA4 획득 + 자체 이벤트 기반 퍼널·리텐션·DAU/WAU/MAU |
| 유저 관리 | `/users` | 유저 검색·상세, 정지/영구차단/해제 |
| 모임 관리 | `/clubs` | 개설된 모임(클럽) 조회 (`host_profiles`) |
| 매칭 관리 | `/matches` | 모집글 조회·검색·정렬, 직권 삭제 |
| 신고 관리 | `/reports` | 신고 접수 검토 및 조치 |
| 차단 관리 | `/blocks` | 차단 랭킹(문제 유저 식별) + 영구 차단 목록 |
| 앱 관리 | `/app-version` | 강제 업데이트 정책 + 서버 점검(maintenance) 토글 |
| 감사 로그 | `/audit-logs` | 관리자 행위 이력 (SUPER_ADMIN 전용) |

> 매칭(matches)은 모임(host_profiles)이 올리는 개별 모집글입니다 — "모임"이 상위 개념입니다.

## 인증 / 보안

- 관리자 페이지는 `app/(admin)/` route group 하위에 있고, 그룹 레이아웃이 인증 가드와 셸(사이드바/헤더)을 담당합니다. 로그인(`/login`)은 셸 밖 전체화면입니다.
- **서버측 방어선이 실제 보호선**입니다: `proxy.ts`가 미인증 요청을 `/login`으로 리다이렉트하고, 서버 액션은 `requireAdmin()`으로 역할을 재검증합니다. `admin_role`이 없는 계정은 로그인 시점에 차단됩니다.
- 데이터 접근은 `service_role` 키를 쓰는 서버 전용 admin 클라이언트로만 이뤄집니다. 이 키는 클라이언트에 노출되지 않습니다.

## 프로젝트 구조

```
app/
├── (admin)/            # 인증 필요 — 그룹 레이아웃이 셸 + 가드 담당
│   ├── layout.tsx      # AuthGuard + AdminLayout
│   ├── page.tsx        # 대시보드
│   └── users, clubs, matches, reports, blocks,
│       stats, analytics, app-version, audit-logs
├── login/              # 셸 밖 전체화면 로그인
├── layout.tsx          # 루트: 프로바이더만
├── icon.png            # 파비콘 (Next 파일 컨벤션)
└── opengraph-image.png # OG 이미지

src/
├── app/                # 프로바이더, 레이아웃, 인증 가드
├── features/           # 기능별 모듈 (actions.ts + ui/)
└── shared/             # 공용 UI, BDS 컴포넌트, 유틸, 설정

components/ui/          # shadcn/ui 프리미티브 (BDS 값으로 재매핑)
supabase/               # DB 마이그레이션·스키마 (git 미추적, 아래 참고)
```

## 시작하기

```bash
pnpm install
pnpm dev
```

기타 스크립트: `pnpm build` · `pnpm start` · `pnpm lint`

### 환경 변수

`.env.local`에 설정합니다.

```bash
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # 서버 전용. 절대 클라이언트에 노출 금지

# 메타데이터 (권장) — OG 이미지 절대 URL 생성용
NEXT_PUBLIC_SITE_URL=

# GA4 Data API (선택) — /analytics 의 GA4 획득 카드용
GA4_PROPERTY_ID=
GA4_SA_KEY=                     # 서비스 계정 키 JSON
```

## 데이터베이스

DB 마이그레이션과 스키마 문서는 `supabase/`에 있으나 **git으로 추적하지 않습니다**(`.gitignore`의 `/supabase/`). 앱 저장소(b-match-app)와 공유되는 산출물이기 때문입니다. 관리자 화면이 의존하는 집계는 대부분 `fn_admin_*` RPC(service_role 전용)로 구현되어 있으며, 새 기능을 추가할 때는 해당 마이그레이션을 별도로 적용해야 합니다.
