// PLAN 6번 확인: 기록 오류 검사와 SEM·SWC 보류 처리
// (검증 자료 CSV의 14건·단위 11건 전체 대조는 PLAN 7번에서 한다.)
import { describe, expect, it } from "vitest";
import { buildProtocol, judge, ProtocolConfigError } from "@/lib/judge";
import type { JudgeRow, ProtocolInput } from "@/lib/types";

function proto(over: Partial<ProtocolInput> = {}) {
  return buildProtocol({
    protocolId: "P-A",
    sem: "0.40",
    swc: "1.20",
    plausibleMin: "5",
    plausibleMax: "100",
    ...over,
  });
}
const base = (value: string): JudgeRow => ({ session: "BASELINE", value });
const cur = (value: string): JudgeRow => ({ session: "CURRENT", value });

describe("buildProtocol: SEM·SWC 보류와 MDC95·민감도", () => {
  it("정상 값: MDC95 1.109, 감지 가능", () => {
    const p = proto();
    expect(p.mdc).toBeCloseTo(1.10874, 4);
    expect(p.sensitivity).toBe("CAN_DETECT_SWC");
  });
  it("SEM 1.00: MDC95 2.772, 감지 불가", () => {
    const p = proto({ sem: "1.00" });
    expect(p.mdc).toBeCloseTo(2.77186, 4);
    expect(p.sensitivity).toBe("CANNOT_DETECT_SWC");
  });
  for (const bad of ["", " ", "abc", "Infinity", "0", "-1", "4e1", "0.4cm"]) {
    it(`SEM ${JSON.stringify(bad)} → 없음, MDC95·민감도 판단 안 함`, () => {
      const p = proto({ sem: bad });
      expect(p.sem).toBeNull();
      expect(p.mdc).toBeNull();
      expect(p.sensitivity).toBe("NOT_ASSESSED");
    });
  }
  it("SWC 가 없으면 MDC95 는 있고 민감도는 판단 안 함", () => {
    const p = proto({ swc: "" });
    expect(p.swc).toBeNull();
    expect(p.mdc).not.toBeNull();
    expect(p.sensitivity).toBe("NOT_ASSESSED");
  });
  it("앞뒤 공백이 있는 SEM 은 인정", () => {
    expect(proto({ sem: " 0.40 " }).sem).toBe(0.4);
  });
  it("프로토콜 이름의 앞뒤 공백은 지운다", () => {
    expect(proto({ protocolId: " P-A " }).protocolId).toBe("P-A");
  });
});

describe("buildProtocol: 허용 범위 오류", () => {
  const cases: [string, Partial<ProtocolInput>][] = [
    ["최솟값이 숫자가 아님", { plausibleMin: "abc" }],
    ["최댓값이 숫자가 아님", { plausibleMax: "" }],
    ["최솟값 = 최댓값", { plausibleMin: "50", plausibleMax: "50" }],
    ["최솟값 > 최댓값", { plausibleMin: "100", plausibleMax: "5" }],
  ];
  for (const [name, over] of cases) {
    it(name, () => {
      expect(() => proto(over)).toThrow(ProtocolConfigError);
    });
  }
});

describe("judge: 기록 오류는 그 묶음만 중단", () => {
  it("UNKNOWN_PROTOCOL: 프로토콜 없음 (MDC95·민감도도 없음)", () => {
    const r = judge([base("40"), cur("42")], undefined);
    expect(r).toMatchObject({
      recordStatus: "DATA_ERROR",
      reason: "UNKNOWN_PROTOCOL",
      change: null,
      mdc: null,
      mdcStatus: "NOT_ASSESSED",
      swcStatus: "NOT_ASSESSED",
      sensitivity: "NOT_ASSESSED",
    });
  });

  it("기록 오류여도 프로토콜의 MDC95·민감도는 알려 준다", () => {
    const r = judge([base("40")], proto());
    expect(r.reason).toBe("MISSING_SESSION");
    expect(r.mdc).toBeCloseTo(1.10874, 4);
    expect(r.sensitivity).toBe("CAN_DETECT_SWC");
    expect(r.change).toBeNull();
    expect(r.mdcStatus).toBe("NOT_ASSESSED");
    expect(r.swcStatus).toBe("NOT_ASSESSED");
  });

  it("INVALID_SESSION: 'MID' 행이 섞임", () => {
    const r = judge([base("40"), cur("42"), { session: "MID", value: "41" }], proto());
    expect(r.reason).toBe("INVALID_SESSION");
  });
  it("INVALID_SESSION: 소문자 baseline 은 MISSING 이 아니라 INVALID", () => {
    const r = judge([{ session: "baseline", value: "40" }, cur("42")], proto());
    expect(r.reason).toBe("INVALID_SESSION");
  });

  it("MISSING_SESSION: CURRENT 없음", () => {
    expect(judge([base("40")], proto()).reason).toBe("MISSING_SESSION");
  });
  it("MISSING_SESSION: BASELINE 없음", () => {
    expect(judge([cur("42")], proto()).reason).toBe("MISSING_SESSION");
  });
  it("MISSING_SESSION: 기록이 하나도 없음", () => {
    expect(judge([], proto()).reason).toBe("MISSING_SESSION");
  });

  it("DUPLICATE_SESSION: BASELINE 2건 (T11)", () => {
    expect(judge([base("40"), base("41"), cur("42")], proto()).reason).toBe("DUPLICATE_SESSION");
  });
  it("DUPLICATE_SESSION: 값이 같아도 오류", () => {
    expect(judge([base("40"), base("40"), cur("42")], proto()).reason).toBe("DUPLICATE_SESSION");
  });
  it("DUPLICATE_SESSION: CURRENT 2건", () => {
    expect(judge([base("40"), cur("42"), cur("43")], proto()).reason).toBe("DUPLICATE_SESSION");
  });

  for (const bad of ["측정실패", "4e1", "1,000", "Infinity", "NaN", "", "  "]) {
    it(`NON_NUMERIC: 값 ${JSON.stringify(bad)}`, () => {
      expect(judge([base("40"), cur(bad)], proto()).reason).toBe("NON_NUMERIC");
      expect(judge([base(bad), cur("42")], proto()).reason).toBe("NON_NUMERIC");
    });
  }

  it("OUT_OF_RANGE: 420 (T09)", () => {
    expect(judge([base("40"), cur("420")], proto()).reason).toBe("OUT_OF_RANGE");
  });
  it("OUT_OF_RANGE: 최솟값 바로 아래 4.99", () => {
    expect(judge([base("4.99"), cur("42")], proto()).reason).toBe("OUT_OF_RANGE");
  });
  it("범위 경계값 5 와 100 은 허용", () => {
    expect(judge([base("5"), cur("100")], proto()).recordStatus).toBe("OK");
  });
});

