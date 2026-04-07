# B-Match 관리자 페이지 리팩토링 가이드

> 대상: **기존 b-match-admin (React + Next.js) 프로젝트**
> 기준: 기능명세서 v4.6.4 + b-match-app `refactor/v4.6.4` 머지 결과
> 짝 문서: [admin_db_spec.md](admin_db_spec.md) — 스키마/RPC/Edge Function 레퍼런스

---

## 0. 한 줄 요약

기존 관리자 페이지가 v4.6.4 이전 스키마(결제/배티켓/매칭관리/지갑 포함)를 기준으로 만들어졌다면, **테이블 절반과 RPC 전체가 사라졌으므로** 거의 새로 작성하는 수준의 리팩토링이 필요합니다. 명세서 §11 ADM-00~05만 남기고 나머지 화면은 제거하세요.

---

## 1. 핵심 변경 사항 (v4.0 → v4.6.4)

| 영역 | 변경 |
|---|---|
| **결제/정산** | ❌ 전면 삭제. `payments`, `host_wallets`, `wallet_histories`, `settlement_*` 테이블 모두 DROP. 관련 관리자 화면(결제 내역/정산 처리/지갑 잔액) 제거 |
| **배티켓 시스템** | ❌ 전면 삭제. `evaluations`, `badticket_events` 테이블 DROP. 점수 조정 화면 제거 |
| **매칭 신청 플로우** | ❌ 전면 삭제. `applications` 테이블 DROP. 신청 승인/거절 화면 제거 |
| **users 테이블** | `auth_id` 컬럼 폐지. **`users.id == auth.uid()`** 직접 매핑. 신규 컬럼: `admin_role`, `suspended_until`, `suspended_reason` |
| **matches 테이블** | `region` → `region_1`/`region_2` 분리. `location` → `location_name`/`location_detail`. `fee_config` JSON 구조 재설계 (통합 fee + facility_fee + designated_cock). `host_id` 직접 참조 |
| **posts/comments** | `like_count` 컬럼 삭제. `is_edited` 추가. `comment_count` DB trigger 자동 동기화 |
| **reports 테이블** | `reason_category`, `reason_detail` 컬럼 삭제 (간소화). 관리자가 원문 직접 검토 |
| **notices 테이블** | ❌ 별도 테이블 없음. `notifications.type = 'ADMIN_NOTICE'` 로 통합 |
| **admin_audit_logs 테이블** | ✅ 신규. 모든 관리자 액션 자동 기록 (DELETE 금지) |
| **permanent_blacklist** | ✅ 신규. BAN 시 CI 해시 영구 보존 |

---

## 2. 메뉴 구조 (명세서 §11 그대로 유지)

```
admin-web/
└── (admin)/
    ├── dashboard/         # ADM-01 (4개 위젯 + GA4 퍼널)
    ├── users/             # ADM-02 유저 관리/제재
    ├── matches/           # ADM-03 매칭 직권 관리
    ├── reports/           # ADM-04 CS 신고 관리 (운영 핵심)
    └── push/              # ADM-05 푸시 발송
```

> v4.4부터 "**Tailwind 기본 스타일 + 별도 디자인 시안 없이 기능 중심**" 으로 정해졌습니다. 디자이너 작업 불필요.

---

## 3. RBAC (권한 매트릭스)

| 메뉴 / 액션 | SUPER_ADMIN | MANAGER |
|---|:---:|:---:|
| 대시보드 조회 | ✅ | ✅ |
| 유저 검색/조회 | ✅ | ✅ |
| 유저 정지 (SUSPEND) | ✅ | ✅ |
| 유저 영구차단 (BAN) | ✅ | ❌ |
| 매칭 직권 삭제 | ✅ | ❌ |
| 게시글 블라인드 해제 | ✅ | ✅ |
| CS 신고 처리 | ✅ | ✅ |
| 푸시 발송 | ✅ | ✅ |

권한 검증은 **DB RPC 함수 내부**에서 `is_admin()` / `is_super_admin()` 헬퍼로 자동 처리됩니다 ([02_rls.sql](supabase/migrations/02_rls.sql) §0). 클라에서는 UI 분기만 처리하고 실제 보안은 RPC가 담당.

---

## 4. 🔴 리팩토링 TODO — 우선순위 순

### Phase A. 환경 정리 (1일)

