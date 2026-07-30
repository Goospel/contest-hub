import { expect, test } from "vitest";
import { buildDedupeKey } from "./normalize";

test("제목의 공백·특수문자·괄호를 지우고 소문자화한 뒤 마감일과 결합한다", () => {
  expect(buildDedupeKey("제10회 (사)한국디자인 공모전!", "2026-08-31")).toBe(
    "제10회사한국디자인공모전|2026-08-31",
  );
});

test("표기만 다른 같은 공모전은 같은 키가 된다", () => {
  const fromCrawler = buildDedupeKey("2026 청년 아이디어 공모전", "2026-09-15");
  const fromLlm = buildDedupeKey("[2026] 청년 아이디어 공모전", "2026-09-15");

  expect(fromCrawler).toBe("2026청년아이디어공모전|2026-09-15");
  expect(fromLlm).toBe(fromCrawler);
});

test("영문 대소문자 차이를 흡수한다", () => {
  expect(buildDedupeKey("AI Contest", "2026-09-15")).toBe(
    "aicontest|2026-09-15",
  );
  expect(buildDedupeKey("ai contest", "2026-09-15")).toBe(
    "aicontest|2026-09-15",
  );
});

test("제목이 같아도 마감일이 다르면 다른 키다", () => {
  const y2026 = buildDedupeKey("전국 사진 공모전", "2026-09-15");
  const y2027 = buildDedupeKey("전국 사진 공모전", "2027-09-15");

  expect(y2027).not.toBe(y2026);
});

test("마감일을 모르면 제목만으로 키를 만든다", () => {
  expect(buildDedupeKey("마감일 미상 공모전", null)).toBe("마감일미상공모전|");
});

test("제목에 숫자가 있으면 회차를 구분한다", () => {
  const tenth = buildDedupeKey("제10회 사진 공모전", "2026-09-15");
  const eleventh = buildDedupeKey("제11회 사진 공모전", "2026-09-15");

  expect(eleventh).not.toBe(tenth);
});

test("제목이 공백뿐이면 던진다", () => {
  expect(() => buildDedupeKey("   ", "2026-09-15")).toThrow();
});
