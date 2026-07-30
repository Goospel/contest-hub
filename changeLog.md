# changeLog — contest-hub

완료 기록 (역순). 앞으로 할 일은 [plan.md](plan.md), 함정은 [claude-docs/troubleshooting.md](claude-docs/troubleshooting.md).

코드 세부는 커밋·PR에 있다. 여기엔 **왜 / 무엇을**만 적는다.

---

## 2026-07-30 · Next.js 스캐폴드 (M0 전반부)

Next.js 16 + TypeScript + Tailwind 4로 뼈대를 세웠다. `create-next-app` 을 스크래치패드에서 돌린 뒤 설정 파일만 가져왔다 — 이미 있는 `README.md`·`.gitignore` 를 덮어쓰지 않기 위해서다. 기본 예제 페이지와 Geist 폰트 설정은 가져오지 않았다.

의존성 감사에서 `drizzle-orm` 의 SQL injection 취약점(GHSA-gpj5-g38j-94v9)이 나와 0.45.2로 올렸다. 남은 경고들은 `next` 내부 의존성이라 고칠 수 없고, `npm audit fix --force` 는 Next을 9.3.3으로 다운그레이드하려 들기 때문에 금지 사항으로 기록했다 ([T-002](claude-docs/troubleshooting/T-002.md)).

Vercel 링크와 Neon 연동은 Vercel CLI가 없어 아직 못 했다.

## 2026-07-30 · 프로젝트 부트스트랩

인터넷에 흩어진 공모전을 자동 수집해 한곳에서 보여주는 공개 사이트를 시작했다.

수집 전략을 하이브리드로 정했다 — 애그리게이터 크롤링은 볼륨·정확도를 싸게 주지만 인스타나 기업 자체 페이지에서만 홍보되는 롱테일을 놓치고, LLM 웹검색은 롱테일을 잡지만 없는 공모전과 틀린 마감일을 지어낸다. 그래서 둘 다 쓰되 LLM 산출물은 URL 생존 + 본문 내 마감일 실재 확인을 통과해야만 공개되게 했다.

회원 기능은 1차에서 의도적으로 제외했다. 설계 문서, 작업 추적 3종, troubleshooting 분할 시스템을 배치했다.
