// PLAN 10번 확인: 화면 ①에 보여 줄 값 (MDC95, 민감도, 안내, 경고)
import { describe, expect, it } from "vitest";
import { buildProtocolViews, criterionStatus } from "@/lib/protocolView";
import type { ProtocolInput } from "@/lib/types";

const row = (over: Partial<ProtocolInput> = {}): ProtocolInput => ({
  protocolId: "P-A",
  sem: "0.40",
  semSource: "가상 근거",
  swc: "1.20",
  swcBasis: "가상 근거",
  plausibleMin: "5",
  plausibleMax: "100",
  ...over,
});

describe("criterionStatus", () => {
  const cases: [string | null | undefined, string][] = [
    ["0.40", "OK"],
    [" 0.40 ", "OK"],
    ["", "EMPTY"],
    ["   ", "EMPTY"],
    [null, "EMPTY"],
    [undefined, "EMPTY"],
    ["abc", "NOT_NUMBER"],
    ["Infinity", "NOT_NUMBER"],
    ["4e1", "NOT_NUMBER"],
    ["0.4cm", "NOT_NUMBER"],
    ["0", "NON_POSITIVE"],
    ["-1", "NON_POSITIVE"],
  ];
  for (const [text, want] of cases) {
    it(`${JSON.stringify(text)} → ${want}`, () => expect(criterionStatus(text)).toBe(want));
  }
});

describe("buildProtocolViews: MDC95·민감도", () => {
  it("P-A: MDC95 1.109, 감지 가능", () => {
    const [v] = buildProtocolViews([row()]);
    expect(v.error).toBeNull();
    expect(v.mdc).toBeCloseTo(1.10874, 4);
    expect(v.sensitivity).toBe("CAN_DETECT_SWC");
  });
  it("P-B: MDC95 2.772, 감지 불가", () => {
    const [v] = buildProtocolViews([row({ sem: "1.00" })]);
    expect(v.mdc).toBeCloseTo(2.77186, 4);
    expect(v.sensitivity).toBe("CANNOT_DETECT_SWC");
  });
  it("SEM 없음: MDC95 없음, 판단 보류", () => {
    const [v] = buildProtocolViews([row({ sem: "" })]);
    expect(v.mdc).toBeNull();
    expect(v.sensitivity).toBe("NOT_ASSESSED");
    expect(v.sem).toBe("EMPTY");
  });
  it("SWC 없음: MDC95 는 있고 판단 보류", () => {
    const [v] = buildProtocolViews([row({ swc: "" })]);
    expect(v.mdc).not.toBeNull();
    expect(v.sensitivity).toBe("NOT_ASSESSED");
  });
  it("SEM 을 바꾸면 값이 바로 달라진다", () => {
    const before = buildProtocolViews([row({ sem: "1.00" })])[0];
    const after = buildProtocolViews([row({ sem: "0.40" })])[0];
    expect(before.sensitivity).toBe("CANNOT_DETECT_SWC");
    expect(after.sensitivity).toBe("CAN_DETECT_SWC");
  });
  it("입력 줄과 같은 순서로 돌려준다", () => {
    const views = buildProtocolViews([row({ sem: "1.00" }), row({ protocolId: "P-B" })]);
    expect(views).toHaveLength(2);
    expect(views[0].sensitivity).toBe("CANNOT_DETECT_SWC");
    expect(views[1].sensitivity).toBe("CAN_DETECT_SWC");
  });
  it("줄이 없으면 빈 목록", () => expect(buildProtocolViews([])).toEqual([]));
});

describe("buildProtocolViews: 사용할 수 없는 설정", () => {
  it("이름 빈칸", () => {
    const [v] = buildProtocolViews([row({ protocolId: " " })]);
    expect(v.error).toMatch(/비어/);
    expect(v.mdc).toBeNull();
    expect(v.sensitivity).toBe("NOT_ASSESSED");
  });
  it("이름 중복: 두 줄 모두 오류, MDC95·민감도 보여 주지 않음", () => {
    const views = buildProtocolViews([row(), row({ sem: "1.00" })]);
    for (const v of views) {
      expect(v.error).toMatch(/중복/);
      expect(v.mdc).toBeNull();
      expect(v.sensitivity).toBe("NOT_ASSESSED");
    }
  });
  it("허용 범위 오류: 그 줄만 오류", () => {
    const views = buildProtocolViews([row(), row({ protocolId: "P-B", plausibleMax: "abc" })]);
    expect(views[0].error).toBeNull();
    expect(views[1].error).toMatch(/허용 범위/);
    expect(views[1].mdc).toBeNull();
  });
  it("허용 범위 최솟값 ≥ 최댓값", () => {
    expect(buildProtocolViews([row({ plausibleMin: "100", plausibleMax: "5" })])[0].error).not.toBeNull();
  });
});

describe("buildProtocolViews: 근거 칸 경고", () => {
  it("값이 있는데 근거가 비면 경고", () => {
    const [v] = buildProtocolViews([row({ semSource: "", swcBasis: "  " })]);
    expect(v.semSourceMissing).toBe(true);
    expect(v.swcBasisMissing).toBe(true);
    expect(v.sensitivity).toBe("CAN_DETECT_SWC"); // 경고는 판정에 영향이 없다
  });
  it("근거가 있으면 경고 없음", () => {
    const [v] = buildProtocolViews([row()]);
    expect(v.semSourceMissing).toBe(false);
    expect(v.swcBasisMissing).toBe(false);
  });
  it("값 자체가 비어 있으면 근거 경고는 하지 않는다", () => {
    const [v] = buildProtocolViews([row({ sem: "", semSource: "", swc: "", swcBasis: undefined })]);
    expect(v.semSourceMissing).toBe(false);
    expect(v.swcBasisMissing).toBe(false);
  });
  it("근거 칸을 아예 안 만든 줄(undefined)도 경고", () => {
    const [v] = buildProtocolViews([row({ semSource: undefined })]);
    expect(v.semSourceMissing).toBe(true);
  });
});
