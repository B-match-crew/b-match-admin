# 배포 가이드 — 개발기(dev) / 운영기(prod) 분리

이 관리자 페이지는 **하나의 코드베이스**로 dev / prod **두 환경에 따로 빌드·배포**한다.
환경 차이는 오직 **환경변수 3개**(어느 Supabase 프로젝트를 바라보는가)뿐이고, 코드는 동일하다.

---

## 0. 한눈에 보기

| 구분 | Supabase 프로젝트 | 바라보는 곳 | 배포 트리거(권장) |
|------|------------------|------------|------------------|
| **dev (개발기)** | b-match **dev** 프로젝트 | 개발/검수용 DB | `dev` 브랜치 |
| **prod (운영기)** | b-match **prod** 프로젝트 | 실서비스 DB | `main` 브랜치 |

환경변수(둘 다 동일한 **키 이름**, 값만 다름):

| 키 | 노출 | 설명 |
|----|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 클라이언트(빌드 타임 inline) | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트(빌드 타임 inline) | anon 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용(절대 노출 금지)** | service_role 키. RLS 우회 — 서버 액션에서만 사용 |

> 값은 각 Supabase 프로젝트 → **Settings → API** 에서 확인한다.
> URL/anon 은 `Project URL` / `Project API keys > anon public`, service_role 은 `Project API keys > service_role`.

---

## ⚠️ 가장 중요한 제약 — "한 번 빌드해서 양쪽 배포" 불가

`NEXT_PUBLIC_*` 변수는 Next.js가 **빌드 시점에 번들 코드에 그대로 박아 넣는다(inline).**
따라서 빌드 산출물(`.next`)은 **그 빌드 때의 Supabase 프로젝트에 고정**된다.

→ dev 와 prod 는 **각각 따로 빌드**해야 한다. 같은 코드, 다른 env, **두 번 빌드**가 기본 구조다.
빌드된 dev 산출물을 prod 에 올린다고 prod DB 를 바라보지 않는다. (이미 dev URL 이 박혀있음)

---

## 1. 로컬 개발 — 현재 dev 를 바라봄

로컬은 `.env.local` 로 dev Supabase 를 바라보게 둔다. (이미 그렇게 동작 중)

