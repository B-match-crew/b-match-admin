# 관리자 페이지 v4.6.11 패치 가이드

> 대상: **기존 b-match-admin (Next.js) 프로젝트**
> 기준: 명세서 v4.6.4 → v4.6.11
> 짝 문서: [admin_db_spec.md](admin_db_spec.md), [admin_refactor_plan.md](admin_refactor_plan.md), [spec_v4_6_11_diff.md](spec_v4_6_11_diff.md)

---

## 0. TL;DR

DB 변경이 작아서 **관리자 페이지 패치도 작습니다**. 30분~1시간이면 끝.

| 영역 | 변경 |
|---|---|
| TypeScript 타입 | `Level` 에서 `'S'` 값 제거 |
| `host_profiles` 관련 코드 | `min_level_required` 필드 사용 부분 모두 제거 |
| `level_distribution` JSON | `S` 키 제거 (6키만 사용) |
| `age_distribution` JSON | 5키 + 합산 100 검증 표시 |
| 화면 UI | **없음** (관리자는 v4.4부터 Tailwind 기본 스타일, 디자인 시안 X) |
| RPC 호출 | `fn_register_host` — 관리자가 직접 호출 안 함 (호스트 본인만), 영향 없음 |

---

## 1. 작업 순서 (체크리스트)

### Phase A. DB 패치 적용 확인 (관리자 작업 X, 사용자가 이미 적용)

- [ ] Supabase 운영 DB 에 `06_v4_6_11_patch.sql` 적용 완료 확인
- [ ] `users.level` enum 에 `S` 값 없음 확인
- [ ] `host_profiles.min_level_required` 컬럼 없음 확인

### Phase B. TypeScript 타입 갱신

- [ ] **B-1.** `lib/types.ts` 의 `Level` 타입에서 `'S'` 제거:
  ```ts
  // 변경 전
  export type Level = 'S' | 'A' | 'B' | 'C' | 'D' | 'NOVICE' | 'BEGINNER';

  // 변경 후 (v4.6.11)
  export type Level = 'A' | 'B' | 'C' | 'D' | 'NOVICE' | 'BEGINNER';
  ```

- [ ] **B-2.** `HostProfile` 타입에서 `min_level_required` 필드 제거:
  ```ts
  // 변경 전
  export interface HostProfile {
    id: number;
    user_id: string;
    club_name: string;
    description?: string;
    cover_image_url?: string;
    min_level_required: Level;  // ❌ 삭제
    gender_ratio_male: number;
    gender_ratio_female: number;
    age_distribution: Record<string, number>;
    level_distribution: Record<string, number>;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
  }

  // 변경 후
  export interface HostProfile {
    id: number;
    user_id: string;
    club_name: string;
    description?: string;
    cover_image_url?: string;
    gender_ratio_male: number;
    gender_ratio_female: number;
    age_distribution: AgeDistribution;  // 5키 (아래 §B-3 참조)
    level_distribution: LevelDistribution;  // 6키 (아래 §B-4 참조)
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
  }
  ```

- [ ] **B-3.** `AgeDistribution` 타입 명시 (5개 키 합산 100):
  ```ts
  export interface AgeDistribution {
    '20s': number;
    '30s': number;
    '40s': number;
    '50s': number;
    '60s_plus': number;
  }
  // DB CHECK 제약: 5개 합산 = 100
  ```

- [ ] **B-4.** `LevelDistribution` 타입 명시 (6개 키, S 제거):
  ```ts
  export interface LevelDistribution {
    A: number;
    B: number;
    C: number;
    D: number;
    novice: number;
    beginner: number;
    // S 키 제거됨 (v4.6.11)
  }
  ```

### Phase C. 코드 일괄 검색 + 수정

레포 전체에서 다음 문자열 검색하여 모두 정리:

- [ ] **C-1.** `'S'` 리터럴 사용 (Level 컨텍스트만):
  ```bash
  # zsh / bash
  grep -rn "'S'" src/ --include="*.tsx" --include="*.ts" | grep -i level
  ```

