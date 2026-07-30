import { expect, test } from "vitest";
import { parseDate } from "./normalize";

// ─── 표기 변형 ────────────────────────────────────────────────

test("ISO 표기를 그대로 받는다", () => {
  expect(parseDate("2026-08-31")).toBe("2026-08-31");
});

test("점 표기를 받는다", () => {
  expect(parseDate("2026.08.31")).toBe("2026-08-31");
});

test("0 을 생략한 표기를 0 채워 돌려준다", () => {
  expect(parseDate("2026.8.31")).toBe("2026-08-31");
});

test("일도 0 을 채운다", () => {
  expect(parseDate("2026.8.5")).toBe("2026-08-05");
});

test("공백과 마침표가 섞인 표기를 받는다", () => {
  expect(parseDate("2026. 8. 31.")).toBe("2026-08-31");
});

test("한글 표기를 받는다", () => {
  expect(parseDate("2026년 8월 31일")).toBe("2026-08-31");
});

test("슬래시 표기를 받는다", () => {
  expect(parseDate("2026/08/31")).toBe("2026-08-31");
});

test("요일이 붙어 있어도 날짜만 뽑는다", () => {
  expect(parseDate("2026.08.31(금)")).toBe("2026-08-31");
});

test("물결이 앞에 붙어 있어도 뽑는다", () => {
  expect(parseDate("~ 2026.8.31")).toBe("2026-08-31");
});

test("시각이 뒤에 붙어 있어도 날짜만 뽑는다", () => {
  expect(parseDate("2026년 8월 31일 18시까지")).toBe("2026-08-31");
});

// ─── 기간 표기 ────────────────────────────────────────────────

test("기간이 통째로 들어오면 마지막 날짜를 마감으로 본다", () => {
  expect(parseDate("접수기간 2026.08.01 ~ 2026.08.31")).toBe("2026-08-31");
});

test("연도가 둘 다 있는 기간에서도 마지막을 취한다", () => {
  expect(parseDate("2026.12.01 ~ 2027.01.15")).toBe("2027-01-15");
});

// ─── 거부해야 하는 것 ─────────────────────────────────────────

test("연도가 없으면 파싱하지 않는다", () => {
  expect(parseDate("8월 31일")).toBeNull();
});

test("두 자리 연도는 파싱하지 않는다", () => {
  // "26.08.31" 이 2026인지 1926인지 확정할 수 없다
  expect(parseDate("26.08.31")).toBeNull();
});

test("세 자리 연도는 파싱하지 않는다", () => {
  // 두 자리는 JS가 1900년대로 해석해 우연히 걸러진다. 세 자리는 그렇지 않아
  // 연도 자릿수를 느슨하게 하면 "126-08-31" 같은 값이 그대로 통과한다
  expect(parseDate("126.08.31")).toBeNull();
});

test("긴 숫자열 안에서 연도를 잘라내지 않는다", () => {
  // 경계가 없으면 "12026" 에서 "2026" 을 뽑아 엉뚱한 날짜를 만든다
  expect(parseDate("문서번호 12026.08.31")).toBeNull();
});

test("긴 숫자열 안에서 일을 잘라내지 않는다", () => {
  expect(parseDate("2026.08.311")).toBeNull();
});

test("날짜가 아닌 문구는 파싱하지 않는다", () => {
  expect(parseDate("상시모집")).toBeNull();
});

test("실재하지 않는 날짜는 파싱하지 않는다", () => {
  expect(parseDate("2026-02-30")).toBeNull();
});

test("13월은 파싱하지 않는다", () => {
  expect(parseDate("2026-13-01")).toBeNull();
});

test("0월과 0일은 파싱하지 않는다", () => {
  expect(parseDate("2026-00-10")).toBeNull();
  expect(parseDate("2026-10-00")).toBeNull();
});

test("평년의 2월 29일은 파싱하지 않는다", () => {
  expect(parseDate("2026-02-29")).toBeNull();
});

test("윤년의 2월 29일은 파싱한다", () => {
  expect(parseDate("2028-02-29")).toBe("2028-02-29");
});

test("빈 값과 null 은 null 이다", () => {
  expect(parseDate("")).toBeNull();
  expect(parseDate("   ")).toBeNull();
  expect(parseDate(null)).toBeNull();
  expect(parseDate(undefined)).toBeNull();
});

test("유효하지 않은 날짜 뒤에 유효한 날짜가 있으면 유효한 쪽을 취한다", () => {
  // 마지막 것을 무조건 취하면 2026-02-30 을 집어 통째로 null 이 된다
  expect(parseDate("2026-02-30 정정: 2026-03-02")).toBe("2026-03-02");
});
