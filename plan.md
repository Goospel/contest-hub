# plan — contest-hub

앞으로 할 일. 완료 기록은 [changeLog.md](changeLog.md), 함정은 [claude-docs/troubleshooting.md](claude-docs/troubleshooting.md).

**범례** ✅완료 / 🔜다음 / ⬜예정 / ⏸의도적 보류(v2) / ⚠️리스크·전제

설계 원본: [docs/superpowers/specs/2026-07-30-contest-hub-design.md](docs/superpowers/specs/2026-07-30-contest-hub-design.md)

---

## M0. 부트스트랩

- ✅ 설계 문서 작성
- ✅ 작업 추적 3종 + troubleshooting 분할 시스템 배치
- 🔜 Next.js 16 + TypeScript + Tailwind 스캐폴드
- ⬜ Vercel 프로젝트 링크, Neon Postgres 마켓플레이스 연동
- ⚠️ Vercel CLI 미설치 (`npm i -g vercel`) — 링크·env pull 단계에서 필요

## M1. 데이터 계층

- ⬜ Drizzle 스키마 `contests` 정의 + 마이그레이션
- ⬜ `dedupe_key` 생성 함수 — **테스트 먼저** (제목 정규화: 공백·특수문자·괄호 제거 후 소문자 + 마감일)
- ⬜ upsert 로직 — 충돌 시 크롤러 소스가 LLM 소스를 이기는 규칙 포함, 테스트 먼저

## M2. 수집 파이프라인

- ⬜ `Source` 인터페이스 + `normalize()` — 날짜 파싱·분야 태그 매핑, 테스트 먼저
- ⬜ 위비티 `robots.txt`·이용약관 확인 ⚠️ **크롤러 코드보다 먼저**
- ⬜ 위비티 파서 — 실제 목록 페이지 HTML 픽스처 저장 후 테스트 먼저
- ⬜ `verify()` — fetch 주입형, URL 생존 + 본문 내 마감일 실재 확인, 테스트 먼저
- ⬜ LLM 검색 소스 — AI SDK v6 + AI Gateway ⚠️ 웹검색 도구 노출 형태를 문서로 먼저 확인
- ⬜ `/api/cron/ingest` + Vercel Cron 하루 1회, 만료 처리 포함

## M3. 화면

- ⬜ `/` 목록 — 카드 그리드, 마감 임박순, 페이지네이션
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
- ⏸ 위비티 외 크롤링 소스(씽굿·링커리어) — 소스 인터페이스가 플러그인이라 나중에 파일 하나로 추가된다
