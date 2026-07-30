import { expect, test } from "vitest";
import { normalizeContest } from "./normalize";
import type { RawContest } from "./types";

const raw = (over: Partial<RawContest> = {}): RawContest => ({
  title: "제10회 청년 포스터 공모전",
  sourceUrl: "https://example.org/notice/1",
  ...over,
});

const unwrap = (r: ReturnType<typeof normalizeContest>) => {
  if (!r.ok) throw new Error(`정규화 실패: ${r.reason}`);
  return r.contest;
};

// ─── 정상 경로 ────────────────────────────────────────────────

test("원문 표기의 마감일을 ISO 로 바꾼다", () => {
  const c = unwrap(normalizeContest(raw({ deadline: "2026년 8월 31일" }), "llm-search"));
  expect(c.deadline).toBe("2026-08-31");
});

test("자유 텍스트 분야를 slug 로 매핑한다", () => {
  const c = unwrap(normalizeContest(raw({ category: ["포스터 디자인"] }), "llm-search"));
  expect(c.category).toEqual(["design"]);
});

test("분야가 없으면 other 가 된다", () => {
  const c = unwrap(normalizeContest(raw(), "llm-search"));
  expect(c.category).toEqual(["other"]);
});

test("소스 이름을 그대로 담는다", () => {
  const c = unwrap(normalizeContest(raw(), "llm-search"));
  expect(c.source).toBe("llm-search");
});

test("dedupeKey 를 제목과 마감일로 만든다", () => {
  const c = unwrap(normalizeContest(raw({ deadline: "2026.8.31" }), "llm-search"));
  expect(c.dedupeKey).toBe("제10회청년포스터공모전|2026-08-31");
});

test("마감일을 못 읽으면 deadline 은 null 이지만 정규화는 통과한다", () => {
  // 마감일 없는 건은 verify 단계에서 pending 으로 걸러진다
  const c = unwrap(normalizeContest(raw({ deadline: "상시모집" }), "llm-search"));
  expect(c.deadline).toBeNull();
  expect(c.dedupeKey).toBe("제10회청년포스터공모전|");
});

test("시작일도 파싱한다", () => {
  const c = unwrap(normalizeContest(raw({ startsAt: "2026.8.1" }), "llm-search"));
  expect(c.startsAt).toBe("2026-08-01");
});

// ─── 필드 정리 ────────────────────────────────────────────────

test("제목 앞뒤 공백을 없앤다", () => {
  const c = unwrap(normalizeContest(raw({ title: "  공모전 이름  " }), "llm-search"));
  expect(c.title).toBe("공모전 이름");
});

test("빈 문자열 필드는 null 로 바꾼다", () => {
  const c = unwrap(
    normalizeContest(raw({ organizer: "", prize: "   ", description: "" }), "llm-search"),
  );
  expect(c.organizer).toBeNull();
  expect(c.prize).toBeNull();
  expect(c.description).toBeNull();
});

test("주지 않은 선택 필드는 null 이다", () => {
  const c = unwrap(normalizeContest(raw(), "llm-search"));
  expect(c.organizer).toBeNull();
  expect(c.target).toBeNull();
  expect(c.thumbnailUrl).toBeNull();
});

// ─── 거부 ─────────────────────────────────────────────────────

test("제목이 없으면 실패한다", () => {
  expect(normalizeContest(raw({ title: "" }), "llm-search")).toEqual({
    ok: false,
    reason: "no-title",
  });
});

test("제목이 공백뿐이면 실패한다", () => {
  expect(normalizeContest(raw({ title: "   " }), "llm-search")).toEqual({
    ok: false,
    reason: "no-title",
  });
});

test("제목에서 dedupeKey 를 만들 수 없으면 실패한다", () => {
  // 구두점만으로 된 제목은 정규화하면 빈 문자열이 된다
  expect(normalizeContest(raw({ title: "!!! ???" }), "llm-search")).toEqual({
    ok: false,
    reason: "no-title",
  });
});

test("제목과 URL 이 둘 다 잘못됐으면 제목을 먼저 알린다", () => {
  // 사유는 고칠 순서를 알려주는 정보다. 제목 검사를 지우면 URL 사유가 나온다
  expect(normalizeContest({ title: "", sourceUrl: "그냥 문자열" }, "llm-search")).toEqual({
    ok: false,
    reason: "no-title",
  });
});

test("URL 형식이 아니면 실패한다", () => {
  expect(normalizeContest(raw({ sourceUrl: "그냥 문자열" }), "llm-search")).toEqual({
    ok: false,
    reason: "invalid-url",
  });
});

test("javascript: 스킴은 거부한다", () => {
  // 상세 화면에서 원문 링크로 그대로 렌더되므로 스킴을 제한해야 한다
  expect(
    normalizeContest(raw({ sourceUrl: "javascript:alert(1)" }), "llm-search"),
  ).toEqual({ ok: false, reason: "invalid-url" });
});

test("data: 스킴도 거부한다", () => {
  expect(
    normalizeContest(raw({ sourceUrl: "data:text/html,<script>x</script>" }), "llm-search"),
  ).toEqual({ ok: false, reason: "invalid-url" });
});

test("http 와 https 는 통과한다", () => {
  expect(normalizeContest(raw({ sourceUrl: "http://example.org/a" }), "llm-search").ok).toBe(true);
  expect(normalizeContest(raw({ sourceUrl: "https://example.org/a" }), "llm-search").ok).toBe(true);
});

test("썸네일 URL 도 같은 기준으로 거른다", () => {
  // 거부하되 건 전체를 버리진 않는다 — 썸네일은 있으면 좋은 정보다
  const c = unwrap(
    normalizeContest(raw({ thumbnailUrl: "javascript:alert(1)" }), "llm-search"),
  );
  expect(c.thumbnailUrl).toBeNull();
});
