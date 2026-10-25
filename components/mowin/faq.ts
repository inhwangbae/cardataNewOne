// AI 모윈이 안내하는 자주 묻는 질문
// keywords: 사용자가 직접 입력/음성으로 물었을 때 매칭에 사용

export type Faq = {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  link?: { href: string; label: string };
};

export const GREETING =
  "안녕하세요. 저는 모두위너의 AI, 모윈입니다. 모두위너는 유익한 정보와 유익한 서비스로 이용하는 모든 분께 이익을 돌려드리는 곳이에요. 궁금한 것을 눌러보거나, 저에게 직접 물어보세요.";

export const FALLBACK =
  "아직 그 질문은 배우는 중이에요. 아래의 자주 묻는 질문을 눌러보시거나, 다른 말로 다시 물어봐 주세요.";

export const FAQS: Faq[] = [
  {
    id: "about",
    question: "모두위너는 어떤 곳인가요?",
    answer:
      "모두위너는 한 가지 상품을 파는 회사가 아니에요. 유익한 정보를 제공하고, 유익한 서비스를 제공해서, 이용하는 모든 분께 이익이 돌아가도록 만드는 곳입니다. 이름 그대로, 모두가 위너가 되는 것이 저희의 목표예요.",
    keywords: ["모두위너", "회사", "어떤 곳", "뭐하는", "무엇", "소개"],
  },
  {
    id: "mowin",
    question: "모윈은 누구인가요?",
    answer:
      "저는 모두위너의 AI 안내자, 모윈이에요. 모두위너의 모든 서비스는 저를 통해 시작됩니다. 필요한 정보와 서비스를 찾아 드리고, 처음부터 끝까지 길을 안내해 드릴게요.",
    keywords: ["모윈", "누구", "너는", "AI", "에이아이", "인공지능"],
  },
  {
    id: "services",
    question: "어떤 서비스를 제공하나요?",
    answer:
      "모두위너는 크게 두 가지를 드려요. 첫째, 생활에 도움이 되는 유익한 정보. 둘째, 실제로 이익이 되는 유익한 서비스입니다. 자동차는 그중 첫 번째로 준비된 서비스이고, 앞으로 더 많은 분야로 넓혀갈 예정이에요.",
    keywords: ["서비스", "제공", "정보", "무엇을", "뭘"],
  },
  {
    id: "car",
    question: "자동차 서비스는 무엇인가요?",
    answer:
      "자동차 서비스 신카에서는 차량 정보를 확인하고, 원하는 차량의 견적을 요청하고, 담당자와 바로 상담할 수 있어요. 아래의 서비스 시작하기 버튼으로 바로 이용해 보세요.",
    keywords: ["자동차", "차량", "신카", "견적", "차", "중고차", "수출"],
    link: { href: "/sign-in", label: "신카 시작하기" },
  },
  {
    id: "benefit",
    question: "모두에게 이익이 된다는 건 무슨 뜻인가요?",
    answer:
      "한쪽만 이익을 보는 구조가 아니라, 정보를 얻는 분도, 서비스를 이용하는 분도, 함께하는 파트너도 모두 이익을 얻는 구조를 뜻해요. 모두위너는 그 연결을 만드는 곳입니다.",
    keywords: ["이익", "혜택", "공헌", "모두에게", "왜"],
  },
  {
    id: "join",
    question: "회원가입은 어떻게 하나요?",
    answer:
      "서비스 시작하기를 누르면 로그인 화면으로 이동해요. 이메일로 가입하거나, 구글, 카카오, 페이스북 계정으로 간편하게 시작할 수 있습니다.",
    keywords: ["회원가입", "가입", "로그인", "계정", "시작"],
    link: { href: "/sign-up", label: "회원가입 하기" },
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
