# B-Match Admin — 수동 셋업 체크리스트

> 코드 리팩토링 외에 **사람이 직접 처리해야 하는** 항목들.
> 이 항목들을 끝내야 운영 시작이 가능합니다.

---

## 1. 환경 변수 (`.env.local`)

```env
# Supabase 프로젝트
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>

# Server-only (Server Action 에서 RLS 우회)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

- `SUPABASE_SERVICE_ROLE_KEY` 는 **절대 클라이언트 번들에 포함되면 안 됨** — `NEXT_PUBLIC_` 접두사 금지.
- Vercel 배포 시 동일 키를 Project Settings → Environment Variables 에 등록.

---

## 2. Supabase 백엔드 적용

### 2-1. 마이그레이션 SQL

`b-match-app/supabase/migrations/` 의 v4.6.4 마이그레이션이 **이미 적용되어 있어야** 이 관리자 앱이 동작합니다.

확인할 테이블:
- `users` (with `admin_role`, `suspended_until`, `suspended_reason`, `is_deleted`)
- `host_profiles`
- `matches` (with `region_1`, `region_2`, `location_name`, `fee_config`, `is_manually_closed`, `is_deleted`)
- `posts`, `comments` (with `is_blind`, `is_edited`)
- `reports` (간소화 — `reason_category`, `reason_detail` 컬럼 없음)
- `notifications`, `fcm_tokens`
- `permanent_blacklist`
- `admin_audit_logs`

확인할 RPC 함수:
- `fn_admin_suspend_user(p_user_id, p_until, p_reason)`
- `fn_admin_ban_user(p_user_id, p_reason)`
- `fn_admin_delete_match(p_match_id, p_reason)`
- `fn_admin_unblind_post(p_post_id, p_reason)`

확인할 Edge Function:
- `send-push` (FCM v1 전송 + notifications INSERT + 만료 토큰 정리)

> 누락 시 [admin_db_spec.md §3, §4, §5](admin_db_spec.md) 참조.

### 2-2. RLS 정책 점검

- Service Role 키로 우회 가능하지만, 일반 anon 키로는 `users.admin_role` SELECT 가 본인 row 만 가능해야 함 (auth-provider 가 단일 row 조회만 함).
- `admin_audit_logs` 는 SELECT 차단 (관리자 view 외 접근 금지).

### 2-3. Edge Function 환경 변수 (Supabase Dashboard)

`send-push` 함수에 다음 secrets 등록:

```
FCM_SERVICE_ACCOUNT_JSON=<Firebase 서비스 계정 JSON 문자열>
```

또는 `b-match-app/supabase/functions/send-push/index.ts` 의 변수명에 맞춰 등록.

---

## 3. FCM (Firebase Cloud Messaging) 설정

### 3-1. Firebase 프로젝트

- [ ] Firebase Console 에서 프로젝트 생성 (또는 기존 사용)
- [ ] iOS / Android 앱 등록 (`b-match-app` 측 작업)
- [ ] Service Account JSON 키 생성 (FCM v1 API용)

### 3-2. Service Account 키 등록

- [ ] Supabase Edge Function secrets 에 `FCM_SERVICE_ACCOUNT_JSON` 등록
- [ ] `client_email`, `private_key`, `project_id` 포함 확인

### 3-3. 동작 검증

1. 모바일 앱에서 FCM 토큰 발급 → `fcm_tokens` 테이블에 INSERT 되는지 확인
2. 관리자 페이지 `/push` 에서 본인 user_id 로 **테스트 발송** 클릭
3. 모바일에서 수신 확인
4. `notifications` 테이블에 `type='ADMIN_NOTICE'` row 생성 확인

> 토큰 만료/무효 정리는 Edge Function 내부에서 자동 처리됨.

---

## 4. 첫 SUPER_ADMIN 계정 생성

### 4-1. Supabase Auth 에 사용자 생성

Supabase Dashboard → Authentication → Users → **Add user**
- Email: 운영자 이메일
- Password: 임시 비밀번호
- Auto Confirm User: ✅

### 4-2. SQL Editor 에서 admin_role 부여

```sql
-- 1) users 테이블에 row 가 자동 생성됐는지 확인
select id, nickname, admin_role, is_deleted from public.users where id = '<auth-uid>';

