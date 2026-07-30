# contest-hub

인터넷에 흩어진 공모전을 자동으로 모아 한곳에서 보여주는 공개 웹사이트.

**주최 측 원출처에서만 모은다.** LLM 웹검색이 공고를 찾아오고, 찾아온 건은 원문 URL 생존과 마감일 실재 확인을 통과해야만 공개된다. 검색에 반복 등장하는 도메인은 전용 소스로 승격시켜 전량 수집한다 — 처음엔 얇고 쓸수록 두꺼워지는 구조다.

공모전 애그리게이터를 긁는 방식은 이용약관과 저작권법상 데이터베이스제작자 권리 때문에 폐기했다 ([T-003](claude-docs/troubleshooting/T-003.md)).

## 문서

| 문서 | 용도 |
|---|---|
| [plan.md](plan.md) | 앞으로 할 일 |
| [changeLog.md](changeLog.md) | 완료 기록 (역순) |
| [claude-docs/troubleshooting.md](claude-docs/troubleshooting.md) | 함정과 재발 방지 |
| [설계 문서](docs/superpowers/specs/2026-07-30-contest-hub-design.md) | 아키텍처·데이터 모델·수집 파이프라인 |

## 스택

Next.js 16 App Router · TypeScript · Tailwind · Neon Postgres + Drizzle · Vercel (Cron 포함) · AI SDK v6 + AI Gateway · cheerio(승격 소스용)

## 개발

아직 스캐폴드 전이다. [plan.md](plan.md)의 M0을 참고.
