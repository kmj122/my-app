// 화면 ④ 선수 상세 그래프의 값 계산 (PLAN 13번)
// 0 을 가운데에 둔 수평선 위에 변화량(점), ±MDC95(음영 띠), ±SWC(점선)를 같은 눈금으로 그린다.
// 그릴 수 없는 요소(점·띠·점선)는 생략하고 이유를 알려 준다. 화면 코드와 분리해 테스트할 수 있다.
import type { BundleResult } from "./analyze";
import { reasonKo } from "./labels";

export const CHART_WIDTH = 600;
export const CHART_HEIGHT = 190;
/** 0 의 x 좌표(가운데)와 한쪽 반폭 */
export const CHART_CENTER_X = 300;
export const CHART_HALF_WIDTH = 250;

export interface DetailChart {
  /** 눈금의 한쪽 끝 값 (-limit ~ +limit) */
  limit: number;
  /** 값 → x 좌표 */
  x: (value: number) => number;
  /** 그릴 수 있는 요소의 값 (없으면 null = 생략) */
  change: number | null;
  mdc: number | null;
  swc: number | null;
  /** 생략한 요소의 이유 (한글) */
  omitted: string[];
}

/** 가장 큰 절댓값에 여유를 더해 눈금 끝을 정한다. 값이 하나도 없거나 모두 0 이면 1. */
export function chartLimit(values: (number | null)[]): number {
  const max = Math.max(0, ...values.filter((v): v is number => v !== null).map(Math.abs));
  return max > 0 ? max * 1.25 : 1;
}

export function buildDetailChart(b: BundleResult): DetailChart {
  const { change, mdc } = b.judge;
  const swc = b.swc;
  const limit = chartLimit([change, mdc, swc]);

  const omitted: string[] = [];
  if (change === null) {
    const why = reasonKo(b.judge.reason);
    omitted.push(`변화량을 계산할 수 없어 점을 그리지 않았습니다${why ? ` (${why})` : ""}.`);
  }
  if (mdc === null) omitted.push("측정 오차(SEM)가 없어 ±MDC95 띠를 그리지 않았습니다.");
  if (swc === null) omitted.push("중요 변화 기준(SWC)이 없어 ±SWC 점선을 그리지 않았습니다.");

  return {
    limit,
    x: (value) => CHART_CENTER_X + (value / limit) * CHART_HALF_WIDTH,
    change,
    mdc,
    swc,
    omitted,
  };
}
