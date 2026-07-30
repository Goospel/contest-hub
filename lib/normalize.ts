import { type CategorySlug, mapCategories } from "./categories";
import type { RawContest } from "./types";

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

/** 연-월-일. 구분자는 `-` `.` `/` `년` `월`, 0 생략과 공백을 허용한다 */
const DATE_PATTERN =
  /(?<!\d)(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})(?!\d)/g;

function toIsoDate(year: number, month: number, day: number): string | null {
  // 범위 검사를 따로 두지 않는다. 13월·0월·0일·32일은 모두 Date 가 다른 날짜로
  // 넘겨버리므로 아래 대조에서 걸린다 (돌연변이로 확인한 사실이다).
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * 원문 표기의 날짜를 ISO(`YYYY-MM-DD`)로 바꾼다. 못 읽으면 null.
 *
 * **연도를 반드시 요구한다.** `8월 31일` 은 어느 해인지 알 수 없고, `26.8.31`
 * 은 2026인지 1926인지 확정할 수 없다. 둘 다 거부한다 — 틀린 마감일을 넣느니
 * 비워두는 편이 낫다(`verify()` 가 마감일 없는 건을 `pending` 으로 보낸다).
 *
 * **기간이 통째로 들어오면 마지막 날짜를 취한다.** `2026.08.01 ~ 2026.08.31`
 * 에서 마감은 뒤쪽이다. 단, 마지막이 실재하지 않는 날짜면 그 앞을 본다.
 *
 * 한계: `2026.08.01 ~ 09.30` 처럼 뒤쪽 연도가 생략된 기간은 앞의 08.01 을
 * 집는다. 연도 없는 조각을 앞 날짜의 연도로 채우는 추론은 하지 않는다.
 */
export function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const matches = [...raw.matchAll(DATE_PATTERN)];

  // 뒤에서부터 훑는다 — 기간 표기의 마감은 마지막 날짜다
  for (let i = matches.length - 1; i >= 0; i--) {
    const [, year, month, day] = matches[i]!;
    const iso = toIsoDate(Number(year), Number(month), Number(day));
    if (iso) return iso;
  }

  return null;
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * http(s) URL 만 통과시킨다. 이 값은 화면에서 원문 링크로 그대로 렌더되므로
 * `javascript:` · `data:` 같은 스킴이 섞이면 그대로 실행 경로가 된다.
 */
function safeUrl(value: string | null | undefined): string | null {
  const candidate = trimOrNull(value);
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  return url.protocol === "http:" || url.protocol === "https:"
    ? candidate
    : null;
}

export type NormalizedContest = {
  source: string;
  sourceUrl: string;
  title: string;
  organizer: string | null;
  category: CategorySlug[];
  target: string | null;
  prize: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  startsAt: string | null;
  deadline: string | null;
  dedupeKey: string;
};

export type NormalizeResult =
  | { ok: true; contest: NormalizedContest }
  | { ok: false; reason: "no-title" | "invalid-url" };

/**
 * 소스가 준 날것을 DB에 넣을 형태로 다듬는다. `status` 는 여기서 정하지 않는다
 * — 검증 결과에 달려 있기 때문이다.
 *
 * 건 전체를 버리는 것은 제목과 원문 URL이 없을 때뿐이다. 나머지 필드는 읽지
 * 못하면 null 로 두고 통과시킨다 — 마감일이 없으면 `verify()` 가 `pending` 으로
 * 보내고, 썸네일이 이상하면 그것만 버린다.
 */
export function normalizeContest(
  raw: RawContest,
  source: string,
): NormalizeResult {
  const title = trimOrNull(raw.title);
  if (!title) return { ok: false, reason: "no-title" };

  const sourceUrl = safeUrl(raw.sourceUrl);
  if (!sourceUrl) return { ok: false, reason: "invalid-url" };

  const deadline = parseDate(raw.deadline);

  let dedupeKey: string;
  try {
    dedupeKey = buildDedupeKey(title, deadline);
  } catch {
    // 구두점만으로 된 제목은 정규화하면 빈 문자열이 된다
    return { ok: false, reason: "no-title" };
  }

  return {
    ok: true,
    contest: {
      source,
      sourceUrl,
      title,
      organizer: trimOrNull(raw.organizer),
      category: mapCategories(raw.category ?? []),
      target: trimOrNull(raw.target),
      prize: trimOrNull(raw.prize),
      description: trimOrNull(raw.description),
      thumbnailUrl: safeUrl(raw.thumbnailUrl),
      startsAt: parseDate(raw.startsAt),
      deadline,
      dedupeKey,
    },
  };
}