-- 2) row 가 없으면 insert (트리거가 없는 경우)
insert into public.users (id, is_host, user_status, marketing_opt_in, is_deleted)
values ('<auth-uid>', false, 'ACTIVE', false, false)
on conflict (id) do nothing;

-- 3) SUPER_ADMIN 부여
update public.users
set admin_role = 'SUPER_ADMIN'
where id = '<auth-uid>';
```

### 4-3. 추가 MANAGER 계정

```sql
update public.users set admin_role = 'MANAGER' where id = '<auth-uid>';
```

권한 차이는 [admin_db_spec.md §0 권한 매트릭스](admin_db_spec.md) 참조.

---

## 5. 로컬 개발 / 배포

### 5-1. 로컬 실행

```bash
npm install
npm run dev
# → http://localhost:3000
```

1. `/login` 으로 자동 리다이렉트
2. 위에서 만든 SUPER_ADMIN 계정으로 로그인
3. 대시보드 4개 위젯이 0이 아닌 숫자 또는 0으로 정상 표시되는지 확인
4. `/reports`, `/users`, `/matches`, `/push`, `/audit-logs` 순서로 클릭 → 에러 없이 표시되는지

### 5-2. Vercel 배포

- [ ] Vercel 프로젝트 생성 + Github 연동
- [ ] Environment Variables 등록 (위 §1)
- [ ] **Production Branch**: `main`
- [ ] **Build Command**: `npm run build` (기본)
- [ ] 첫 배포 후 production URL 로 로그인 동작 확인

### 5-3. 도메인 (선택)

- [ ] `admin.b-match.kr` 등 별도 도메인 연결
- [ ] DNS A/CNAME → Vercel 안내 따라 등록

---

## 6. 운영 시작 후 점검 (Day 1)

- [ ] SUPER_ADMIN / MANAGER 두 계정으로 로그인
- [ ] **권한 매트릭스 검증**:
  - [ ] MANAGER 로 영구차단/매칭 직권 삭제 버튼이 **숨겨져 있는지**
  - [ ] MANAGER 로 `/audit-logs` 접근 시 사이드바에 **메뉴 안 보이는지**
  - [ ] SUPER_ADMIN 으로 모든 액션 정상 동작
- [ ] **에러 코드 매핑 동작 확인**:
  - [ ] 정지 사유 9자 입력 → "사유는 10자 이상 입력해야 합니다" (P0040)
  - [ ] 존재하지 않는 user_id → "유저를 찾을 수 없습니다" (P0020)
- [ ] **푸시 발송 테스트**:
  - [ ] 본인에게 테스트 발송 → 모바일 수신 확인
  - [ ] 야간 시간(21~08시) 진입 시 경고 모달 표시 확인
- [ ] **감사 로그 확인**: 위 액션들이 `admin_audit_logs` 에 모두 기록됐는지

---

## 7. 보안 체크 (운영 전 필수)

- [ ] `.env.local` 이 `.gitignore` 에 포함되어 있는지 확인
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 가 클라이언트 번들에 포함되지 않았는지:
  ```bash
  npm run build
  grep -r "SERVICE_ROLE" .next/static/ 2>/dev/null
  # → 출력 없어야 정상
  ```
- [ ] Supabase Dashboard → API → service_role key 노출 위치 점검
- [ ] Vercel deployment protection 활성화 (관리자 페이지는 공개될 필요 없음)

---

## 참고 문서

- [admin_db_spec.md](admin_db_spec.md) — 스키마/RPC/Edge Function 레퍼런스
- [admin_refactor_plan.md](admin_refactor_plan.md) — Phase별 작업 가이드
- [TODO.md](TODO.md) — 코드 차원의 추가 개선 항목
