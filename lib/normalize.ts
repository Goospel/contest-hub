/**
 * 같은 공모전이 여러 소스에서 들어와도 한 행으로 합치기 위한 동일성 키.
 *
 * 제목 표기는 소스마다 다르다 — 크롤러는 "2026 청년 아이디어 공모전", LLM은
 * "[2026] 청년 아이디어 공모전" 처럼 가져온다. 공백·구두점·괄호를 지우고
 * 소문자화해 이 차이를 흡수하되, 숫자는 남겨 회차("제10회" vs "제11회")를 구분한다.
 */
export function buildDedupeKey(
  title: string,
  deadline: string | null,
): string {
  const normalized = title.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");

  if (!normalized) {
    throw new Error(
      `제목에서 dedupe_key를 만들 수 없다: ${JSON.stringify(title)}`,
    );
  }

  return `${normalized}|${deadline ?? ""}`;
}
