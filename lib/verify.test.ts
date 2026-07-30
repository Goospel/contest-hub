import { expect, test, vi } from "vitest";
import { deadlineAppearsIn, verifyContest } from "./verify";

/** 주어진 본문·상태코드를 돌려주는 가짜 fetch */
const fetchReturning = (body: string, status = 200) =>
  vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;

// ─── 날짜 표기 매칭 ───────────────────────────────────────────

test("ISO 표기를 찾는다", () => {
  expect(deadlineAppearsIn("접수 마감 2026-08-31 까지", "2026-08-31")).toBe(true);
});

test("점 표기를 찾는다", () => {
  expect(deadlineAppearsIn("마감 2026.08.31", "2026-08-31")).toBe(true);
});

test("점 표기에 공백과 0 생략이 섞여도 찾는다", () => {
  expect(deadlineAppearsIn("접수기간 ~ 2026. 8. 31.", "2026-08-31")).toBe(true);
});

test("한글 표기를 찾는다", () => {
  expect(deadlineAppearsIn("2026년 8월 31일까지 접수", "2026-08-31")).toBe(true);
});

test("슬래시 표기를 찾는다", () => {
  expect(deadlineAppearsIn("Due 2026/08/31", "2026-08-31")).toBe(true);
});

test("연도가 없는 표기는 인정하지 않는다", () => {
  // "8월 31일"만 보고 통과시키면 다른 해 공고가 그대로 통과한다
  expect(deadlineAppearsIn("8월 31일까지 접수합니다", "2026-08-31")).toBe(false);
});

test("연도가 다르면 찾지 못한다", () => {
  expect(deadlineAppearsIn("마감 2027.08.31", "2026-08-31")).toBe(false);
});

test("일 숫자 뒤에 다른 숫자가 붙으면 매칭하지 않는다", () => {
  expect(deadlineAppearsIn("코드 2026-08-310", "2026-08-31")).toBe(false);
});

test("연도 앞에 다른 숫자가 붙으면 매칭하지 않는다", () => {
  expect(deadlineAppearsIn("일련번호 12026-08-31", "2026-08-31")).toBe(false);
});

test("월과 일이 뒤바뀐 표기는 찾지 못한다", () => {
  expect(deadlineAppearsIn("2026-31-08", "2026-08-31")).toBe(false);
});

test("구분자 없이 공백만으로 나열된 숫자는 마감일로 보지 않는다", () => {
  // 표 셀이 이어붙은 경우 등에서 우연히 만들어진다
  expect(deadlineAppearsIn("2026 8 31", "2026-08-31")).toBe(false);
});

test("날짜 구분자가 아닌 문자로 이어진 숫자는 마감일로 보지 않는다", () => {
  expect(deadlineAppearsIn("코드 2026a08b31", "2026-08-31")).toBe(false);
});

// ─── verifyContest ────────────────────────────────────────────

test("200 응답 본문에 마감일이 있으면 통과한다", async () => {
  const result = await verifyContest(
    { sourceUrl: "https://example.org/notice", deadline: "2026-08-31" },
    fetchReturning("<p>접수 마감: 2026.08.31</p>"),
  );

  expect(result).toEqual({ ok: true });
});

test("본문에 마감일이 없으면 deadline-not-found 로 실패한다", async () => {
  const result = await verifyContest(
    { sourceUrl: "https://example.org/notice", deadline: "2026-08-31" },
    fetchReturning("<p>준비 중입니다</p>"),
  );

  expect(result).toEqual({ ok: false, reason: "deadline-not-found" });
});

test("404 면 http-error 와 상태코드를 돌려준다", async () => {
  const result = await verifyContest(
    { sourceUrl: "https://example.org/gone", deadline: "2026-08-31" },
    fetchReturning("Not Found", 404),
  );

  expect(result).toEqual({ ok: false, reason: "http-error", status: 404 });
});

test("500 도 http-error 다", async () => {
  const result = await verifyContest(
    { sourceUrl: "https://example.org/broken", deadline: "2026-08-31" },
    fetchReturning("oops", 500),
  );

  expect(result).toEqual({ ok: false, reason: "http-error", status: 500 });
});

test("fetch 가 던지면 fetch-failed 로 사유를 담아 실패한다", async () => {
  const throwing = vi.fn(async () => {
    throw new Error("timeout");
  }) as unknown as typeof fetch;

  const result = await verifyContest(
    { sourceUrl: "https://example.org/slow", deadline: "2026-08-31" },
    throwing,
  );

  expect(result).toEqual({
    ok: false,
    reason: "fetch-failed",
    error: "timeout",
  });
});

test("마감일을 모르면 네트워크를 타지 않고 실패한다", async () => {
  const spy = vi.fn(async () => new Response("아무거나"));

  const result = await verifyContest(
    { sourceUrl: "https://example.org/notice", deadline: null },
    spy as unknown as typeof fetch,
  );

  expect(result).toEqual({ ok: false, reason: "no-deadline" });
  expect(spy).not.toHaveBeenCalled();
});

test("주입한 fetch 를 실제로 그 URL 로 호출한다", async () => {
  const spy = vi.fn(async () => new Response("2026-08-31"));

  await verifyContest(
    { sourceUrl: "https://example.org/notice", deadline: "2026-08-31" },
    spy as unknown as typeof fetch,
  );

  expect(spy).toHaveBeenCalledOnce();
  expect(spy.mock.calls[0]![0]).toBe("https://example.org/notice");
});
