-- ============================================
-- 중고차 수출 CRM 시스템 데이터베이스 스키마
-- ============================================

-- 1. 직원 테이블 (Staff)
-- profiles 테이블을 확장하여 직원 정보 관리
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  employee_number VARCHAR(50) UNIQUE NOT NULL, -- 사번
  position VARCHAR(100), -- 직급 (예: 영업사원, 팀장, 부장)
  department VARCHAR(100), -- 부서
  hire_date DATE, -- 입사일
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, resigned
  commission_rate DECIMAL(5,2) DEFAULT 0, -- 수수료율 (%)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- 2. 소유주 테이블 (Owners)
-- 차량 구매/판매 시 소유주 정보 관리
CREATE TABLE IF NOT EXISTS owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, -- 소유주 이름
  name_en VARCHAR(255), -- 영문 이름
  phone VARCHAR(50), -- 전화번호
  email VARCHAR(255), -- 이메일
  address TEXT, -- 주소
  address_en TEXT, -- 영문 주소
  id_number VARCHAR(100), -- 주민등록번호 또는 사업자번호 (암호화 권장)
  company_name VARCHAR(255), -- 법인명 (법인인 경우)
  bank_name VARCHAR(100), -- 은행명
  bank_account VARCHAR(100), -- 계좌번호
  notes TEXT, -- 메모
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 매입/매출 트랜잭션 테이블 (Transactions)
-- 차량 구매(매입) 및 판매(매출) 기록
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cardata(id) ON DELETE CASCADE, -- 차량 ID
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'sale')), -- 매입 or 매출
  staff_id UUID REFERENCES staff(id), -- 담당 직원
  customer_id UUID REFERENCES profiles(id), -- 고객 (매출 시)
  owner_id UUID REFERENCES owners(id), -- 소유주 (매입 시)

  -- 가격 정보
  transaction_price DECIMAL(15,2) NOT NULL, -- 거래 가격
  currency VARCHAR(10) DEFAULT 'KRW', -- 통화

  -- 거래 정보
  transaction_date DATE NOT NULL, -- 거래일
  contract_number VARCHAR(100), -- 계약번호
  payment_method VARCHAR(50), -- 결제 방법 (현금, 계좌이체, 카드 등)
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, partial, completed

  -- 추가 정보
  notes TEXT, -- 메모
  status VARCHAR(20) DEFAULT 'active', -- active, cancelled, completed

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 비용 테이블 (Expenses)
-- 차량 관련 비용 (이전비, 정비비, 보험료 등)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE, -- 거래 ID
  car_id UUID REFERENCES cardata(id) ON DELETE CASCADE, -- 차량 ID

  expense_type VARCHAR(50) NOT NULL, -- 비용 유형 (transfer_fee:이전비, maintenance:정비비, insurance:보험료, shipping:운송비, customs:관세, other:기타)
  expense_category VARCHAR(100), -- 세부 카테고리

  amount DECIMAL(15,2) NOT NULL, -- 금액
  currency VARCHAR(10) DEFAULT 'KRW', -- 통화

  expense_date DATE NOT NULL, -- 비용 발생일
  vendor VARCHAR(255), -- 업체명
  description TEXT, -- 설명
  receipt_url TEXT, -- 영수증 URL

  status VARCHAR(20) DEFAULT 'confirmed', -- pending, confirmed, cancelled

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 문서 테이블 (Documents)
-- 계약서, 서류 등 업로드 관리
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE, -- 거래 ID
  car_id UUID REFERENCES cardata(id) ON DELETE CASCADE, -- 차량 ID
  owner_id UUID REFERENCES owners(id), -- 소유주 ID

  document_type VARCHAR(50) NOT NULL, -- 문서 유형 (contract:계약서, registration:등록증, insurance:보험증서, id:신분증, other:기타)
  document_name VARCHAR(255) NOT NULL, -- 문서명
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name VARCHAR(255) NOT NULL, -- 원본 파일명
  file_size INTEGER, -- 파일 크기 (bytes)
  mime_type VARCHAR(100), -- MIME 타입

  uploaded_by UUID REFERENCES profiles(id), -- 업로드한 사용자
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 업로드 날짜

  description TEXT, -- 설명
  status VARCHAR(20) DEFAULT 'active', -- active, archived, deleted

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 고객-직원 할당 테이블 (Customer Assignments)
-- 직원별 고객 관리
CREATE TABLE IF NOT EXISTS customer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- 고객 ID
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE, -- 담당 직원 ID
  assigned_date DATE DEFAULT CURRENT_DATE, -- 할당일
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, transferred
  notes TEXT, -- 메모
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, staff_id)
);

-- ============================================
-- 인덱스 생성 (성능 최적화)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_profile_id ON staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

