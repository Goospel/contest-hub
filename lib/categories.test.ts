import { expect, test } from "vitest";
import { CATEGORIES, CATEGORY_SLUGS, mapCategories } from "./categories";

// ─── 상수 자체의 건전성 ────────────────────────────────────────

test("slug 는 중복되지 않는다", () => {
  const slugs = CATEGORIES.map((c) => c.slug);
  expect(new Set(slugs).size).toBe(slugs.length);
});

test("other 를 제외한 모든 분야는 키워드를 가진다", () => {
  const empty = CATEGORIES.filter(
    (c) => c.slug !== "other" && c.keywords.length === 0,
  );
  expect(empty).toEqual([]);
});

test("other 는 키워드로 매칭되지 않는다", () => {
  // other 는 '아무것도 안 맞을 때'의 결과지 매칭 대상이 아니다
  const other = CATEGORIES.find((c) => c.slug === "other");
  expect(other?.keywords).toEqual([]);
});

// ─── 기본 매핑 ────────────────────────────────────────────────

test("한글 키워드를 부분 문자열로 찾는다", () => {
  expect(mapCategories(["포스터 디자인"])).toEqual(["design"]);
});

test("여러 입력에서 각각 다른 분야를 뽑는다", () => {
  expect(mapCategories(["포스터", "숏폼 영상"])).toEqual([
    "design",
    "video-photo",
  ]);
});

test("한 입력이 두 분야에 걸리면 둘 다 붙인다", () => {
  // 다중 선택이므로 억지로 하나를 고르지 않는다. 순서는 선언 순서를 따른다
  expect(mapCategories(["창업 아이디어"])).toEqual(["idea", "startup"]);
});

test("같은 분야로 여러 번 매칭돼도 한 번만 넣는다", () => {
  expect(mapCategories(["디자인", "포스터", "로고"])).toEqual(["design"]);
});

test("결과는 CATEGORIES 선언 순서를 따른다", () => {
  // 입력 순서에 따라 필터 UI의 태그 순서가 흔들리면 안 된다
  expect(mapCategories(["해커톤", "포스터"])).toEqual(["design", "it-dev"]);
});

// ─── other 폴백 ───────────────────────────────────────────────

test("아무것도 안 맞으면 other 하나만 준다", () => {
  expect(mapCategories(["대학생 대상"])).toEqual(["other"]);
});

test("빈 배열이면 other 를 준다", () => {
  expect(mapCategories([])).toEqual(["other"]);
});

test("일부만 맞으면 other 를 붙이지 않는다", () => {
  expect(mapCategories(["대학생 대상", "포스터"])).toEqual(["design"]);
});

// ─── 영문 키워드의 단어 경계 ──────────────────────────────────

test("영문 키워드는 대소문자를 가리지 않는다", () => {
  expect(mapCategories(["UI/UX Design"])).toEqual(["design"]);
});

test("짧은 영문 키워드가 다른 단어에 묻어가지 않는다", () => {
  // 'ui' 를 단순 포함 검사하면 guide 가 디자인으로 분류된다
  expect(mapCategories(["guide 작성 대회"])).toEqual(["other"]);
});

test("ai 가 단어 안에 있으면 매칭되지 않는다", () => {
  // chain, aid, plain 등에 'ai' 가 들어 있다
  expect(mapCategories(["supply chain 개선"])).toEqual(["other"]);
});

test("키워드로 끝나는 영문 단어에 묻어가지 않는다", () => {
  // 'thai' 는 'ai' 로 끝난다 — 앞쪽 경계가 없으면 걸린다
  expect(mapCategories(["thai food 공모전"])).toEqual(["other"]);
});

test("키워드로 시작하는 영문 단어에 묻어가지 않는다", () => {
  // 'aid' 는 'ai' 로 시작한다 — 뒤쪽 경계가 없으면 걸린다
  expect(mapCategories(["aid 프로그램"])).toEqual(["other"]);
});

test("독립된 단어로서의 ai 는 매칭된다", () => {
  expect(mapCategories(["AI 활용 대회"])).toEqual(["it-dev"]);
});

// ─── 입력 정리 ────────────────────────────────────────────────

test("앞뒤 공백은 무시한다", () => {
  expect(mapCategories(["  포스터  "])).toEqual(["design"]);
});

test("빈 문자열이 섞여 있어도 무시한다", () => {
  expect(mapCategories(["", "  ", "포스터"])).toEqual(["design"]);
});
