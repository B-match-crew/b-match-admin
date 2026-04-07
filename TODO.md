# B-Match Admin — 추가 처리 TODO

> v4.6.4 리팩토링 (Phase 0~9) 완료 후 남은 개선·확장 사항들.
> 작성일: 2026-04-07

---

## 🔴 High — 운영 시작 전 권장

### Auth & 보안

- [ ] **로그인 페이지에 admin_role 사전 검증** — 현재 middleware는 세션만 체크하고 admin_role은 layout/Server Action에서 검증함. 일반 유저도 로그인은 성공하므로, 로그인 직후 admin_role NULL 이면 즉시 signOut + 에러 메시지 표시.
- [ ] **middleware.ts → proxy.ts 마이그레이션** — Next.js 16에서 middleware deprecation 경고 발생. 동작은 정상이지만 다음 메이저에서 제거 예정.
- [ ] **Server Action 에러 시 stack trace 노출 방지** — 현재 `toUserMessage` 가 fallback 으로 `e.message` 를 그대로 노출함. 운영에서는 PG 코드만 매핑된 메시지 노출, 그 외는 generic 메시지로.
- [ ] **CSRF 보호 점검** — Server Action 은 Next.js 가 기본 처리하지만, Edge Function 직접 호출 경로(`callSendPush`)는 access_token 만 의존. 정상 동작이지만 한번 더 확인.

### 신고 관리 (ADM-04)

- [ ] **댓글 블라인드 해제 RPC 부재** — `fn_admin_unblind_post` 만 spec에 있음. 댓글은 현재 다이얼로그에서 "지원 안 함" 안내. 백엔드에 `fn_admin_unblind_comment` 추가 필요.
- [ ] **신고 누적 카운트 백엔드 집계 view** — 현재 클라이언트에서 200건 fetch 후 그룹핑. 신고 폭증 시 비효율. `report_target_summary` view 또는 RPC 로 이관.
- [ ] **이미 처리된 신고 이력 탭** — 현재 PENDING 만 표시. RESOLVED/REJECTED 도 검색 가능해야 재발 검토 가능.

### 유저 관리 (ADM-02)

- [ ] **유저 상세 패널** — 현재 표 + 액션만. 가입일/누적 신고/정지 이력/호스트 모임 수 등을 보여주는 사이드 패널 또는 다이얼로그 추가.
- [ ] **신고 누적 횟수 컬럼** — `getUserReportCount` 함수는 작성했지만 UI에 미연결. 표에 컬럼 추가하려면 N+1 회피 위해 RPC 집계 필요.
- [ ] **페이지네이션** — 현재 `limit: 50` 고정. 검색 결과가 50건을 넘으면 그 이상은 보이지 않음. 무한 스크롤 또는 페이지네이션 추가.
- [ ] **Excel/CSV export** — 신고 누적자 명단 등 운영 보고용.

### 매칭 관리 (ADM-03)

- [ ] **날짜 범위 필터** — 현재 상태 + 삭제 포함만 필터링. 시작일 from~to 추가.
- [ ] **매칭 상세 모달** — 호스트, 위치, fee_config, allowed_levels 등 전체 정보 + 참가자 목록(있다면).
- [ ] **블라인드 게시글 영구 삭제 액션** — 현재는 해제만. 검토 후 영구 삭제(soft delete)도 필요.

### 푸시 발송 (ADM-05)

- [ ] **발송 이력 조회** — 현재는 발송 후 즉시 결과만 표시. `notifications` 테이블에서 `type='ADMIN_NOTICE'` 인 발송 이력 조회 화면.
- [ ] **예약 발송** — spec 상에는 즉시 발송만. 추후 cron 기반 예약 추가 시 별도 테이블 + Edge Function.
- [ ] **딥링크 검증 UI** — `deeplink_route` 자유 입력. 앱 라우트 enum 으로 셀렉트화하면 오타 방지.
- [ ] **타겟별 예상 발송 수 미리보기** — 발송 전 "전체 약 N명에게 발송됩니다" 표시.

### 대시보드 (ADM-01)

- [ ] **Today DAU 정확도 개선** — 현재 `fcm_tokens.updated_at` 기반 간이 추정. 별도 `user_activity_logs` 또는 GA4 연동 필요.
- [ ] **GA4 퍼널 위젯** — refactor plan §H-2 에 후순위로 명시. Looker Studio iframe 또는 GA4 Data API.
- [ ] **시계열 차트** — recharts 이미 설치됨. 일별/주별 신고 추이, 모임 등록 추이 등.

### 감사 로그 (옵션)

- [ ] **상세 모달** — 현재 `detail` 컬럼(jsonb before/after 스냅샷)을 표에 안 보여줌. 행 클릭 시 모달로 표시.
- [ ] **CSV export** — 분기/연간 보고용.
- [ ] **검색** — 관리자명/사유 텍스트 검색.

---

## 🟡 Medium — 코드 품질 / DX

- [ ] **공통 DataTable 컴포넌트 추출** — reports/users/matches/audit-logs 표 패턴이 거의 동일. TanStack Table + shadcn 으로 한 번 추출하면 정렬/페이지네이션/필터 일관화.
- [ ] **Server Action error wrapper** — `try { ... } catch (e) { toast.error(toUserMessage(e)) }` 패턴이 모든 mutation 에 반복. `useMutation` 의 `onError` 로 묶거나 커스텀 훅으로 추출.
- [ ] **로딩 스피너 일관화** — 현재 표 로딩은 "불러오는 중..." 텍스트, 로그인은 버튼 disable. shadcn `Skeleton` 으로 통일.
- [ ] **빈 상태 디자인** — `EmptyState` 컴포넌트가 `src/shared/ui` 에 있는데 reports/matches 에서 미사용. 적용.
- [ ] **테스트 작성 가능 영역** — Server Action 비즈니스 로직(특히 reason 검증, RPC 매핑)은 vitest 로 단위 테스트 가능.
- [ ] **i18n 준비** — 현재 한글 하드코딩. next-intl 등 도입 시 메시지만 분리.

---

## 🟢 Low — 부가 기능

- [ ] **다크 모드** — `globals.css` 에 변수만 정의되어 있고 토글 없음.
- [ ] **사이드바 접기 기억** — sidebar.tsx 가 SidebarProvider 사용. localStorage 저장 필요.
- [ ] **알림 설정** — 미처리 신고가 일정 수 이상이면 브라우저 Notification 으로 알람.
- [ ] **권한 매트릭스 화면** — `/audit-logs` 옆에 SUPER_ADMIN 만 보이는 권한 안내 페이지.
- [ ] **README 갱신** — 현재 next.js 기본 README. v4.6.4 기준으로 재작성.

---

## ⚠️ 알려진 이슈

- [ ] **Next.js 16.2.1 + Turbopack** — `middleware` deprecation 경고가 빌드 시 출력. 무시 가능하나 다음 마이너에서 제거 예정.
- [ ] **react-day-picker** — `package.json` 에 남아있지만 캘린더 UI를 현재 어디서도 사용하지 않음. 매칭 날짜 필터 추가 시 활용 또는 제거.
- [ ] **base-ui (`@base-ui/react`)** — 일부 shadcn 컴포넌트가 base-ui 기반. 표준 shadcn(@radix-ui)과 혼용 중. 향후 한쪽으로 통일 권장.