CREATE INDEX IF NOT EXISTS idx_transactions_car_id ON transactions(car_id);
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON transactions(staff_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_expenses_transaction_id ON expenses(transaction_id);
CREATE INDEX IF NOT EXISTS idx_expenses_car_id ON expenses(car_id);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

CREATE INDEX IF NOT EXISTS idx_documents_transaction_id ON documents(transaction_id);
CREATE INDEX IF NOT EXISTS idx_documents_car_id ON documents(car_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_customer_assignments_customer ON customer_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_staff ON customer_assignments(staff_id);

-- ============================================
-- 트리거 생성 (자동 업데이트)
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_assignments_updated_at BEFORE UPDATE ON customer_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- RLS 활성화
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_assignments ENABLE ROW LEVEL SECURITY;

-- Staff 테이블 정책
CREATE POLICY "Staff can view their own data" ON staff
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Admins can view all staff" ON staff
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Admins can insert staff" ON staff
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Admins can update staff" ON staff
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- Transactions 테이블 정책
CREATE POLICY "Staff can view their transactions" ON transactions
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Staff can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Staff can update their transactions" ON transactions
  FOR UPDATE USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- Expenses 정책 (Transactions와 동일)
CREATE POLICY "View expenses for accessible transactions" ON expenses
  FOR SELECT USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Insert expenses for accessible transactions" ON expenses
  FOR INSERT WITH CHECK (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- Documents 정책
CREATE POLICY "View documents for accessible transactions" ON documents
  FOR SELECT USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    )
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Users can upload documents" ON documents
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Owners 정책 (관리자 및 직원만)
CREATE POLICY "Staff can view owners" ON owners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

CREATE POLICY "Staff can insert owners" ON owners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- Customer Assignments 정책
CREATE POLICY "View customer assignments" ON customer_assignments
  FOR SELECT USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
    OR customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'master'
    )
  );

-- ============================================
-- 뷰 생성 (수익률 계산)
-- ============================================

-- 차량별 수익률 계산 뷰
CREATE OR REPLACE VIEW vehicle_profit_analysis AS
SELECT
  t_purchase.car_id,
  c.title->>'kr' as car_title,

  -- 매입 정보
  t_purchase.id as purchase_transaction_id,
  t_purchase.transaction_price as purchase_price,
  t_purchase.transaction_date as purchase_date,
  t_purchase.staff_id as purchase_staff_id,

  -- 매출 정보
  t_sale.id as sale_transaction_id,
  t_sale.transaction_price as sale_price,
  t_sale.transaction_date as sale_date,
  t_sale.staff_id as sale_staff_id,

  -- 비용 합계
  COALESCE(e.total_expenses, 0) as total_expenses,

  -- 수익 계산
  COALESCE(t_sale.transaction_price, 0) - t_purchase.transaction_price - COALESCE(e.total_expenses, 0) as net_profit,

  -- 수익률 계산 (%)
  CASE
    WHEN t_purchase.transaction_price > 0 THEN
      ((COALESCE(t_sale.transaction_price, 0) - t_purchase.transaction_price - COALESCE(e.total_expenses, 0)) / t_purchase.transaction_price * 100)
    ELSE 0
  END as profit_margin_percent,

  -- 상태
  CASE
    WHEN t_sale.id IS NULL THEN 'in_stock'
    ELSE 'sold'
  END as status

FROM transactions t_purchase
LEFT JOIN transactions t_sale ON t_purchase.car_id = t_sale.car_id AND t_sale.transaction_type = 'sale'
LEFT JOIN cardata c ON t_purchase.car_id = c.id
LEFT JOIN (
  SELECT car_id, SUM(amount) as total_expenses
  FROM expenses
  WHERE status = 'confirmed'
  GROUP BY car_id
) e ON t_purchase.car_id = e.car_id
WHERE t_purchase.transaction_type = 'purchase';

-- 직원별 성과 뷰
CREATE OR REPLACE VIEW staff_performance AS
SELECT
  s.id as staff_id,
  s.employee_number,
  p.name as staff_name,

  -- 매입 건수 및 금액
  COUNT(DISTINCT t_purchase.id) as total_purchases,
  COALESCE(SUM(t_purchase.transaction_price), 0) as total_purchase_amount,

  -- 매출 건수 및 금액
  COUNT(DISTINCT t_sale.id) as total_sales,
  COALESCE(SUM(t_sale.transaction_price), 0) as total_sale_amount,

  -- 순이익
  COALESCE(SUM(
    CASE WHEN t_sale.id IS NOT NULL
    THEN t_sale.transaction_price - t_purchase.transaction_price
    ELSE 0 END
  ), 0) as gross_profit,

  -- 담당 고객 수
  COUNT(DISTINCT ca.customer_id) as assigned_customers

FROM staff s
LEFT JOIN profiles p ON s.profile_id = p.id
LEFT JOIN transactions t_purchase ON s.id = t_purchase.staff_id AND t_purchase.transaction_type = 'purchase'
LEFT JOIN transactions t_sale ON s.id = t_sale.staff_id AND t_sale.transaction_type = 'sale'
LEFT JOIN customer_assignments ca ON s.id = ca.staff_id AND ca.status = 'active'
WHERE s.status = 'active'
GROUP BY s.id, s.employee_number, p.name;

-- ============================================
-- 샘플 데이터 (테스트용 - 선택사항)
-- ============================================

-- 비용 유형 참고
COMMENT ON COLUMN expenses.expense_type IS
'transfer_fee: 이전비, maintenance: 정비비, insurance: 보험료, shipping: 운송비, customs: 관세, inspection: 검사비, other: 기타';

-- 문서 유형 참고
COMMENT ON COLUMN documents.document_type IS
'contract: 계약서, registration: 등록증, insurance: 보험증서, inspection: 검사증, id: 신분증, invoice: 송장, other: 기타';