- [ ] **A-1.** 기존 관리자 프로젝트 레포 백업 브랜치 생성 (`backup/pre-v4.6.4`)
- [ ] **A-2.** `package.json` 의존성 점검:
  - `@supabase/supabase-js` 최신 (`^2.48` 이상)
  - `@supabase/ssr` 추가 (Next.js 14 App Router 인증용)
  - 결제/포트원 관련 패키지 모두 제거
- [ ] **A-3.** `.env.local` 갱신:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  ```
  (Service Role Key는 절대 클라에 두지 말고 Edge Function 으로만 사용)
- [ ] **A-4.** 새 TypeScript 타입 파일 작성: `lib/types.ts` ← [admin_db_spec.md §2 ENUM](admin_db_spec.md) 그대로 복사

### Phase B. 인증 + 가드 (1일)

- [ ] **B-1.** 기존 admin 로그인 화면이 `users.auth_id` 컬럼을 참조한다면 모두 `users.id` 로 수정
- [ ] **B-2.** `(admin)/layout.tsx` 에서 admin_role 가드 구현:
  ```ts
  const { data: me } = await supabase
    .from('users')
    .select('admin_role, is_deleted')
    .eq('id', user.id)
    .single();
  if (!me?.admin_role || me.is_deleted) redirect('/login');
  ```
- [ ] **B-3.** `lib/admin-context.tsx` 또는 React Query 로 현재 관리자 정보 + role 보관
- [ ] **B-4.** SUPER_ADMIN 전용 액션 버튼은 `me.admin_role === 'SUPER_ADMIN'` 으로 분기

### Phase C. 삭제 대상 화면 제거 (1일)

기존 admin 프로젝트에 다음 화면이 있다면 **전부 삭제**:

- [ ] **C-1.** 결제 내역 / 환불 처리 / PG 매칭 화면
- [ ] **C-2.** 호스트 지갑 / 정산 요청 / 정산 처리 화면
- [ ] **C-3.** 배티켓 점수 조정 / 평가 통계 화면
- [ ] **C-4.** 매칭 신청 승인/거절 / 신청자 관리 화면
- [ ] **C-5.** 공지사항 별도 CRUD 화면 → ADM-05 푸시 발송 + ADMIN_NOTICE 로 대체
- [ ] **C-6.** 관련 라우트 / 사이드바 메뉴 / API 호출 코드 정리

### Phase D. ADM-04 CS 신고 관리 — **최우선 구현** (2~3일)

운영 핵심. 신고 즉시 대응이 필요하므로 다른 메뉴보다 먼저.

- [ ] **D-1.** 신고 그리드 (`/admin/reports`):
  ```ts
  const { data } = await supabase
    .from('reports')
    .select(`
      id, reporter_id, target_type, target_id, status, created_at,
      reporter:users!reports_reporter_id_fkey(nickname, name)
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });
  ```
- [ ] **D-2.** 신고 상세 모달: `target_type` 따라 `posts` 또는 `comments` 원문 조회
- [ ] **D-3.** **반려** 액션: `reports.status = 'REJECTED'` UPDATE + 사유 audit log
- [ ] **D-4.** **제재** 액션 분기:
  - 게시글 블라인드 해제: `fn_admin_unblind_post(p_post_id, p_reason)` RPC
  - 작성자 정지: `fn_admin_suspend_user(p_user_id, p_until, p_reason)` RPC (사유 10자 이상 필수)
  - 작성자 영구차단: `fn_admin_ban_user(p_user_id, p_reason)` RPC (SUPER_ADMIN only)
- [ ] **D-5.** 동일 대상 신고 누적 카운트 표시 (3건 이상 자동 블라인드 — DB trigger 가 처리)

### Phase E. ADM-02 유저 관리 (2일)

- [ ] **E-1.** 통합 검색 폼: 실명 / 닉네임 / 전화번호 / UUID
  - UUID 패턴: `^[0-9a-f-]{36}$` → `eq('id', term)`
  - 숫자/하이픈만: `ilike('phone_number', '%term%')`
  - 그 외: `or('name.ilike.%term%,nickname.ilike.%term%')`
- [ ] **E-2.** `[v] 탈퇴한 유저 포함` 체크박스 → `eq('is_deleted', false)` 토글
- [ ] **E-3.** 유저 상세 패널: 가입일, 상태, 권한, 누적 신고 횟수
- [ ] **E-4.** 정지/해제/영구차단 액션 → 위 RPC 재사용
- [ ] **E-5.** 정지 사유 10자 미만 시 `P0040 REASON_TOO_SHORT` 에러 핸들링

### Phase F. ADM-03 매칭 직권 관리 (1~2일)

- [ ] **F-1.** 매칭 그리드:
  ```ts
  await supabase
    .from('matches')
    .select(`
      id, title, host_id, start_time, location_name, region_1, status,
      is_deleted, created_at,
      host:users!matches_host_id_fkey(nickname, name)
    `)
    .order('start_time', { ascending: false });
  ```
- [ ] **F-2.** 필터: 날짜 / 상태 (RECRUITING / CLOSED / ENDED) / 삭제 포함 여부
- [ ] **F-3.** 직권 삭제 액션 → `fn_admin_delete_match(p_match_id, p_reason)` RPC
  - 호스트에게 자동 ADMIN_NOTICE 발송 (RPC 내부 처리)
- [ ] **F-4.** 블라인드된 게시글 별도 탭: `posts WHERE is_blind = true`
  - 검토 후 영구 삭제 또는 `fn_admin_unblind_post`

### Phase G. ADM-05 푸시 발송 (1일)

- [ ] **G-1.** 발송 폼: 타겟(전체/호스트/게스트/UUID 입력) + 제목 + 본문 + 즉시/예약
- [ ] **G-2.** **야간 방어** (21:00 ~ 08:00) 경고 모달
- [ ] **G-3.** [테스트 발송] → 본인 user_id 만 타겟으로 호출
- [ ] **G-4.** Edge Function 호출:
  ```ts
  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: 'ALL',
      type: 'ADMIN_NOTICE',
      title, body,
      deeplink_route: '/',
      deeplink_params: {},
    }),
  });
  ```
- [ ] **G-5.** 응답 표시: `{ sent, db, target }` (실제 발송 수, DB 알림 수, 타겟 수)

### Phase H. ADM-01 대시보드 (1일)

- [ ] **H-1.** 4개 위젯 카드:
  - **Today DAU**: 임시로 `fcm_tokens` 갱신 수 또는 별도 활동 로그 (정확도는 후순위)
  - **미처리 CS 신고**: `reports WHERE status='PENDING' COUNT`
  - **오늘 예정 모임**: `matches WHERE start_time BETWEEN today AND tomorrow`
  - **모집 중 모임**: `matches WHERE status='RECRUITING' AND is_deleted=false`
- [ ] **H-2.** GA4 퍼널은 후순위 — Looker Studio 임베딩 또는 GA4 Data API (선택)

### Phase I. 감사 로그 뷰어 — 옵션 (반나절)

- [ ] **I-1.** `/admin/audit-logs` 뷰어 (SUPER_ADMIN 만)
- [ ] **I-2.** 액션 타입 / 관리자 / 대상 / 사유 / 시각 표 — `admin_audit_logs` 단순 조회

### Phase J. QA + 배포 (1일)

- [ ] **J-1.** SUPER_ADMIN / MANAGER 두 계정으로 권한 매트릭스 검증
- [ ] **J-2.** 에러 코드 표 ([admin_db_spec.md §7](admin_db_spec.md)) 기반 에러 핸들링 점검
- [ ] **J-3.** 첫 SUPER_ADMIN 등록 (DB SQL 직접):
  ```sql
  update public.users set admin_role = 'SUPER_ADMIN' where id = '<auth-uid>';
  ```
- [ ] **J-4.** Vercel 배포 + 환경변수 설정

---

## 5. 🟡 코드 마이그레이션 체크리스트 (기존 코드 수정 시)

기존 b-match-admin 코드에서 다음 문자열을 검색해 일괄 수정:

### Find & Replace

| 기존 | 신규 | 비고 |
|---|---|---|
| `auth_id` | `id` | users 테이블 PK 변경 |
| `users.profile_image_url` | (삭제) | 컬럼 폐지 |
| `users.real_name` | `users.name` | 컬럼명 변경 |
| `users.battiket_score` | (삭제) | 배티켓 폐지 |
| `users.skill_level` | `users.level` | 컬럼명 변경 |
| `matches.location` | `matches.location_name` | 컬럼명 분리 |
| `matches.region` | `matches.region_1` | 컬럼명 변경 |
| `matches.confirmed_count` | (삭제) | capacity 추적 폐지 |
| `matches.is_manually_close` | `matches.is_manually_closed` | 오타 수정 |
| `matches.host_name` | `matches.title` 또는 JOIN | club_name 자동 복사 |
| `matches.notice` | `matches.description` | 통합 |
| `applications` | (테이블 삭제) | 신청 플로우 폐지 |
| `payments`, `host_wallets`, `wallet_*`, `settlement_*` | (테이블 삭제) | 결제 폐지 |
| `evaluations`, `badticket_events` | (테이블 삭제) | 배티켓 폐지 |
| `notices` | `notifications WHERE type='ADMIN_NOTICE'` | 통합 |
| `posts.like_count`, `comments.like_count` | (삭제) | 좋아요 폐지 |
| `reports.reason_category`, `reports.reason_detail` | (삭제) | 신고 간소화 |
| `rpc_*` (구버전) | `fn_admin_*` / `fn_*` | RPC 명명 규칙 변경 |

### RPC 매핑

| 구버전 RPC | 신버전 RPC |
|---|---|
| (없음 — 직접 update) | `fn_admin_suspend_user(p_user_id, p_until, p_reason)` |
| (없음) | `fn_admin_ban_user(p_user_id, p_reason)` |
| (없음) | `fn_admin_delete_match(p_match_id, p_reason)` |
| (없음) | `fn_admin_unblind_post(p_post_id, p_reason)` |
| `rpc_host_cancel_match` | (폐지) |
| `rpc_bulk_approve_applications` | (폐지 — applications 테이블 삭제) |
| `rpc_bulk_reject_pending` | (폐지) |
| `rpc_forfeit_application` | (폐지) |
| `rpc_delete_account` | `fn_request_account_deletion` (관리자 호출 X, 유저 본인만) |

---

## 6. 🟢 추천 기술 스택 (이미 적용 중이면 유지)

- **프레임워크**: Next.js 14 App Router + TypeScript
- **스타일**: Tailwind CSS + shadcn/ui (Table/Form/Dialog 컴포넌트 생산성)
- **테이블**: TanStack Table (페이지네이션/정렬/필터)
- **폼**: react-hook-form + zod
- **상태/캐시**: TanStack Query (Supabase 응답 캐싱)
- **인증**: `@supabase/ssr` (middleware/server component 에서 admin_role 검증)
- **차트**: recharts 또는 tremor (대시보드 위젯)

---

## 7. 핵심 참고 문서

| 문서 | 용도 |
|---|---|
| [admin_db_spec.md](admin_db_spec.md) | 11개 테이블 스키마, ENUM, RPC 호출법, 화면별 쿼리 예시, 에러 코드 |
| [기능명세서.md](기능명세서.md) §11 | ADM-00~05 화면 요구사항 원문 |
| [화면명세서.md](화면명세서.md) §13 | ADM 화면 UI 명세 (Tailwind 기본 스타일) |
| [supabase/migrations/04_functions.sql](supabase/migrations/04_functions.sql) | 모든 RPC 시그니처 + 에러 코드 |
| [supabase/migrations/02_rls.sql](supabase/migrations/02_rls.sql) | RLS 정책 (관리자 권한 처리) |
| [supabase/functions/send-push/index.ts](supabase/functions/send-push/index.ts) | ADM-05 푸시 Edge Function |

---

## 8. 작업 분량 추정

| Phase | 예상 분량 | 비고 |
|---|---|---|
| A. 환경 정리 | 0.5일 | 의존성 업데이트 + 타입 정의 복사 |
| B. 인증 + 가드 | 0.5일 | 기존 코드 있다면 수정만 |
| C. 구버전 화면 제거 | 0.5~1일 | 기존 화면 양에 따라 |
| D. ADM-04 CS 신고 | 2~3일 | **운영 최우선** |
| E. ADM-02 유저 관리 | 2일 | |
| F. ADM-03 매칭 관리 | 1~2일 | |
| G. ADM-05 푸시 | 1일 | Edge Function 호출만 |
| H. ADM-01 대시보드 | 1일 | GA4 제외 |
| I. 감사 로그 뷰어 | 0.5일 | 옵션 |
| J. QA + 배포 | 1일 | |
| **합계** | **약 10~12일** | 1인 풀타임 기준 |

기존 코드 재사용 정도에 따라 -30%~+30% 변동.

---

## 9. 다음 액션

1. 이 문서를 기존 b-match-admin 레포로 복사
2. [admin_db_spec.md](admin_db_spec.md) 도 함께 복사
3. Phase A → D 순서로 진행 (D부터 시작해도 무방)
4. 각 Phase 끝마다 staging Supabase 환경에서 동작 확인
5. 개발 완료 후 첫 SUPER_ADMIN 계정으로 운영 시작

---

**문서 버전**: v1 (2026-04-07 작성)
**스키마 기준**: 기능명세서 v4.6.4 / b-match-app refactor/v4.6.4 머지본
