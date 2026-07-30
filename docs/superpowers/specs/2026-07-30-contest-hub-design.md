# contest-hub 설계 (2026-07-30)

인터넷에 흩어진 공모전을 자동으로 모아 한곳에서 보여주는 공개 웹사이트.

## 배경

사용자는 그동안 인스타그램 광고로만 공모전을 접했고, 공모전 전문 사이트(위비티·씽굿 등)의 존재를 몰랐다. 그래서 처음 구상은 "LLM에게 검색시켜 찾아오게 한다"였다.

이 사실이 수집 전략을 정했다. 애그리게이터 크롤링은 볼륨과 정확도를 싸게 주지만 롱테일(인스타·기업 자체 페이지에서만 홍보되는 소규모 공모전)을 놓친다. LLM 웹검색은 롱테일을 잡지만 건당 비용이 들고 존재하지 않는 공모전이나 틀린 마감일을 지어낸다. **둘 다 쓰되, LLM 산출물은 검증을 통과해야만 공개한다.**

## 범위

### 1차 (이번 구현)
수집 → DB → 목록/검색/필터 → Vercel 배포.

### 보류 (v2)
회원/로그인, 관심 공모전 저장, 마감 알림, 관리자 검수 화면, 위비티 외 크롤링 소스.

## 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js 16 App Router + TypeScript | Vercel 배포·Cron·서버 컴포넌트가 기본으로 붙는다 |
| DB | Neon Postgres (Vercel 마켓플레이스) | 마켓플레이스 연동이라 환경변수 설정이 자동 |
| DB 접근 | Drizzle ORM | 스키마·타입·마이그레이션이 파일 하나로 묶인다 |
| 스타일 | Tailwind | 목록/필터 화면에 컴포넌트 라이브러리까지는 불필요 |
| 크롤링 | cheerio | 정적 HTML 파싱에 충분 |
| LLM 검색 | AI SDK v6 + Vercel AI Gateway | 프로바이더 문자열만으로 모델 교체 가능 |

## 데이터 모델

테이블 하나로 간다. 소스별 테이블 분리는 지금 필요 없고 `source` 컬럼으로 충분하다.

```
contests
  id            serial primary key
  source        text      -- 'wevity' | 'llm-search'
  source_url    text not null
  title         text not null
  organizer     text
  category      text[]    -- 정규화된 분야 태그
  target        text      -- 응모 대상 (대학생, 일반인 등)
  prize         text      -- 총상금 원문 텍스트
  description   text
  thumbnail_url text
  starts_at     date
  deadline      date
  dedupe_key    text unique not null  -- 정규화 제목 + 마감일
  status        text not null         -- 'published' | 'pending' | 'expired'
  first_seen_at timestamptz not null
  updated_at    timestamptz not null
  verified_at   timestamptz
```

**`dedupe_key`**: 제목에서 공백·특수문자·괄호를 제거하고 소문자화한 값 + `deadline`. 같은 공모전이 두 소스에서 들어와도 한 행으로 합쳐진다.

**unique 제약은 `dedupe_key` 하나만 건다.** `source_url` 에도 unique를 걸면 같은 공모전을 크롤러와 LLM이 서로 다른 URL로 가져왔을 때 upsert가 깨진다 — `dedupe_key` 로 기존 행을 찾아 `source_url` 을 덮어쓰려는 순간 그 URL이 다른 행에 이미 있으면 제약 위반이 난다. 동일성의 단일 출처는 `dedupe_key` 다.

**`status`**
- `published` — 공개. 크롤러 산출물은 기본적으로 여기.
- `pending` — 검증 실패. 목록에 안 나온다. LLM 산출물이 검증을 통과하지 못하면 여기 남는다.
- `expired` — 마감 지남. 기본 목록에서 숨기되 토글로 볼 수 있다.

## 수집 파이프라인

소스는 플러그인이다. 소스 추가 = `sources/` 에 파일 하나 추가, 나머지 단계는 건드리지 않는다.

```
Source.collect() → RawContest[]
   ├ wevity     cheerio로 목록 페이지 순회 파싱
   └ llmSearch  AI SDK generateObject + 웹검색
        ↓
   normalize()  날짜 파싱, 분야 태그 매핑, 필드 트림, dedupe_key 생성
        ↓
   verify()     LLM 산출물만 해당
        ↓
   upsert by dedupe_key
```

### Source 인터페이스

```ts
interface Source {
  name: string
  collect(): Promise<RawContest[]>
  needsVerification: boolean
}
```

### verify() — 환각 방어

LLM이 찾아온 건은 다음을 모두 통과해야 `published`가 된다.

1. `source_url` 이 존재하고 HTTP 200으로 응답한다.
2. 응답 본문 텍스트에 파싱된 `deadline` 이 실제로 등장한다 (여러 날짜 표기 형식을 시도).

하나라도 실패하면 `pending`으로 저장하고 공개하지 않는다. 크롤러 산출물은 원본 페이지에서 직접 뽑은 값이므로 검증을 건너뛴다.

### 충돌 규칙

같은 `dedupe_key` 가 이미 있으면 **크롤러 소스가 LLM 소스를 이긴다**. 크롤러 값은 원문 그대로이고 LLM 값은 요약·재구성을 거쳤기 때문이다. 같은 소스끼리 충돌하면 나중 값으로 갱신한다.

## 실행

`/api/cron/ingest` 를 Vercel Cron으로 **하루 1회**.

- 위비티 크롤러: 매일 전량 순회
- LLM 검색: 매일 질의 **5개**. 질의문은 코드에 상수로 두고 손으로 조정한다 (예: "2026년 대학생 공모전 모집", "기업 디자인 공모전 접수중"). 비용이 여기서 결정되므로 자동 확장하지 않는다
- 같은 잡에서 `deadline < 오늘` 인 건을 `expired` 처리

### 크롤링 예의

위비티의 `robots.txt` 와 이용약관을 구현 전에 확인한다. 요청 간격은 초당 1회 이하로 두고 User-Agent에 연락 가능한 식별자를 넣는다. 차단되거나 약관상 문제가 있으면 그 소스를 끄고 LLM 검색 비중을 올린다.

## 화면 (1차)

| 경로 | 내용 |
|---|---|
| `/` | 카드 그리드 목록. 기본 정렬 **마감 임박순**. 검색(제목·주최), 분야 필터, 마감 지난 것 보기 토글. 페이지네이션 |
| `/contest/[id]` | 상세. 원문 링크 버튼이 주 역할 |

무한스크롤 대신 페이지네이션을 쓴다 — 서버 컴포넌트에서 쿼리 파라미터로 끝나고 클라이언트 상태가 필요 없다.

## 테스트

정규화·중복제거·날짜 파싱·검증 로직에 테스트를 **먼저** 쓴다.

- 실제 위비티 목록 페이지 HTML 한 장을 픽스처로 저장해 파서 테스트에 쓴다
- `verify()` 는 fetch를 주입받게 만들어 네트워크 없이 테스트한다
- 테스트에서 실제 네트워크를 타지 않는다

UI는 테스트하지 않는다. 목록 렌더링에 회귀 테스트를 붙일 만큼의 로직이 없다.

## 열린 질문

- Vercel AI Gateway가 웹검색 도구를 어떤 형태로 노출하는지는 구현 시점에 문서로 확인한다. 지원 형태에 따라 프로바이더 직결로 바뀔 수 있다.
- 분야 태그 목록은 위비티 카테고리를 먼저 그대로 쓰고, LLM 산출물을 그 목록에 매핑한다. 목록 자체의 재설계는 1차 범위 밖이다.
