/**
 * AI Gateway 연결·웹검색 도구 확인용 프로브.
 *
 *   node --env-file=.env.local scripts/probe-gateway.mts
 *
 * VERCEL_OIDC_TOKEN 은 약 24시간마다 만료된다. 401 이 나면:
 *   vercel env pull .env.local --yes
 */
import { gateway } from "ai";

console.log("gateway.tools 키:", Object.keys((gateway as any).tools ?? {}));

const models = await gateway.getAvailableModels();
const all = (models as any).models ?? models;
console.log("사용 가능한 모델 수:", all.length);

const candidates = all
  .map((m: any) => m.id as string)
  .filter((id: string) => /anthropic|openai|perplexity/.test(id))
  .sort();
console.log("후보 모델:\n" + candidates.join("\n"));
