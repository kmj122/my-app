// PLAN 5번 확인: MDC95, 변화량, 두 기준 판정, 측정 민감도 (경계값 포함)
import { describe, expect, it } from "vitest";
import { change, judgeMdc, judgeSwc, mdc95, sensitivity } from "@/lib/criteria";

describe("mdc95: 1.96 × SEM × √2", () => {
  it("SEM 1.0 → 2.7718", () => {
    expect(mdc95(1)).toBeCloseTo(2.771859, 5);
  });
  it("SEM 0.5 → 1.3859", () => {
    expect(mdc95(0.5)).toBeCloseTo(1.385929, 5);
  });
  it("SEM 이 2배이면 MDC95 도 2배", () => {
    expect(mdc95(2)).toBeCloseTo(mdc95(1) * 2, 12);
  });
});

describe("change: 현재 − 이전 (부호 포함)", () => {
  it("증가는 +", () => expect(change(40, 42.5)).toBeCloseTo(2.5, 12));
  it("감소는 −", () => expect(change(40, 38)).toBe(-2));
  it("같으면 0", () => expect(change(40, 40)).toBe(0));
});

describe("judgeMdc: 엄격 비교(MDC95 와 같으면 오차 이내)", () => {
  const m = mdc95(0.5);
  it("MDC95 와 정확히 같으면 WITHIN_MDC", () => {
    expect(judgeMdc(m, m)).toBe("WITHIN_MDC");
    expect(judgeMdc(-m, m)).toBe("WITHIN_MDC");
  });
  it("MDC95 바로 아래는 WITHIN_MDC", () => {
    expect(judgeMdc(m - 1e-6, m)).toBe("WITHIN_MDC");
  });
  it("MDC95 바로 위는 증가/감소 구분해 초과", () => {
    expect(judgeMdc(m + 1e-6, m)).toBe("ABOVE_MDC_INCREASE");
    expect(judgeMdc(-(m + 1e-6), m)).toBe("ABOVE_MDC_DECREASE");
  });
  it("변화량 0 은 WITHIN_MDC", () => {
    expect(judgeMdc(0, m)).toBe("WITHIN_MDC");
  });
  it("1e-9 이내의 부동소수점 오차는 같은 값으로 본다", () => {
    expect(judgeMdc(m + 5e-10, m)).toBe("WITHIN_MDC");
  });
});

describe("judgeSwc: 포함 비교(SWC 와 같으면 충족)", () => {
  const swc = 1.5;
  it("SWC 와 정확히 같으면 충족", () => {
    expect(judgeSwc(1.5, swc)).toBe("MEETS_SWC_INCREASE");
    expect(judgeSwc(-1.5, swc)).toBe("MEETS_SWC_DECREASE");
  });
  it("SWC 바로 아래는 BELOW_SWC", () => {
    expect(judgeSwc(1.5 - 1e-6, swc)).toBe("BELOW_SWC");
    expect(judgeSwc(-(1.5 - 1e-6), swc)).toBe("BELOW_SWC");
  });
  it("SWC 바로 위는 충족", () => {
    expect(judgeSwc(1.5 + 1e-6, swc)).toBe("MEETS_SWC_INCREASE");
  });
  it("1e-9 이내의 부동소수점 오차는 같은 값으로 본다", () => {
    expect(judgeSwc(1.5 - 5e-10, swc)).toBe("MEETS_SWC_INCREASE");
  });
  it("변화량 0 은 BELOW_SWC", () => {
    expect(judgeSwc(0, swc)).toBe("BELOW_SWC");
  });
});

describe("sensitivity: MDC95 ≤ SWC 이면 감지 가능", () => {
  it("MDC95 < SWC → CAN_DETECT_SWC", () => {
    expect(sensitivity(1.0, 1.5)).toBe("CAN_DETECT_SWC");
  });
  it("MDC95 = SWC → CAN_DETECT_SWC (같으면 포함)", () => {
    expect(sensitivity(1.5, 1.5)).toBe("CAN_DETECT_SWC");
  });
  it("MDC95 > SWC → CANNOT_DETECT_SWC", () => {
    expect(sensitivity(1.6, 1.5)).toBe("CANNOT_DETECT_SWC");
  });
  it("SEM 이나 SWC 가 없으면 NOT_ASSESSED", () => {
    expect(sensitivity(null, 1.5)).toBe("NOT_ASSESSED");
    expect(sensitivity(1.0, null)).toBe("NOT_ASSESSED");
    expect(sensitivity(null, null)).toBe("NOT_ASSESSED");
  });
});
