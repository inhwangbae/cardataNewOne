// AI 모윈이 안내하는 자주 묻는 질문
// keywords: 사용자가 직접 입력/음성으로 물었을 때 매칭에 사용
// sincar 그룹은 신카 앱(목록·상세·견적·가입 화면 문구)과 기획서 내용을 바탕으로 작성

export type FaqGroup = "moduwinner" | "sincar";

export type Faq = {
  id: string;
  group: FaqGroup;
  question: string;
  answer: string;
  keywords: string[];
  link?: { href: string; label: string };
};

export const GROUPS: { id: FaqGroup; label: string }[] = [
  { id: "moduwinner", label: "모두위너" },
  { id: "sincar", label: "신카 · 자동차" },
];

export const GREETING =
  "안녕하세요. 저는 모두위너의 AI, 모윈입니다. 모두위너는 유익한 정보와 유익한 서비스로 이용하는 모든 분께 이익을 돌려드리는 곳이에요. 첫 번째 서비스는 해외 바이어를 위한 한국 자동차 견적 플랫폼, 신카입니다. 궁금한 것을 눌러보거나, 저에게 직접 물어보세요.";

export const FALLBACK =
  "아직 그 질문은 배우는 중이에요. 아래의 자주 묻는 질문을 눌러보시거나, 다른 말로 다시 물어봐 주세요.";