describe("judge: 검사 순서는 앞 단계가 우선", () => {
  it("프로토콜 없음 > 세션 이름 오류", () => {
    expect(judge([{ session: "MID", value: "40" }], undefined).reason).toBe("UNKNOWN_PROTOCOL");
  });
  it("세션 이름 오류 > 세션 누락", () => {
    expect(judge([{ session: "MID", value: "40" }], proto()).reason).toBe("INVALID_SESSION");
  });
  it("중복 세션 > 숫자 아님", () => {
    expect(judge([base("abc"), base("41"), cur("42")], proto()).reason).toBe("DUPLICATE_SESSION");
  });
  it("숫자 아님 > 허용 범위 밖", () => {
    expect(judge([base("abc"), cur("420")], proto()).reason).toBe("NON_NUMERIC");
  });
  it("기록 오류 > 기준 누락 (SEM 없어도 DATA_ERROR)", () => {
    const r = judge([base("40")], proto({ sem: "" }));
    expect(r.recordStatus).toBe("DATA_ERROR");
    expect(r.reason).toBe("MISSING_SESSION");
  });
});

describe("judge: SEM·SWC 가 없으면 그 기준 판정만 보류", () => {
  it("SEM 없음 (T10): 실용 판정은 수행", () => {
    const r = judge([base("40.00"), cur("42.00")], proto({ sem: "" }));
    expect(r).toMatchObject({
      recordStatus: "CRITERIA_MISSING",
      reason: "SEM_MISSING",
      mdc: null,
      mdcStatus: "NOT_ASSESSED",
      swcStatus: "MEETS_SWC_INCREASE",
      sensitivity: "NOT_ASSESSED",
    });
    expect(r.change).toBeCloseTo(2, 12);
  });
  it("SWC 없음 (T14): 오차 판정은 수행", () => {
    const r = judge([base("40.00"), cur("42.00")], proto({ swc: "" }));
    expect(r).toMatchObject({
      recordStatus: "CRITERIA_MISSING",
      reason: "SWC_MISSING",
      mdcStatus: "ABOVE_MDC_INCREASE",
      swcStatus: "NOT_ASSESSED",
      sensitivity: "NOT_ASSESSED",
    });
    expect(r.mdc).toBeCloseTo(1.10874, 4);
  });
  it("둘 다 없음 (U1): 두 판정·민감도 모두 보류, 변화량은 계산", () => {
    const r = judge([base("40"), cur("42")], proto({ sem: "", swc: "" }));
    expect(r).toMatchObject({
      recordStatus: "CRITERIA_MISSING",
      reason: "SEM_SWC_MISSING",
      mdc: null,
      mdcStatus: "NOT_ASSESSED",
      swcStatus: "NOT_ASSESSED",
      sensitivity: "NOT_ASSESSED",
    });
    expect(r.change).toBeCloseTo(2, 12);
  });
  for (const bad of ["abc", "Infinity", " ", "0"]) {
    it(`SEM ${JSON.stringify(bad)} (U7) → SEM_MISSING`, () => {
      const r = judge([base("40"), cur("42")], proto({ sem: bad }));
      expect(r.reason).toBe("SEM_MISSING");
    });
  }
});

describe("judge: 정상(OK) 묶음", () => {
  it("기준이 모두 있으면 OK, 사유는 빈 문자열", () => {
    const r = judge([base("40.00"), cur("42.00")], proto());
    expect(r).toMatchObject({
      recordStatus: "OK",
      reason: "",
      mdcStatus: "ABOVE_MDC_INCREASE",
      swcStatus: "MEETS_SWC_INCREASE",
      sensitivity: "CAN_DETECT_SWC",
    });
  });
  it("행 순서가 바뀌어도 같은 결과", () => {
    const r = judge([cur("43.20"), base("45.00")], proto());
    expect(r.change).toBeCloseTo(-1.8, 12);
    expect(r.mdcStatus).toBe("ABOVE_MDC_DECREASE");
    expect(r.swcStatus).toBe("MEETS_SWC_DECREASE");
  });
  it("앞뒤 공백이 있는 값 (U9) 은 숫자로 인정", () => {
    const r = judge([base("40"), cur(" 42.00 ")], proto());
    expect(r.recordStatus).toBe("OK");
    expect(r.change).toBeCloseTo(2, 12);
  });
});
