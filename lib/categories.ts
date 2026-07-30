/**
 * 공모전 분야 태그.
 *
 * LLM이 자유 텍스트로 뱉은 분야("포스터 디자인", "숏폼 영상")를 이 집합에
 * 매핑한다. 태그는 다중 선택이라 한 공모전이 여러 개를 가질 수 있고, 억지로
 * 하나를 고르지 않는다.
 *
 * DB에는 `slug` 만 저장한다 — 표시명을 바꿔도 데이터를 건드리지 않기 위해서다.
 */

export type Category = {
  slug: string;
  label: string;
  /** 소문자로 선언한다. 매칭 시 입력도 소문자화해 대조한다 */
  keywords: readonly string[];
};

/**
 * 선언 순서가 곧 표시 순서다. 매핑 결과도 이 순서를 따르므로, 입력 순서가
 * 달라도 같은 공모전이면 같은 태그 배열이 나온다.
 *
 * 키워드를 고를 때의 원칙:
 * - 한 글자~두 글자 한글은 넣지 않는다. "시"는 "전시"·"시나리오"에 묻어간다
 * - 다른 분야의 키워드를 부분 문자열로 포함하면 안 된다. "웹"은 "웹툰"에 걸린다
 * - 애매하면 넣지 않는다. 놓친 건 `other` 로 가고, `other` 가 쌓이면 그게 곧
 *   키워드 보강 신호다. 잘못 붙은 태그는 그런 신호를 주지 않는다
 */
export const CATEGORIES = [
  {
    slug: "design",
    label: "디자인",
    keywords: [
      "디자인", "design", "포스터", "로고", "브랜딩", "패키지",
      "그래픽", "ui", "ux",
    ],
  },
  {
    slug: "video-photo",
    label: "영상·사진",
    keywords: [
      "영상", "숏폼", "ucc", "사진", "촬영", "영화", "다큐", "브이로그",
    ],
  },
  {
    slug: "idea",
    label: "아이디어·기획",
    keywords: ["아이디어", "기획", "제안", "마케팅", "정책"],
  },
  {
    slug: "naming",
    label: "네이밍·슬로건",
    keywords: ["네이밍", "슬로건", "표어", "캐치프레이즈", "작명"],
  },
  {
    slug: "writing",
    label: "글·문학",
    keywords: [
      "수기", "에세이", "백일장", "독후감", "논문", "문학", "시나리오",
      "글쓰기", "소설", "산문", "서평",
    ],
  },
  {
    slug: "art-craft",
    label: "미술·공예",
    keywords: [
      "미술", "회화", "그림", "조형", "캘리그라피", "캘리그래피", "공예",
      "조각", "서예", "일러스트",
    ],
  },
  {
    slug: "music-performance",
    label: "음악·공연",
    keywords: [
      "음악", "작곡", "보컬", "노래", "댄스", "무용", "연극", "공연",
      "뮤지컬", "밴드",
    ],
  },
  {
    slug: "it-dev",
    label: "IT·개발",
    keywords: [
      "개발", "해커톤", "소프트웨어", "인공지능", "ai", "데이터", "코딩",
      "프로그래밍", "알고리즘", "모바일앱",
    ],
  },
  {
    slug: "startup",
    label: "창업·비즈니스",
    keywords: ["창업", "스타트업", "사업계획", "비즈니스", "사업화"],
  },
  {
    slug: "content-character",
    label: "콘텐츠·캐릭터",
    keywords: ["웹툰", "만화", "게임", "캐릭터", "이모티콘", "웹소설"],
  },
  {
    slug: "science-eng",
    label: "과학·공학",
    keywords: ["과학", "공학", "발명", "연구", "실험", "특허"],
  },
  {
    slug: "other",
    label: "기타",
    // 매칭 대상이 아니다. 아무것도 안 맞을 때의 결과다
    keywords: [],
  },
] as const satisfies readonly Category[];

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as readonly CategorySlug[];

/** 영문·숫자로만 이루어진 키워드 — 단어 경계를 요구해야 하는 것들 */
const ASCII_ONLY = /^[a-z0-9/+.-]+$/;

function matchesKeyword(haystack: string, keyword: string): boolean {
  // 한글은 조사가 붙으므로 부분 문자열로 찾는다 ("포스터를" 안의 "포스터")
  if (!ASCII_ONLY.test(keyword)) return haystack.includes(keyword);

  // 영문은 단어 경계를 요구한다 — 없으면 "ui" 가 "guide" 에, "ai" 가 "chain" 에 묻어간다
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(haystack);
}

export function mapCategories(freeTexts: string[]): CategorySlug[] {
  // trim 도 빈 문자열 제거도 하지 않는다 — 한글은 부분 문자열로, 영문은 단어
  // 경계로 찾으므로 앞뒤 공백이 결과를 바꾸지 않고, 빈 문자열은 무엇과도 매칭되지
  // 않는다. 돌연변이로 확인한 사실이다.
  const inputs = freeTexts.map((text) => text.toLowerCase());

  const matched = CATEGORIES.filter((category) =>
    category.keywords.some((keyword) =>
      inputs.some((input) => matchesKeyword(input, keyword)),
    ),
  ).map((category) => category.slug);

  return matched.length > 0 ? [...matched] : ["other"];
}
