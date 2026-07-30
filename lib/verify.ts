/**
 * 환각 방어. LLM 검색이 주력 소스라 여기가 데이터 품질을 좌우한다.
 *
 * LLM은 존재하지 않는 공모전이나 틀린 마감일을 지어낸다. 그래서 돌아온
 * source_url 을 실제로 열어보고, 그 페이지에 마감일이 정말 적혀 있는지 대조한다.
 * 통과하지 못한 건은 `pending` 으로 남고 공개되지 않는다.
 */

const USER_AGENT =
  "contest-hub (+https://github.com/Goospel/contest-hub)";

const FETCH_TIMEOUT_MS = 15_000;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "no-deadline" }
  | { ok: false; reason: "fetch-failed"; error: string }
  | { ok: false; reason: "http-error"; status: number }
  | { ok: false; reason: "deadline-not-found" };

/**
 * 본문에 그 마감일이 실제로 등장하는지.
 *
 * 한국 공고는 같은 날짜를 `2026-08-31`, `2026.08.31`, `2026. 8. 31.`,
 * `2026년 8월 31일`, `2026/08/31` 등으로 제각기 쓴다. 구분자와 0 생략을
 * 유연하게 받되 **연도는 반드시 요구한다** — `8월 31일` 만 보고 통과시키면
 * 다른 해의 같은 날짜 공고가 그대로 통과한다.
 */
export function deadlineAppearsIn(body: string, deadline: string): boolean {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  if (!parsed) return false;

  const [, year, month, day] = parsed;
  const m = Number(month);
  const d = Number(day);

  // (?<!\d) / (?!\d) 로 긴 숫자열 안에 우연히 포함된 경우를 배제한다
  const pattern = new RegExp(
    `(?<!\\d)${year}\\s*[-./년]\\s*0?${m}\\s*[-./월]\\s*0?${d}(?!\\d)`,
  );

  return pattern.test(body);
}

export async function verifyContest(
  input: { sourceUrl: string; deadline: string | null },
  fetchImpl: typeof fetch = fetch,
): Promise<VerifyResult> {
  // 마감일은 이 사이트의 핵심 정보다. LLM이 찾지 못했다면 그 건 자체를 믿을 수
  // 없으므로 네트워크를 쓰지 않고 바로 실패시킨다.
  if (!input.deadline) return { ok: false, reason: "no-deadline" };

  let response: Response;
  try {
    response = await fetchImpl(input.sourceUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
  } catch (error) {
    return {
      ok: false,
      reason: "fetch-failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  if (!response.ok) {
    return { ok: false, reason: "http-error", status: response.status };
  }

  // ponytail: 본문을 전량 읽는다. 공고 페이지는 작아서 문제되지 않지만,
  // 거대한 페이지가 섞이기 시작하면 스트리밍으로 앞부분만 훑도록 바꾼다.
  const body = await response.text();

  return deadlineAppearsIn(body, input.deadline)
    ? { ok: true }
    : { ok: false, reason: "deadline-not-found" };
}