export const FAQS: Faq[] = [
  // ── 모두위너 ─────────────────────────────────────────────
  {
    id: "about",
    group: "moduwinner",
    question: "모두위너는 어떤 곳인가요?",
    answer:
      "모두위너는 한 가지 상품을 파는 회사가 아니에요. 유익한 정보를 제공하고, 유익한 서비스를 제공해서, 이용하는 모든 분께 이익이 돌아가도록 만드는 곳입니다. 이름 그대로, 모두가 위너가 되는 것이 저희의 목표예요.",
    keywords: ["모두위너", "회사", "어떤 곳", "뭐하는", "소개"],
  },
  {
    id: "mowin",
    group: "moduwinner",
    question: "모윈은 누구인가요?",
    answer:
      "저는 모두위너의 AI 안내자, 모윈이에요. 모두위너의 모든 서비스는 저를 통해 시작됩니다. 필요한 정보와 서비스를 찾아 드리고, 처음부터 끝까지 길을 안내해 드릴게요.",
    keywords: ["모윈", "누구", "너는", "AI", "에이아이", "인공지능"],
  },
  {
    id: "services",
    group: "moduwinner",
    question: "어떤 서비스를 제공하나요?",
    answer:
      "모두위너는 크게 두 가지를 드려요. 첫째, 생활과 비즈니스에 도움이 되는 유익한 정보. 둘째, 실제로 이익이 되는 유익한 서비스입니다. 첫 번째로 준비된 서비스는 자동차 견적 플랫폼 신카이고, 앞으로 더 많은 분야로 넓혀갈 예정이에요.",
    keywords: ["서비스", "제공", "정보", "무엇을", "뭘"],
  },
  {
    id: "benefit",
    group: "moduwinner",
    question: "모두에게 이익이 된다는 건 무슨 뜻인가요?",
    answer:
      "한쪽만 이익을 보는 구조가 아니라, 정보를 얻는 분도, 서비스를 이용하는 분도, 함께하는 파트너도 모두 이익을 얻는 구조를 뜻해요. 신카에서는 좋은 차를 찾는 해외 바이어, 바이어를 소개한 추천인, 차량을 파는 판매자, 그리고 함께하는 파트너사가 모두 연결됩니다.",
    keywords: ["이익", "혜택", "공헌", "모두에게", "왜"],
  },

  // ── 신카 (자동차) ───────────────────────────────────────
  {
    id: "sincar",
    group: "sincar",
    question: "신카는 어떤 서비스인가요?",
    answer:
      "신카는 해외 바이어를 위한 한국 자동차 견적 플랫폼이에요. 한국에 올라온 차량 재고를 실시간으로 확인하고, 마음에 드는 차량에 견적을 신청하면 신카 담당자가 직접 계산해서 결과를 전달해 드립니다. 한국어, 영어, 러시아어, 아랍어로 이용할 수 있어요.",
    keywords: ["신카", "sincar", "자동차", "차량 서비스", "자동차서비스", "수출", "바이어"],
    link: { href: "/sign-in", label: "신카 시작하기" },
  },
  {
    id: "inventory",
    group: "sincar",
    question: "어떤 차량을 볼 수 있나요?",
    answer:
      "SK엔카의 국산차와 수입차 리스, 렌트 승계 차량과 다른 업체의 매물을 함께 보여드려요. 새로 올라온 차량은 신규 목록에서 따로 볼 수 있고, 제조사, 모델, 모델그룹, 연식, 주행거리로 원하는 차량을 좁혀서 찾을 수 있습니다.",
    keywords: ["차량", "매물", "재고", "엔카", "중고차", "검색", "찾기", "어떤 차", "목록"],
  },
  {
    id: "detail",
    group: "sincar",
    question: "차량 정보는 얼마나 자세한가요?",
    answer:
      "차량 가격, 연식, 주행거리, 차량번호와 함께 성능점검 기록과 보험이력을 확인할 수 있어요. 보험이력에서는 자동차 용도이력, 번호와 소유자 변경 횟수, 내 차 피해와 타 차 가해 사고이력을 보여드리고, 계기 상태, 차대번호, 배출가스, 튜닝, 리콜 대상 같은 이슈사항과 옵션 정보도 정리해 드립니다.",
    keywords: ["성능", "점검", "보험", "사고", "이력", "옵션", "상세", "자세", "정보"],
  },
  {
    id: "lease",
    group: "sincar",
    question: "리스·렌트 승계 차량은 무엇인가요?",
    answer:
      "리스나 렌트로 이용 중인 차량을 이어받는 방식이에요. 신카에서는 월 리스료나 월 렌트료, 인수금, 승계지원금, 기간 내외 금액과 전체 금액, 그리고 렌트 만기 후 구매 조건까지 한 화면에서 확인할 수 있습니다.",
    keywords: ["리스", "렌트", "승계", "인수금", "월납", "만기"],
  },
  {
    id: "estimate",
    group: "sincar",
    question: "견적은 어떻게 받나요?",
    answer:
      "차량 상세 화면에서 견적 신청하기를 누르면 끝이에요. 신카 담당자가 요청을 검토하고 가격을 계산해서, 마이페이지의 견적 메뉴에 검토중, 검토완료 상태와 결과를 알려드립니다. 궁금한 점은 채팅으로 바로 상담할 수 있어요. 판매자 연락처는 관리자만 확인하고, 견적을 맡은 담당자가 이후 과정을 끝까지 진행합니다.",
    keywords: ["견적", "가격 계산", "계산", "신청", "상담", "채팅", "구매", "사고싶"],
  },
  {
    id: "currency",
    group: "sincar",
    question: "가격을 달러로 볼 수 있나요?",
    answer:
      "네. 차량 상세 화면의 환율 계산기로 원화와 달러를 실시간 환율로 바로 바꿔볼 수 있어요.",
    keywords: ["달러", "환율", "usd", "원화", "krw", "통화"],
  },
  {
    id: "join",
    group: "sincar",
    question: "회원가입은 어떻게 하나요?",
    answer:
      "이메일이나 구글, 카카오, 페이스북 계정으로 가입할 수 있어요. 이름, 휴대폰 번호, 국가와 함께 회사 이름, 사업자 등록번호, 사업자 등록증을 등록하고, 소개받으셨다면 추천인 이메일이나 전화번호도 적어 주세요. 관리자 승인이 끝나면 차량 목록과 견적 서비스를 이용할 수 있습니다.",
    keywords: ["회원가입", "가입", "로그인", "계정", "승인", "사업자", "추천인"],
    link: { href: "/sign-up", label: "회원가입 하기" },
  },
  {
    id: "global",
    group: "sincar",
    question: "어느 나라에서 이용할 수 있나요?",
    answer:
      "신카는 한국, 미국, 러시아, 아랍에미리트, 중국 바이어를 위해 만들어졌어요. 화면은 한국어, 영어, 러시아어, 아랍어 중에서 골라 쓸 수 있습니다.",
    keywords: ["나라", "국가", "해외", "언어", "러시아", "아랍", "중국", "미국", "영어"],
  },
  {
    id: "contact",
    group: "sincar",
    question: "문의는 어디로 하나요?",
    answer:
      "전화 플러스 82, 010 2609 0761번이나 신카 왓츠앱으로 문의해 주세요. 가입 승인을 빨리 받고 싶을 때도 같은 곳으로 연락하시면 됩니다.",
    keywords: ["문의", "연락", "전화", "왓츠앱", "whatsapp", "고객센터"],
  },
];

export function findFaq(input: string): Faq | null {
  const text = input.replace(/\s+/g, "").toLowerCase();
  if (!text) return null;
  let best: Faq | null = null;
  let bestScore = 0;
  for (const faq of FAQS) {
    let score = 0;
    for (const k of faq.keywords) {
      if (text.includes(k.replace(/\s+/g, "").toLowerCase())) score += k.length;
    }
    if (score > bestScore) {
      best = faq;
      bestScore = score;
    }
  }
  return best;
}
