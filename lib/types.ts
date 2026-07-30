/** 소스가 긁어온 날것. 필드가 비어 있거나 표기가 제각각인 상태다. */
export type RawContest = {
  title: string;
  sourceUrl: string;
  organizer?: string | null;
  /** 원문 표기 그대로. "2026.8.31", "2026년 8월 31일", "상시모집" 등 */
  deadline?: string | null;
  startsAt?: string | null;
  prize?: string | null;
  target?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  /** LLM이 뱉은 자유 텍스트. mapCategories 로 slug 에 매핑한다 */
  category?: string[] | null;
};

export interface Source {
  name: string;
  collect(): Promise<RawContest[]>;
  /** LLM 산출물처럼 지어낼 여지가 있는 소스는 true */
  needsVerification: boolean;
}