- [ ] **C-2.** `min_level_required` 사용 검색:
  ```bash
  grep -rn "min_level_required" src/
  grep -rn "minLevelRequired" src/
  ```
  - 표시 컴포넌트 / 폼 / 필터 / 검증 등에서 모두 제거

- [ ] **C-3.** `level_distribution.S` 또는 `levelDistribution.S` 접근 부분 제거

- [ ] **C-4.** 급수 라벨 매핑 함수에서 S 케이스 제거:
  ```ts
  // 변경 전
  function levelLabel(level: Level): string {
    switch (level) {
      case 'S': return 'S조';  // ❌ 삭제
      case 'A': return 'A조';
      // ...
    }
  }
  ```

### Phase D. 화면별 점검

#### D-1. ADM-02 유저 관리

- [ ] 유저 상세 패널의 "급수" 표시에서 S 케이스 제거
- [ ] 유저 검색 필터에 급수 드롭다운이 있다면 S 옵션 제거

#### D-2. ADM-03 매칭 직권 관리

- [ ] 매칭 그리드의 `allowed_levels` 표시 컬럼에서 S 케이스 제거
- [ ] (있다면) `min_level_required` 표시 컬럼 자체 제거

#### D-3. 호스트 프로필 뷰어 (있다면)

- [ ] 호스트 프로필 페이지에서 "모임 가입 자격" 행 제거
- [ ] `level_distribution` 차트/표에서 S 행 제거 (6개만 표시)
- [ ] `age_distribution` 표시 시 5개 키만 (10대 제외)

#### D-4. ADM-04 CS 신고 관리

- [ ] 영향 없음 (level 사용 안 함)

#### D-5. ADM-05 푸시 발송

- [ ] 영향 없음

#### D-6. ADM-01 대시보드

- [ ] 영향 없음

### Phase E. RPC 호출 점검

- [ ] **E-1.** 관리자가 `fn_register_host` 를 직접 호출하는 코드 있는지 확인 → **없어야 정상** (호스트 본인만 호출)
  - 만약 있다면 시그니처 변경됨: `p_min_level_required` 파라미터 제거
- [ ] **E-2.** 다른 RPC (`fn_admin_*`, `fn_admin_suspend_user` 등) 변경 없음 — 그대로 사용

### Phase F. 검증

- [ ] **F-1.** TypeScript 컴파일: `pnpm tsc --noEmit` 또는 `npx tsc --noEmit`
- [ ] **F-2.** ESLint: `pnpm lint`
- [ ] **F-3.** 로컬 dev 서버 실행 후 5개 메뉴 빠르게 클릭하여 런타임 에러 없음 확인
- [ ] **F-4.** 유저 관리 → 호스트 유저 1명 검색 → 급수 표시 정상 확인
- [ ] **F-5.** 매칭 관리 → 매칭 1개 클릭 → `allowed_levels` 정상 표시 확인

---

## 2. Find & Replace 매핑표

| 검색어 | 대체 |
|---|---|
| `'S' \| 'A' \| 'B' \| 'C' \| 'D' \| 'NOVICE' \| 'BEGINNER'` | `'A' \| 'B' \| 'C' \| 'D' \| 'NOVICE' \| 'BEGINNER'` |
| `min_level_required` (모든 사용) | (삭제) |
| `minLevelRequired` (camelCase 사용) | (삭제) |
| `level_distribution.S` 또는 `['S']` | (삭제) |
| `case 'S':` (스위치 케이스) | (삭제) |
| `levels.includes('S')` | (삭제 — 항상 false) |

---

## 3. age_distribution / level_distribution 표시 컴포넌트 예시

만약 호스트 프로필 뷰어 화면이 있다면 다음과 같이 갱신:

