-- ============================================
-- 결제 승인 시스템 데이터베이스 스키마
-- ============================================

-- 1. 결제 요청 테이블 (Payment Requests)
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 요청자 정보
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requester_staff_id UUID REFERENCES staff(id),

  -- 결제 항목 정보
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN (
    'vehicle_deposit',      -- 차량 계약금
    'vehicle_interim',      -- 차량 중도금
    'vehicle_balance',      -- 차량 잔금
    'miscellaneous',        -- 기타 부대비
    'transfer_fee',         -- 이전비
    'referral_fee',         -- 소개비
    'expense_report',       -- 지출결의서
    'refund_request'        -- 환불요청서
  )),

  -- 금액 정보
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',

  -- 관련 정보
  transaction_id UUID REFERENCES transactions(id),
  car_id UUID REFERENCES cardata(id),
  customer_id UUID REFERENCES profiles(id),

  -- 요청 내용
  title VARCHAR(255) NOT NULL,
  description TEXT,
  request_date DATE DEFAULT CURRENT_DATE,
  payment_due_date DATE, -- 지불 예정일

  -- 수취인 정보
  recipient_name VARCHAR(255),
  recipient_bank VARCHAR(100),
  recipient_account VARCHAR(100),

  -- 승인 정보
  approver_id UUID REFERENCES staff(id), -- 승인할 관리자
  approver_position VARCHAR(100), -- 승인자 직급
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN (
    'pending',      -- 승인 대기
    'approved',     -- 승인됨
    'rejected',     -- 거부됨
    'completed'     -- 송금 완료
  )),
  approval_date TIMESTAMP WITH TIME ZONE,
  approval_comment TEXT,

  -- 첨부 파일
  attachment_urls TEXT[], -- 관련 문서 URL 배열

  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 결제 승인 히스토리 테이블 (Payment Approvals)
CREATE TABLE IF NOT EXISTS payment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID REFERENCES payment_requests(id) ON DELETE CASCADE,

  -- 승인자 정보
  approver_staff_id UUID REFERENCES staff(id),
  approver_position VARCHAR(100),

  -- 승인 정보
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'rejected', 'returned')),
  comment TEXT,
  approval_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 입출금 거래 테이블 (Payment Transactions)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID REFERENCES payment_requests(id) ON DELETE CASCADE,

  -- 거래 정보
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')), -- 입금/출금
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'KRW',
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 계좌 정보
  account_holder VARCHAR(255),
  bank_name VARCHAR(100),
  account_number VARCHAR(100),

  -- 송금증/입금증
  receipt_url TEXT, -- 송금증 URL
  receipt_file_name VARCHAR(255),

  -- 처리자 정보
  processed_by UUID REFERENCES profiles(id), -- 입출금 처리한 사람
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 메모
  notes TEXT,

  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payment_requests_requester ON payment_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_approver ON payment_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_type ON payment_requests(payment_type);
CREATE INDEX IF NOT EXISTS idx_payment_requests_date ON payment_requests(request_date);

CREATE INDEX IF NOT EXISTS idx_payment_approvals_request ON payment_approvals(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_approver ON payment_approvals(approver_staff_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_request ON payment_transactions(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_type ON payment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(transaction_date);

-- ============================================
-- 트리거 생성
-- ============================================

CREATE TRIGGER update_payment_requests_updated_at BEFORE UPDATE ON payment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Payment Requests 정책
CREATE POLICY "Users can view their own payment requests" ON payment_requests
  FOR SELECT USING (
    requester_id = auth.uid()
    OR approver_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Staff can create payment requests" ON payment_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can update payment requests" ON payment_requests
  FOR UPDATE USING (
    approver_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- Payment Approvals 정책 (모든 관련자가 볼 수 있음)
CREATE POLICY "View payment approvals" ON payment_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payment_requests pr
      WHERE pr.id = payment_approvals.payment_request_id
      AND (
        pr.requester_id = auth.uid()
        OR pr.approver_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'master'
        )
      )
    )
  );

CREATE POLICY "Approvers can insert approvals" ON payment_approvals
  FOR INSERT WITH CHECK (
    approver_staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- Payment Transactions 정책
CREATE POLICY "View payment transactions" ON payment_transactions
  FOR SELECT USING (
    processed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM payment_requests pr
      WHERE pr.id = payment_transactions.payment_request_id
      AND (pr.requester_id = auth.uid() OR pr.approver_id IN (SELECT id FROM staff WHERE profile_id = auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Finance staff can manage transactions" ON payment_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE profile_id = auth.uid()
      AND (position IN ('입출금 관리자', '회계팀', '재무팀') OR status = 'active')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- ============================================
-- 뷰 생성
-- ============================================

-- 결제 요청 대시보드 뷰
CREATE OR REPLACE VIEW payment_requests_dashboard AS
SELECT
  pr.id,
  pr.payment_type,
  pr.title,
  pr.amount,
  pr.currency,
  pr.request_date,
  pr.payment_due_date,
  pr.approval_status,

  -- 요청자 정보
  p_requester.name as requester_name,
  p_requester.email as requester_email,

  -- 승인자 정보
  s_approver.employee_number as approver_employee_number,
  p_approver.name as approver_name,
  pr.approver_position,

  -- 차량 정보
  c.title->>'kr' as car_title,

  -- 고객 정보
  p_customer.name as customer_name,

  -- 승인 정보
  pr.approval_date,
  pr.approval_comment,

  pr.created_at

FROM payment_requests pr
LEFT JOIN profiles p_requester ON pr.requester_id = p_requester.id
LEFT JOIN staff s_approver ON pr.approver_id = s_approver.id
LEFT JOIN profiles p_approver ON s_approver.profile_id = p_approver.id
LEFT JOIN cardata c ON pr.car_id = c.id
LEFT JOIN profiles p_customer ON pr.customer_id = p_customer.id
ORDER BY pr.created_at DESC;

-- 입출금 현황 뷰
CREATE OR REPLACE VIEW payment_transactions_summary AS
SELECT
  pt.id,
  pt.payment_request_id,
  pt.transaction_type,
  pt.amount,
  pt.currency,
  pt.transaction_date,
  pt.bank_name,
  pt.account_number,
  pt.receipt_url,

  -- 요청 정보
  pr.payment_type,
  pr.title as request_title,
  pr.approval_status,

  -- 처리자 정보
  p_processor.name as processor_name,

  pt.processed_at,
  pt.notes

FROM payment_transactions pt
LEFT JOIN payment_requests pr ON pt.payment_request_id = pr.id
LEFT JOIN profiles p_processor ON pt.processed_by = p_processor.id
ORDER BY pt.transaction_date DESC;

-- ============================================
-- 코멘트 (설명)
-- ============================================

COMMENT ON TABLE payment_requests IS '결제 요청 및 승인 관리 테이블';
COMMENT ON TABLE payment_approvals IS '결제 승인 히스토리';
COMMENT ON TABLE payment_transactions IS '실제 입출금 거래 기록';

COMMENT ON COLUMN payment_requests.payment_type IS '차량대금(계약금/중도금/잔금), 부대비, 이전비, 소개비, 지출결의서, 환불요청서';
COMMENT ON COLUMN payment_requests.approval_status IS 'pending: 대기, approved: 승인됨, rejected: 거부됨, completed: 송금완료';
COMMENT ON COLUMN payment_requests.approver_position IS '승인자 직급: 과장, 차장, 부장, 지점장, 이사, 대표';
COMMENT ON COLUMN payment_transactions.receipt_url IS '송금증/입금증 파일 URL';
