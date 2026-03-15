-- ============================================================
-- B-Match Admin 마이그레이션
-- 기존 앱 테이블에 관리자용 컬럼 추가 + 관리자 전용 테이블 생성
-- ============================================================

-- ============================================================
-- 1. 기존 테이블 컬럼 추가
-- ============================================================

-- 1-1. users: 관리자 대시보드에서 필요한 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS real_name text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS self_introduction text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS participation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1-2. matchings: 관리자 모니터링에 필요한 컬럼 추가
ALTER TABLE matchings
  ADD COLUMN IF NOT EXISTS host_name text,
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skill_levels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_beginner_welcome boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_type text DEFAULT '1인당',
  ADD COLUMN IF NOT EXISTS court_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS court_fee_type text DEFAULT '1인당',
  ADD COLUMN IF NOT EXISTS shuttlecock_brand text,
  ADD COLUMN IF NOT EXISTS shuttlecock_price integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text;

-- 1-3. advertisements: 관리자 광고 관리에 필요한 컬럼 추가
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS impression_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 1-4. ad_locations: 아이콘 URL 추가
ALTER TABLE ad_locations
  ADD COLUMN IF NOT EXISTS icon_url text;

-- 1-5. reports: 관리자 신고 처리 워크플로우 컬럼 추가
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS reported_id uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS matching_id uuid REFERENCES matchings(id),
  ADD COLUMN IF NOT EXISTS evidence text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT '처리 대기',
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_by uuid;

-- reports 외래 키 이름 지정 (관리자 코드에서 조인에 사용)
-- reporter_id FK가 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reports_reporter_id_fkey'
  ) THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_reporter_id_fkey
      FOREIGN KEY (reporter_id) REFERENCES users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reports_reported_id_fkey'
  ) THEN
    ALTER TABLE reports
      ADD CONSTRAINT reports_reported_id_fkey
      FOREIGN KEY (reported_id) REFERENCES users(id);
  END IF;
END $$;

-- ============================================================
-- 2. 관리자 전용 새 테이블 생성
-- ============================================================

-- 2-1. push_notifications: 관리자 푸시 알림 발송 (앱의 notifications와 별도)
CREATE TABLE IF NOT EXISTS push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  target text NOT NULL CHECK (target IN ('all', 'hosts', 'custom')),
  target_ids uuid[] DEFAULT NULL,
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_by uuid,
  status text NOT NULL DEFAULT '대기' CHECK (status IN ('대기', '발송됨', '실패')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2-2. admin_adjustments: 관리자 배티켓 점수 조정 이력
CREATE TABLE IF NOT EXISTS admin_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  admin_id uuid NOT NULL,
  score_change numeric NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2-3. battiket_config: 배티켓 점수 규칙 설정
CREATE TABLE IF NOT EXISTS battiket_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_to_host_best numeric NOT NULL DEFAULT 2.0,
  guest_to_host_normal numeric NOT NULL DEFAULT 0,
  guest_to_host_bad numeric NOT NULL DEFAULT -3.0,
  host_to_guest_best numeric NOT NULL DEFAULT 2.0,
  host_to_guest_normal numeric NOT NULL DEFAULT 0,
  host_to_guest_bad numeric NOT NULL DEFAULT -3.0,
  no_payment_penalty numeric NOT NULL DEFAULT -5.0,
  no_show_penalty numeric NOT NULL DEFAULT -7.0,
  host_cancel_penalty numeric NOT NULL DEFAULT -5.0,
  host_abandon_penalty numeric NOT NULL DEFAULT -10.0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- 기본 설정값 삽입
INSERT INTO battiket_config (
  guest_to_host_best, guest_to_host_normal, guest_to_host_bad,
  host_to_guest_best, host_to_guest_normal, host_to_guest_bad,
  no_payment_penalty, no_show_penalty, host_cancel_penalty, host_abandon_penalty
) SELECT 2.0, 0, -3.0, 2.0, 0, -3.0, -5.0, -7.0, -5.0, -10.0
WHERE NOT EXISTS (SELECT 1 FROM battiket_config LIMIT 1);

-- 2-4. analytics_events: GA4 이벤트 집계
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 0,
  last_occurred_at timestamptz
);

-- 2-5. analytics_funnel: 퍼널 분석 집계
CREATE TABLE IF NOT EXISTS analytics_funnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step text NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 0
);

-- 퍼널 기본 데이터 삽입
INSERT INTO analytics_funnel (step, count)
VALUES
  ('signup', 0),
  ('profile', 0),
  ('matching_create', 0),
  ('apply', 0),
  ('payment', 0)
ON CONFLICT (step) DO NOTHING;

-- ============================================================
-- 3. 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_is_host ON users(is_host);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_matchings_recruitment_status ON matchings(recruitment_status);
CREATE INDEX IF NOT EXISTS idx_matchings_created_at ON matchings(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_id ON reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_type ON advertisements(type);
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_at ON push_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_adjustments_user_id ON admin_adjustments(user_id);

-- ============================================================
-- 4. RLS (Row Level Security) 정책
-- ============================================================

-- 관리자 전용 테이블에 RLS 활성화
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE battiket_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_funnel ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자(관리자)에게 모든 권한 부여
-- 실제 운영에서는 admin role 체크를 추가하세요
CREATE POLICY "Authenticated users can read push_notifications"
  ON push_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert push_notifications"
  ON push_notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read admin_adjustments"
  ON admin_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert admin_adjustments"
  ON admin_adjustments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read battiket_config"
  ON battiket_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update battiket_config"
  ON battiket_config FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read analytics_events"
  ON analytics_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage analytics_events"
  ON analytics_events FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated users can read analytics_funnel"
  ON analytics_funnel FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage analytics_funnel"
  ON analytics_funnel FOR ALL TO authenticated USING (true);