```tsx
// components/HostProfileChart.tsx

const AGE_KEYS = ['20s', '30s', '40s', '50s', '60s_plus'] as const;
const AGE_LABELS: Record<typeof AGE_KEYS[number], string> = {
  '20s': '20대',
  '30s': '30대',
  '40s': '40대',
  '50s': '50대',
  '60s_plus': '60대+',
};

const LEVEL_KEYS = ['A', 'B', 'C', 'D', 'novice', 'beginner'] as const;
const LEVEL_LABELS: Record<typeof LEVEL_KEYS[number], string> = {
  A: 'A조',
  B: 'B조',
  C: 'C조',
  D: 'D조',
  novice: '초심',
  beginner: '입문',
};

export function HostProfileChart({ profile }: { profile: HostProfile }) {
  return (
    <div>
      {/* 연령 분포 (5개) */}
      <h3>연령 분포</h3>
      <table>
        {AGE_KEYS.map((k) => (
          <tr key={k}>
            <td>{AGE_LABELS[k]}</td>
            <td>{profile.age_distribution[k] ?? 0}%</td>
          </tr>
        ))}
      </table>

      {/* 급수 분포 (6개) */}
      <h3>급수 분포</h3>
      <table>
        {LEVEL_KEYS.map((k) => (
          <tr key={k}>
            <td>{LEVEL_LABELS[k]}</td>
            <td>{profile.level_distribution[k] ?? 0}명</td>
          </tr>
        ))}
      </table>

      {/* 성비 */}
      <h3>성비</h3>
      <p>남 {profile.gender_ratio_male}% · 여 {profile.gender_ratio_female}%</p>
    </div>
  );
}
```

---

## 4. (참고) 폐기된 개념

다음 개념/필드는 v4.6.11 에서 **완전 폐기**되었으므로 관리자 페이지에서 노출하면 안 됨:

- ❌ "모임 가입 자격" (`min_level_required`)
- ❌ S조 (`level: 'S'`)
- ❌ 10대 연령대 (만 14세 미만 차단 정책으로 `age_distribution.10s` 키 자체 없음)
- ❌ 배티켓 점수 (v4.0에서 폐기)
- ❌ 결제/지갑/정산 (v4.0에서 폐기)
- ❌ 매칭 신청 플로우 (v4.0에서 폐기)
- ❌ 좋아요 (v4.6에서 폐기)

---

## 5. 영향 없는 영역 (그대로 유지)

- ✅ Supabase 클라이언트 인증 (`@supabase/ssr`)
- ✅ admin_role 가드 로직
- ✅ ADM-04 CS 신고 처리 (RPC 동일)
- ✅ ADM-05 푸시 발송 Edge Function
- ✅ ADM-01 대시보드 4개 위젯 쿼리
- ✅ admin_audit_logs 뷰어
- ✅ RBAC 매트릭스 (SUPER_ADMIN / MANAGER)

---

## 6. 화면 디자인 변경 영향 (관리자는 무관)

명세서 v4.6.11 의 큰 변경은 **앱 측 디자인 시스템** (Forest Green Primary, 44px CTA, HOST-FORM 통합 등):

- 🟢 **관리자 페이지에는 영향 없음** — v4.4부터 "Tailwind 기본 스타일, 별도 디자인 시안 없이 기능 중심" 정책 유지
- 앱 디자인 시스템과 분리되어 있으므로 토큰/색상/컴포넌트 변경 무관

---

## 7. 작업 분량 추정

| Phase | 분량 |
|---|---|
| A. DB 패치 확인 | 5분 |
| B. TypeScript 타입 갱신 | 10분 |
| C. 코드 일괄 검색 + 수정 | 15~30분 |
| D. 화면별 점검 | 15분 |
| E. RPC 호출 점검 | 5분 |
| F. 검증 | 10분 |
| **합계** | **약 1시간** |

---

## 8. 다음 액션

1. 이 문서를 b-match-admin 레포로 복사
2. Phase A → F 순서 실행
3. dev 브랜치 생성 후 작업 → PR
4. 운영 배포 전 staging Supabase 에서 동작 확인

---

**문서 버전**: v1 (2026-04-09 작성)
**기준**: 명세서 v4.6.11 / b-match-app `dev` 브랜치 (v4.6.11 패치 적용본)
