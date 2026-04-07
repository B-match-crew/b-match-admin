# B-Match 관리자 페이지 DB 연동 명세서

> 대상: **React + Next.js** 관리자 페이지 개발자
> 기준: 기능명세서 v4.6.4
> 백엔드: Supabase (PostgreSQL + RLS + Edge Functions)

---

## 0. 개요

- 관리자 페이지는 Supabase JS Client (`@supabase/supabase-js`) 를 사용해 직접 DB에 접근합니다.
- 관리자 권한은 `public.users.admin_role` (`SUPER_ADMIN` / `MANAGER`) 으로 식별됩니다.
- **모든 파괴적 액션은 RPC (`fn_admin_*`) 로 호출**하세요. 직접 UPDATE/DELETE 금지.
- 모든 관리자 액션은 `admin_audit_logs` 에 자동 기록됩니다.

### 권한 매트릭스

| 메뉴                | SUPER_ADMIN | MANAGER |
|---------------------|:-----------:|:-------:|
| 대시보드 (ADM-01)   | ✅          | ✅      |
| 유저 관리 (ADM-02)  | ✅          | ✅      |
| 정지 (SUSPEND)      | ✅          | ✅      |
| 영구차단 (BAN)      | ✅          | ❌      |
| 매칭 직권 삭제      | ✅          | ❌      |
| CS 신고 처리        | ✅          | ✅      |
| 푸시 발송 (ADM-05)  | ✅          | ✅      |

---

## 1. 인증 흐름

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// 1) 이메일 또는 OAuth 로그인
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// 2) admin_role 확인
const { data: me } = await supabase
  .from('users')
  .select('id, nickname, admin_role, is_deleted')
  .eq('id', data.user!.id)
  .single();

if (!me?.admin_role || me.is_deleted) {
  await supabase.auth.signOut();
  throw new Error('FORBIDDEN');
}
```

> Supabase Auth에서 관리자 계정은 별도로 만든 뒤 SQL로 `admin_role` 부여:
> ```sql
> update public.users set admin_role = 'SUPER_ADMIN' where id = '<auth-uid>';
> ```

---

## 2. ENUM 정의

```ts
export type UserStatus       = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type Gender           = 'MALE' | 'FEMALE';
export type Level            = 'S' | 'A' | 'B' | 'C' | 'D' | 'NOVICE' | 'BEGINNER';
export type AdminRole        = 'SUPER_ADMIN' | 'MANAGER';
export type GenderCondition  = 'MALE_ONLY' | 'FEMALE_ONLY' | 'ALL';
export type MatchStatus      = 'RECRUITING' | 'CLOSED' | 'ENDED';
export type ContactType      = 'URL' | 'PHONE';
export type ReportTargetType = 'POST' | 'COMMENT';
export type ReportStatus     = 'PENDING' | 'RESOLVED' | 'REJECTED';
export type NotificationType =
  | 'COMMUNITY_COMMENT'
  | 'COMMUNITY_REPLY'
  | 'COMMUNITY_BLIND'
  | 'SYSTEM_SUSPEND'
  | 'ADMIN_NOTICE';
