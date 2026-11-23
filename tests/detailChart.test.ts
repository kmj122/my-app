// PLAN 13번 확인: 선수 상세 그래프 좌표와 생략 안내
import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/analyze";
import { buildDetailChart, CHART_CENTER_X, CHART_HALF_WIDTH, CHART_WIDTH, chartLimit } from "@/lib/detailChart";
import { SAMPLE_MEASUREMENTS, SAMPLE_PROTOCOLS } from "@/lib/sampleData";

const bundles = analyze(SAMPLE_PROTOCOLS, [], SAMPLE_MEASUREMENTS).bundles;
const chart = (athleteId: string) => buildDetailChart(bundles.find((b) => b.athleteId === athleteId)!);

describe("chartLimit", () => {
  it("가장 큰 절댓값의 1.25배", () => expect(chartLimit([2, 1.109, 1.2])).toBeCloseTo(2.5, 12));
  it("음수 변화량도 절댓값으로", () => expect(chartLimit([-1.8, 1.109])).toBeCloseTo(2.25, 12));
  it("null 은 무시", () => expect(chartLimit([null, 1.109, null])).toBeCloseTo(1.38625, 5));
  it("값이 없거나 모두 0 이면 1", () => {
    expect(chartLimit([])).toBe(1);
    expect(chartLimit([null, null])).toBe(1);
    expect(chartLimit([0])).toBe(1);
  });
});

describe("x 좌표", () => {
  it("0 은 가운데, ±limit 은 양끝", () => {
    const c = chart("A01");
    expect(c.x(0)).toBe(CHART_CENTER_X);
    expect(c.x(c.limit)).toBeCloseTo(CHART_CENTER_X + CHART_HALF_WIDTH, 9);
    expect(c.x(-c.limit)).toBeCloseTo(CHART_CENTER_X - CHART_HALF_WIDTH, 9);
  });
  it("그림 폭 안에 들어간다", () => {
    expect(CHART_CENTER_X + CHART_HALF_WIDTH).toBeLessThanOrEqual(CHART_WIDTH);
    expect(CHART_CENTER_X - CHART_HALF_WIDTH).toBeGreaterThanOrEqual(0);
  });
  it("값이 클수록 오른쪽 (단조 증가)", () => {
    const c = chart("A01");
    expect(c.x(1)).toBeGreaterThan(c.x(0));
    expect(c.x(-1)).toBeLessThan(c.x(0));
  });
  it("±MDC95 띠는 0 을 중심으로 좌우 대칭", () => {
    const c = chart("A01");
    expect(c.x(c.mdc!) - CHART_CENTER_X).toBeCloseTo(CHART_CENTER_X - c.x(-c.mdc!), 9);
  });
});

describe("요소가 모두 있는 사례", () => {
  it("T01: 점 +2.000, 띠 ±1.109, 점선 ±1.200, 생략 없음", () => {
    const c = chart("A01");
    expect(c.change).toBeCloseTo(2, 12);
    expect(c.mdc).toBeCloseTo(1.10874, 4);
    expect(c.swc).toBe(1.2);
    expect(c.omitted).toEqual([]);
  });
  it("T01: 변화량 점이 띠 바깥, T03 은 띠 안쪽", () => {
    const a = chart("A01");
    expect(a.x(a.change!)).toBeGreaterThan(a.x(a.mdc!));
    const b = chart("A03");
    expect(b.x(b.change!)).toBeLessThan(b.x(b.mdc!));
  });
  it("T04 감소: 점이 왼쪽", () => {
    const c = chart("A04");
    expect(c.x(c.change!)).toBeLessThan(CHART_CENTER_X);
  });
  it("T02: 점은 SWC 점선 바깥이지만 띠 안쪽 (측정 방식이 거친 사례)", () => {
    const c = chart("A02");
    expect(c.x(c.change!)).toBeGreaterThan(c.x(c.swc!));
    expect(c.x(c.change!)).toBeLessThan(c.x(c.mdc!));
  });
});

describe("그릴 수 없는 요소는 생략하고 이유를 알려 준다", () => {
  it("T08 CURRENT 없음: 점 생략(사유 표시), 띠·점선은 있음", () => {
    const c = chart("A08");
    expect(c.change).toBeNull();
    expect(c.mdc).not.toBeNull();
    expect(c.swc).toBe(1.2);
    expect(c.omitted).toHaveLength(1);
    expect(c.omitted[0]).toMatch(/이전 또는 현재 측정값 없음/);
  });
  it("T10 SEM 없음: 띠 생략, 점·점선은 있음", () => {
    const c = chart("A10");
    expect(c.mdc).toBeNull();
    expect(c.change).not.toBeNull();
    expect(c.omitted).toHaveLength(1);
    expect(c.omitted[0]).toMatch(/SEM/);
  });
  it("T14 SWC 없음: 점선 생략", () => {
    const c = chart("A14");
    expect(c.swc).toBeNull();
    expect(c.omitted).toHaveLength(1);
    expect(c.omitted[0]).toMatch(/SWC/);
  });
  it("T13 등록되지 않은 프로토콜: 점·띠·점선 모두 생략, 눈금은 기본값", () => {
    const c = chart("A13");
    expect([c.change, c.mdc, c.swc]).toEqual([null, null, null]);
    expect(c.omitted).toHaveLength(3);
    expect(c.limit).toBe(1);
  });
  it("T12 숫자가 아닌 값: 점 생략, 사유 표시", () => {
    expect(chart("A12").omitted[0]).toMatch(/숫자가 아닌 측정값/);
  });
});
