# B-Match Admin — 추가 처리 TODO

> v4.6.4 리팩토링 (Phase 0~9) 완료 후 남은 개선·확장 사항들.
> 작성일: 2026-04-07
> 최종 갱신: 2026-04-10

---

## 🔴 High — 운영 시작 전 권장

### Auth & 보안

- [x] **로그인 페이지에 admin_role 사전 검증** — 로그인 직후 admin_role NULL 이면 즉시 signOut + 에러 메시지 표시.
- [x] **middleware.ts → proxy.ts 마이그레이션** — Next.js 16 deprecation 대응 완료.
- [x] **Server Action 에러 시 stack trace 노출 방지** — PG 코드만 매핑된 메시지 노출, 그 외는 generic 메시지.
- [x] **CSRF 보호 점검** — Server Action은 Next.js 자동 처리, Edge Function은 JWT 검증으로 안전 확인.

### 신고 관리 (ADM-04)

- [x] **댓글 블라인드 해제 RPC** — `fn_admin_unblind_comment` SQL + 프론트 연동 완료. (07_admin_enhancements.sql 실행 필요)
- [x] **신고 누적 카운트 서버 집계** — `report_target_summary` 뷰 기반으로 전환. (07_admin_enhancements.sql 실행 필요)
- [x] **이미 처리된 신고 이력 탭** — RESOLVED/REJECTED 조회 + 페이지네이션.

### 유저 관리 (ADM-02)

- [x] **유저 상세 패널** — 가입일/누적 신고/정지 이력/호스트 여부 등 상세 다이얼로그.
- [x] **신고 누적 횟수** — 유저 상세 패널에서 표시.
- [x] **페이지네이션** — offset 기반 페이지네이션 + 총 건수 표시.
- [x] **Excel/CSV export** — 유저 목록 CSV 다운로드.

### 매칭 관리 (ADM-03)

- [x] **날짜 범위 필터** — start_time 기준 from~to 필터.
- [x] **매칭 상세 모달** — 전체 정보 + 비용 + 편의시설 + 설명 + 연락처.
- [x] **블라인드 게시글 영구 삭제 액션** — SUPER_ADMIN 전용 soft delete + audit log.

### 푸시 발송 (ADM-05)

- [x] **발송 이력 조회** — ADMIN_NOTICE 타입 notifications 기반 이력 테이블.
- [x] **타겟별 예상 발송 수 미리보기** — FCM 토큰 기반 실시간 표시.

### 대시보드 (ADM-01)

- [x] **시계열 차트** — 최근 14일 신고/매칭 등록 추이 LineChart.

### 감사 로그

- [x] **상세 모달** — detail(jsonb) before/after 스냅샷 표시.
- [x] **검색** — 사유 텍스트 검색.
- [x] **CSV export** — 감사 로그 CSV 다운로드.

---

## 🟡 Medium — 코드 품질 / DX

- [ ] **공통 DataTable 컴포넌트 추출** — TanStack Table + shadcn 으로 정렬/페이지네이션/필터 일관화.
- [ ] **Server Action error wrapper** — `useMutation` 의 `onError` 커스텀 훅으로 추출.
- [x] **로딩 스피너 일관화** — Skeleton 컴포넌트로 전 페이지 통일 완료.
- [x] **빈 상태 디자인** — EmptyState 컴포넌트 전 페이지 적용 완료.
- [ ] **테스트 작성 가능 영역** — Server Action 비즈니스 로직(reason 검증, RPC 매핑) vitest 단위 테스트.
- [ ] **i18n 준비** — next-intl 등 도입 시 메시지만 분리.

---

## 🟢 Low — 부가 기능

- [ ] **다크 모드** — `globals.css` 에 변수 정의됨, 토글 추가 필요.
- [ ] **사이드바 접기 기억** — localStorage 저장.
- [ ] **알림 설정** — 미처리 신고 일정 수 이상 시 브라우저 Notification.
- [ ] **권한 매트릭스 화면** — SUPER_ADMIN 전용 권한 안내 페이지.
- [ ] **딥링크 검증 UI** — 앱 라우트 enum 셀렉트화.
- [ ] **예약 발송** — cron 기반 예약 별도 테이블 + Edge Function.
- [ ] **GA4 퍼널 위젯** — Looker Studio iframe 또는 GA4 Data API.
- [ ] **Today DAU 정확도 개선** — 별도 `user_activity_logs` 또는 GA4 연동.

---

## ⚠️ 알려진 이슈

- [x] **Next.js 16 middleware deprecation** — proxy.ts 로 마이그레이션 완료.
- [ ] **react-day-picker** — 캘린더 UI 미사용. 매칭 날짜 필터에서 활용 또는 제거.
- [ ] **base-ui (`@base-ui/react`)** — 일부 shadcn 컴포넌트가 base-ui 기반. 향후 한쪽 통일 권장.

---

## 📌 DB 패치 실행 필요

아래 SQL 파일은 Supabase SQL Editor에서 실행해야 합니다:

- `07_admin_enhancements.sql` — `fn_admin_unblind_comment` RPC + `report_target_summary` 뷰