export type DeviceOs         = 'IOS' | 'ANDROID';
```

---

## 3. 테이블 스키마

### 3.1 `users`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid (PK) | auth.users.id |
| name | text? | 본인인증 후 NOT NULL |
| nickname | text? unique | |
| phone_number | text? unique | |
| gender | Gender? | |
| birth_year | int? | |
| level | Level? | |
| is_host | boolean | default false |
| user_status | UserStatus | default 'ACTIVE' |
| ci_hash | text? unique | 본인인증 CI SHA-256 |
| marketing_opt_in | boolean | |
| is_deleted | boolean | Soft Delete |
| admin_role | AdminRole? | NULL = 일반 유저 |
| suspended_until | timestamptz? | |
| suspended_reason | text? | |
| deleted_at | timestamptz? | |
| created_at / updated_at | timestamptz | |

### 3.2 `host_profiles`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint (PK) | |
| user_id | uuid unique → users.id | |
| club_name | text | |
| description | text? | |
| cover_image_url | text? | |
| min_level_required | Level | v4.6.4 |
| gender_ratio_male / female | int | sum=100 |
| age_distribution | jsonb | `{"20s":40,"30s":30,...}` |
| level_distribution | jsonb | `{"S":2,"A":5,...}` |
| is_deleted | boolean | |

### 3.3 `matches`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint (PK) | |
| host_id | uuid → users.id | |
| title | text | host_profiles.club_name 자동 복사 |
| start_time / end_time | timestamptz | UTC |
| location_name / location_detail / address | text | |
| latitude / longitude | numeric(10,7) | |
| region_1 / region_2 | text | 광역/시군구 |
| capacity | int? | MVP에서 NULL |
| gender_condition | GenderCondition | |
| age_min_year / age_max_year | int? | 한쪽만 입력 허용 |
| allowed_levels | Level[] | 다중 |
| beginner_friendly | boolean | |
| fee_config | jsonb | (아래 인터페이스 참조) |
| facilities | jsonb | `{parking,shower,water,rental}` |
| description | text? | 최대 3000자 |
| contact_type / contact_value | ContactType / text | MVP는 URL |
| status | MatchStatus | |
| is_manually_closed / is_deleted | boolean | |

```ts
interface FeeConfig {
  fee: {
    type: 'NONE' | 'CASH' | 'COCK' | 'CASH_COCK';
    cash_male?: number;
    cash_female?: number;
    cock_male?: number;
    cock_female?: number;
  };
  facility_fee: {
    enabled: boolean;
    amount?: number;
    payment?: 'ON_SITE';
  };
  designated_cock: {
    brand?: string;
    retail_enabled: boolean;
    retail_price?: number;
  };
}
```

### 3.4 `posts`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint (PK) | |
| author_id | uuid → users.id | |
| title | text (≤50) | |
| content | text (≤3000) | |
| comment_count | int | trigger 자동 |
| is_blind / is_edited / is_deleted | boolean | |

### 3.5 `comments`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id / post_id / author_id | | |
| parent_id | bigint? → comments.id | 1-depth 대댓글 |
| content | text (≤1000) | |
| is_blind / is_deleted | boolean | |

### 3.6 `reports`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint (PK) | |
| reporter_id | uuid → users.id | |
| target_type | ReportTargetType | |
| target_id | bigint | post_id 또는 comment_id |
| status | ReportStatus | default PENDING |
| created_at | timestamptz | |
| (UNIQUE) | reporter_id + target_type + target_id | 중복 신고 방어 |

### 3.7 `notifications`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id / user_id | | |
| type | NotificationType | |
| title / body | text | |
| deeplink_route | text? | |
| deeplink_params | jsonb? | |
| is_read | boolean | |

### 3.8 `fcm_tokens`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id / user_id / token | | |
| device_os | DeviceOs | |

### 3.9 `permanent_blacklist`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| ci_hash | text unique | |
| user_id | uuid? | |
| reason | text | |

### 3.10 `admin_audit_logs`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | bigint (PK) | |
| admin_id | uuid → users.id | |
| action_type | text | `SUSPEND_USER` / `BAN_USER` / `DELETE_MATCH` / `BLIND_POST` / `UNBLIND_POST` / `SEND_PUSH` / `REJECT_REPORT` |
| target_type / target_id | text? | |
| detail | jsonb? | before/after 스냅샷 등 |
| reason | text? | |
| created_at | timestamptz | |

> DELETE/UPDATE 금지 (영구 보관)

---

## 4. RPC 함수

### 4.1 `fn_admin_suspend_user`
```ts
await supabase.rpc('fn_admin_suspend_user', {
  p_user_id: 'uuid',
  p_until: '2026-05-01T00:00:00Z',
  p_reason: '욕설 신고 누적 (3건 검증 완료)',  // 10자 이상
});
```
- 권한: `MANAGER` 이상
- 자동: `SYSTEM_SUSPEND` 알림 발송 + audit log 기록

### 4.2 `fn_admin_ban_user`
```ts
await supabase.rpc('fn_admin_ban_user', {
  p_user_id: 'uuid',
  p_reason: '...',
});
```
- 권한: `SUPER_ADMIN` 만
- 자동: `permanent_blacklist` 등록 + 진행 전 호스트 모임 강제 삭제 + audit log

### 4.3 `fn_admin_delete_match`
```ts
await supabase.rpc('fn_admin_delete_match', {
  p_match_id: 123,
  p_reason: '...',
});
```
- 권한: `SUPER_ADMIN`
- 자동: 호스트에게 `ADMIN_NOTICE` 알림 + audit log

### 4.4 `fn_admin_unblind_post`
```ts
await supabase.rpc('fn_admin_unblind_post', {
  p_post_id: 456,
  p_reason: '오인 신고 판명',
});
```
- 권한: `MANAGER` 이상
- 자동: 기존 PENDING reports → RESOLVED 전환 (재집계 차단) + audit log

---

## 5. Edge Functions

### 5.1 `POST /functions/v1/send-push` (ADM-05)

```ts
const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    target: 'ALL',                // 'ALL' | 'HOSTS' | 'GUESTS' | 'USERS'
    user_ids: [],                 // target='USERS' 일 때만
    type: 'ADMIN_NOTICE',
    title: '점검 안내',
    body: '오늘 새벽 2시에 잠시 점검합니다.',
    deeplink_route: '/',
    deeplink_params: {},
  }),
});
```
- 응답: `{ sent, db, target }`
- 자동: `notifications` INSERT + FCM v1 발송 + 만료 토큰 정리 + audit log

---

## 6. 화면별 쿼리 가이드

### 6.1 ADM-01 대시보드

```ts
// Today DAU (간이 — fcm_tokens.updated_at 기준)
const since = new Date(); since.setHours(0,0,0,0);
const { count: dau } = await supabase
  .from('fcm_tokens')
  .select('user_id', { count: 'exact', head: true })
  .gte('updated_at', since.toISOString());

