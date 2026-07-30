# contest-hub

인터넷에 흩어진 공모전을 자동으로 모아 한곳에서 보여주는 공개 웹사이트.

위비티 크롤링으로 볼륨을 채우고, LLM 웹검색으로 인스타·기업 자체 페이지에만 올라오는 롱테일을 보탠다. LLM이 찾아온 건은 원문 URL 검증을 통과해야만 공개된다.

## 문서

| 문서 | 용도 |
|---|---|
| [plan.md](plan.md) | 앞으로 할 일 |
| [changeLog.md](changeLog.md) | 완료 기록 (역순) |
| [claude-docs/troubleshooting.md](claude-docs/troubleshooting.md) | 함정과 재발 방지 |
| [설계 문서](docs/superpowers/specs/2026-07-30-contest-hub-design.md) | 아키텍처·데이터 모델·수집 파이프라인 |

## 스택

Next.js 16 App Router · TypeScript · Tailwind · Neon Postgres + Drizzle · Vercel (Cron 포함) · cheerio · AI SDK v6

## 개발

아직 스캐폴드 전이다. [plan.md](plan.md)의 M0을 참고.
