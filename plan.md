# plan — contest-hub

앞으로 할 일. 완료 기록은 [changeLog.md](changeLog.md), 함정은 [claude-docs/troubleshooting.md](claude-docs/troubleshooting.md).

**범례** ✅완료 / 🔜다음 / ⬜예정 / ⏸의도적 보류(v2) / ❌폐기(다시 꺼내지 않음) / ⚠️리스크·전제

설계 원본: [docs/superpowers/specs/2026-07-30-contest-hub-design.md](docs/superpowers/specs/2026-07-30-contest-hub-design.md)

---

## M0. 부트스트랩

- ✅ 설계 문서 작성
- ✅ 작업 추적 3종 + troubleshooting 분할 시스템 배치
- ✅ Next.js 16 + TypeScript + Tailwind 스캐폴드 (빌드 통과)
- ✅ Vercel CLI 설치 + 프로젝트 링크 (`goospel/contest-hub`, GitHub 저장소 자동 연결)
- 🔜 Neon Postgres 마켓플레이스 연동 — ⏸ **사용자의 약관 동의 대기 중**
  - `vercel integration add neon` 이 `integration_terms_acceptance_required` 로 멈춘다
  - 수락 URL: https://vercel.com/goospel/~/integrations/accept-terms/neon?source=cli
  - 수락 후: `vercel integration add neon --scope goospel` → `vercel env pull .env.local`
- ⚠️ `npm audit fix --force` 금지 — Next를 9.3.3으로 되돌리려 든다 ([T-002](claude-docs/troubleshooting/T-002.md))

## M1. 데이터 계층

- ✅ Drizzle 스키마 `contests` 정의 + 마이그레이션 SQL 생성 (`db/migrations/0000_wealthy_korg.sql`)
- ✅ `dedupe_key` 생성 함수 — TDD, 7건 통과 (`lib/normalize.ts`)
- 🔜 마이그레이션 실제 적용 — Neon 연동 후
- ⬜ upsert 로직 — 충돌 시 승격 소스가 LLM 검색을 이기는 규칙 포함, 테스트 먼저

## M2. 수집 파이프라인

- ✅ 위비티 `robots.txt`·이용약관 확인 → **크롤링 포기, 원출처 중심으로 전환** ([T-003](claude-docs/troubleshooting/T-003.md))
- ✅ AI Gateway 웹검색 도구 형태 확정 — `gateway.tools.perplexitySearch()` + `generateText` + `Output.object`
- 🔜 LLM 검색 실측 — ⏸ **AI Gateway 카드 등록 대기 중**
  - 인증(OIDC)은 통과하고 모델 목록 조회도 되는데 추론만 403 ([T-004](claude-docs/troubleshooting/T-004.md))
  - 등록 URL: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card
  - 등록 후: `node --env-file=.env.local scripts/probe-search.mts` — 환각률과 한국 공모전 커버리지를 눈으로 확인
- ✅ 분야 태그 12종 + 매핑 — TDD 20건, 돌연변이 7종 전부 사살 (`lib/categories.ts`)
- ✅ `verify()` — fetch 주입형, TDD 19건 + 돌연변이 7종 전부 사살 (`lib/verify.ts`)
- ✅ `Source` 인터페이스 + `normalize()` — TDD 44건, 돌연변이 11종 전부 사살 (`lib/normalize.ts`, `lib/types.ts`)
- ⬜ LLM 검색 소스 — AI SDK v6 + AI Gateway, 매일 질의 5개
- ⬜ `/api/cron/ingest` + Vercel Cron 하루 1회, 만료 처리 포함
- ⬜ 한국콘텐츠진흥원 지원사업공고 API가 쓸 만한지 확인 — 유일하게 남은 공공 API 후보

## M3. 화면

- ⬜ `/` 목록 — 카드 그리드, 마감 임박순, 페이지네이션 ⚠️ **데이터 수십 건인 초기 상태에서도 초라해 보이지 않게**
- ⬜ 검색(제목·주최) + 분야 필터 + 마감 지난 것 보기 토글
- ⬜ `/contest/[id]` 상세

## M4. 배포

- ⬜ Vercel 배포 + Cron 동작 확인
- ⬜ 실제 수집 1회 돌려 데이터 품질 눈으로 확인

---

## ⏸ 보류 (v2)

- ⏸ 회원/로그인 — 1차에서 명시적으로 제외. 인증·DB·이메일까지 범위가 크게 늘어난다
- ⏸ 관심 공모전 저장, 마감 알림 — 회원 기능에 딸린다
- ⏸ 관리자 검수 화면 — `pending` 건을 사람이 승인하는 UI. 지금은 `pending`에 쌓아두기만 한다
- ⏸ 원출처 도메인 승격 — LLM 검색에 반복 등장하는 주최기관 공고 페이지를 전용 소스로 만든다. 운영하며 후보가 쌓여야 시작할 수 있다 (`source_url` 도메인별 집계)
- ❌ 애그리게이터 크롤링(위비티·씽굿·링커리어) — 보류가 아니라 **폐기**. 이용약관과 데이터베이스제작자 권리에 걸린다 ([T-003](claude-docs/troubleshooting/T-003.md))