// 미처리 CS 신고
const { count: pendingReports } = await supabase
  .from('reports')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'PENDING');

// 오늘 예정 모임 / 모집 중 모임
const start = new Date(); start.setHours(0,0,0,0);
const end   = new Date(); end.setHours(23,59,59,999);
const { count: todayMatches } = await supabase
  .from('matches')
  .select('id', { count: 'exact', head: true })
  .eq('is_deleted', false)
  .gte('start_time', start.toISOString())
  .lte('start_time', end.toISOString());

const { count: recruiting } = await supabase
  .from('matches')
  .select('id', { count: 'exact', head: true })
  .eq('is_deleted', false)
  .eq('status', 'RECRUITING');
```

### 6.2 ADM-02 유저 관리

```ts
// 통합 검색 (실명 / 닉네임 / 전화번호 / UUID)
const term = '...';
let q = supabase
  .from('users')
  .select('id, name, nickname, phone_number, user_status, is_host, admin_role, is_deleted, created_at')
  .order('created_at', { ascending: false })
  .limit(50);

if (includeDeleted === false) q = q.eq('is_deleted', false);
if (term.match(/^[0-9a-f-]{36}$/i)) {
  q = q.eq('id', term);
} else if (term.match(/^[0-9-]+$/)) {
  q = q.ilike('phone_number', `%${term}%`);
} else {
  q = q.or(`name.ilike.%${term}%,nickname.ilike.%${term}%`);
}
const { data } = await q;
```

신고 누적 횟수는 별도 집계 쿼리:
```ts
const { data: reportCounts } = await supabase
  .from('reports')
  .select('reporter_id, count:id')
  // ...추가 집계는 view 또는 RPC로 분리 권장
```

### 6.3 ADM-03 매칭 직권 관리

```ts
// 매칭 그리드
const { data: matches } = await supabase
  .from('matches')
  .select(`
    id, title, host_id, start_time, location_name, status, capacity, is_deleted, created_at,
    host:users!matches_host_id_fkey(nickname, name)
  `)
  .order('start_time', { ascending: false })
  .limit(50);

// 직권 삭제
await supabase.rpc('fn_admin_delete_match', { p_match_id, p_reason });
```

### 6.4 ADM-04 CS 신고 관리

```ts
// 미처리 신고 + 대상 콘텐츠 함께
const { data } = await supabase
  .from('reports')
  .select(`
    id, reporter_id, target_type, target_id, status, created_at,
    reporter:users!reports_reporter_id_fkey(nickname)
  `)
  .eq('status', 'PENDING')
  .order('created_at', { ascending: false });

// target 콘텐츠 조회는 target_type 에 따라 분기
async function loadTarget(r) {
  if (r.target_type === 'POST') {
    return supabase.from('posts').select('*').eq('id', r.target_id).single();
  }
  return supabase.from('comments').select('*').eq('id', r.target_id).single();
}

// 처리 — 반려
await supabase
  .from('reports')
  .update({ status: 'REJECTED' })
  .eq('id', reportId);

// 처리 — 제재 (정지)
await supabase.rpc('fn_admin_suspend_user', { p_user_id, p_until, p_reason });
```

### 6.5 ADM-05 푸시 발송

위 §5.1 참조.

---

## 7. 에러 코드

RPC 호출 시 발생하는 PostgreSQL 에러 코드와 의미:

| 코드 | 의미 |
|---|---|
| 42501 | AUTH_REQUIRED / NOT_ADMIN / NOT_SUPER_ADMIN |
| P0001 | UNDER_14 (만 14세 미만) |
| P0002 | PERMANENTLY_BANNED |
| P0003 | CI_DUPLICATE (중복 가입) |
| P0004 | WITHDRAWN_RECENTLY (30일 내 재가입 시도) |
| P0005 | USER_ROW_NOT_FOUND |
| P0010 | NOT_ELIGIBLE (호스트 등록 자격 미달) |
| P0020 | USER_NOT_FOUND |
| P0021 | HAS_ACTIVE_MATCHES (탈퇴 차단) |
| P0030 | MATCH_NOT_FOUND_OR_INVALID_STATE (close) |
| P0031 | MATCH_NOT_FOUND_OR_INVALID_STATE (reopen) |
| P0040 | REASON_TOO_SHORT (정지 사유 10자 미만) |

---

## 8. 권장 폴더 구조 (Next.js app router)

```
admin-web/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx              # admin_role guard
│   │   ├── dashboard/page.tsx      # ADM-01
│   │   ├── users/page.tsx          # ADM-02
│   │   ├── matches/page.tsx        # ADM-03
│   │   ├── reports/page.tsx        # ADM-04
│   │   └── push/page.tsx           # ADM-05
├── lib/
│   ├── supabase.ts
│   ├── types.ts
│   └── rpc.ts
└── components/
```

---

## 9. 변경사항 알림

스키마 변경이 있을 때마다 이 문서를 갱신합니다. 마지막 갱신: **v4.6.4 초기 작성**.