`.env.local` (gitignore 됨 — 커밋 금지):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<dev-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon key>
SUPABASE_SERVICE_ROLE_KEY=<dev service_role key>
```

```bash
npm install
npm run dev      # 항상 dev Supabase 를 바라봄
```

> 로컬에서 실수로 **운영 DB** 를 만지지 않도록, 로컬 `.env.local` 에는 **반드시 dev 값**만 둔다.

---

## 2. Vercel 환경변수 주입 — 두 가지 방식

### ✅ 방식 A (권장): Vercel 프로젝트 2개로 분리

dev/prod 를 가장 깔끔하게 격리한다. service_role 키가 섞일 위험이 없고, 도메인도 분리된다.

| Vercel 프로젝트 | 연결 브랜치 | 환경변수 값 | 도메인(예) |
|----------------|-----------|-----------|-----------|
| `b-match-admin-dev` | `dev` | **dev** Supabase 3종 | admin-dev.bmatch... |
| `b-match-admin-prod` | `main` | **prod** Supabase 3종 | admin.bmatch... |

설정 순서:

1. Vercel 에서 **같은 깃 레포**를 가져와 프로젝트 2개 생성(`...-dev`, `...-prod`).
2. 각 프로젝트 **Settings → Environment Variables** 에서 위 3개 키를 **Production** 스코프에 등록.
   - dev 프로젝트엔 dev 값, prod 프로젝트엔 prod 값.
3. 각 프로젝트 **Settings → Git** 에서 **Production Branch** 를 지정:
   - dev 프로젝트 → `dev`
   - prod 프로젝트 → `main`
4. 해당 브랜치에 push 하면 각자 자기 환경으로 자동 배포된다.

> 장점: 환경 완전 격리, 운영 service_role 키가 dev 빌드에 절대 섞이지 않음.
> 단점: Vercel 프로젝트 2개 관리.

### 방식 B: Vercel 프로젝트 1개 + 환경 스코프 분리

프로젝트 하나에서 Vercel 의 **Production / Preview** 스코프를 dev/prod 로 매핑한다.

| Vercel 환경 스코프 | 연결 | 환경변수 값 |
|-------------------|------|-----------|
| **Production** (`main` 브랜치) | 운영기 | **prod** Supabase 3종 |
| **Preview** (그 외 브랜치 = `dev` 등) | 개발기 | **dev** Supabase 3종 |

설정 순서:

1. **Settings → Environment Variables** 에서 키마다 **값을 2번** 등록한다.
   - `NEXT_PUBLIC_SUPABASE_URL` → **Production** 체크 = prod URL
   - `NEXT_PUBLIC_SUPABASE_URL` → **Preview** 체크 = dev URL
   - 나머지 2개 키도 동일하게 Production/Preview 각각 등록.
2. `main` 에 머지하면 Production(=prod) 으로, `dev` push 는 Preview(=dev) 로 배포된다.

> 장점: 프로젝트 1개. 단점: 한 프로젝트에 운영 service_role 키가 들어있어 Preview 와 한 화면에서 관리됨(실수 위험 ↑). 운영 키 민감도가 높으면 **방식 A 권장.**

### CLI 로 등록하는 경우

```bash
# 예: prod 프로젝트(또는 Production 스코프)에 운영 값 주입
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# 예: dev (방식 B 의 Preview 스코프)
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# ...
```

---

## 3. 보안 — service_role 키 취급

- `SUPABASE_SERVICE_ROLE_KEY` 는 **`NEXT_PUBLIC_` 접두사를 절대 붙이지 않는다.** 붙이면 브라우저 번들에 노출되어 RLS 가 무력화된다.
- 이 키는 서버 사이드(`src/shared/api/supabase-admin.ts`)에서만 읽히며, 서버 액션(`"use server"`) 안에서만 호출된다.
- **운영 service_role 키는 운영 배포에만** 넣는다. dev 빌드/Preview 에 운영 키가 들어가지 않도록 주의(방식 A 면 구조적으로 차단됨).

---

## 4. 자체 빌드(CI / Docker) 로 배포하는 경우

Vercel 이 아니라 직접 빌드한다면, `next build` 직전에 환경별 값을 주입한다.
(`next build` 는 `.env.production` 계열을 읽으므로, dev/prod 둘 다 "프로덕션 빌드"라는 점에 유의 — `.env.development` 로는 구분되지 않는다.)

```bash
# dev 산출물
NEXT_PUBLIC_SUPABASE_URL=<dev-url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev-anon> \
SUPABASE_SERVICE_ROLE_KEY=<dev-service> \
npm run build       # → dev 를 바라보는 .next

# prod 산출물 (별도 빌드)
NEXT_PUBLIC_SUPABASE_URL=<prod-url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon> \
SUPABASE_SERVICE_ROLE_KEY=<prod-service> \
npm run build       # → prod 를 바라보는 .next
```

CI 에서는 환경별 시크릿(GitHub Actions Secrets 등)을 위 자리에 주입한다.

---

## 5. 배포 전 체크리스트

- [ ] dev/prod 각 Supabase 프로젝트의 URL / anon / service_role 값을 정확히 분리해 등록했다.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 에 `NEXT_PUBLIC_` 접두사가 **없다.**
- [ ] 운영 service_role 키가 dev/Preview 에 섞이지 않았다.
- [ ] 관리자 계정(`public.users.admin_role`)이 **각 환경 DB 마다** 세팅돼 있다. (dev DB 와 prod DB 는 별도이므로 관리자도 각각 등록 필요 — [supabase/README](supabase/README.md) 의 SUPER_ADMIN 등록 SQL 참고)
- [ ] DB 마이그레이션(`supabase/migrations/*`)이 **양쪽 프로젝트에 모두 적용**됐다.
- [ ] 배포 후 로그인 → 신고/유저/매칭 화면이 의도한 환경의 데이터를 보여주는지 확인했다.

---

## 요약

1. **코드는 그대로**, env 3개만 환경별로 다르게 주입한다.
2. `NEXT_PUBLIC_*` 는 빌드 타임 inline 이라 **dev/prod 각각 빌드**해야 한다.
3. Vercel 은 **프로젝트 2개 분리(방식 A)** 가 가장 안전하고, 1개로 하려면 **Production=prod / Preview=dev** 스코프로 나눈다.
4. service_role 키는 서버 전용 + 환경별 격리가 생명이다.
