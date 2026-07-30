/**
 * LLM 웹검색으로 공모전을 찾아 구조화 출력으로 받는 실측 스파이크.
 *
 *   node --env-file=.env.local scripts/probe-search.mts
 *
 * 확인하려는 것:
 *   1. 웹검색 도구가 실제로 호출되는가
 *   2. 구조화 출력(Output.object)과 도구 호출이 함께 되는가
 *   3. 돌아온 source_url 이 실재하는가  ← 진짜 관심사
 */
import { Output, generateText, gateway, isStepCount } from "ai";
import { z } from "zod";

const schema = z.object({
  contests: z.array(
    z.object({
      title: z.string().describe("공모전 정식 명칭"),
      organizer: z.string().nullable().describe("주최 기관"),
      deadline: z
        .string()
        .nullable()
        .describe("접수 마감일. YYYY-MM-DD 형식. 모르면 null"),
      sourceUrl: z
        .string()
        .describe("공고 원문 URL. 반드시 검색 결과에 실제로 등장한 URL만"),
      category: z.array(z.string()).describe("분야 태그"),
    }),
  ),
});

const started = Date.now();

const { output, steps, usage } = await generateText({
  model: "anthropic/claude-sonnet-5",
  tools: { web_search: gateway.tools.perplexitySearch({ maxResults: 10 }) },
  output: Output.object({ schema }),
  stopWhen: isStepCount(6),
  prompt: `한국에서 지금 접수 중인 공모전을 웹에서 검색해 찾아라.

규칙:
- 반드시 web_search 도구로 실제 검색한 결과만 사용한다.
- sourceUrl 은 검색 결과에 실제로 등장한 URL만 쓴다. 추측하거나 지어내지 마라.
- 마감일이 이미 지난 것은 제외한다. 오늘은 2026-07-30 이다.
- 확실하지 않으면 그 항목을 빼라. 개수를 채우려고 지어내지 마라.`,
});

console.log(`\n=== 소요 ${((Date.now() - started) / 1000).toFixed(1)}초 ===`);
console.log("스텝 수:", steps.length);
for (const [i, s] of steps.entries()) {
  const calls = s.toolCalls.map((c) => c.toolName);
  console.log(`  step ${i}: 도구호출 [${calls.join(", ")}] / 결과 ${s.toolResults.length}건`);
}
console.log("토큰:", usage);

const contests = output.contests;
console.log(`\n=== 공모전 ${contests.length}건 ===`);
for (const c of contests) {
  console.log(`\n· ${c.title}`);
  console.log(`  주최: ${c.organizer ?? "-"} / 마감: ${c.deadline ?? "-"}`);
  console.log(`  분야: ${c.category.join(", ") || "-"}`);
  console.log(`  URL: ${c.sourceUrl}`);
}

// URL 실재 확인 — 환각 여부를 여기서 본다
console.log("\n=== URL 생존 확인 ===");
let alive = 0;
for (const c of contests) {
  try {
    const res = await fetch(c.sourceUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "contest-hub probe (+https://github.com/Goospel/contest-hub)" },
    });
    if (res.ok) alive++;
    console.log(`${res.ok ? "OK  " : "FAIL"} ${res.status} ${c.sourceUrl}`);
  } catch (e) {
    console.log(`ERR      ${c.sourceUrl} — ${(e as Error).message}`);
  }
}
console.log(`\n생존 ${alive}/${contests.length}`);
