// PLAN 12번 확인: 입력(프로토콜·직접 입력·CSV) → 묶음별 판정, 측정 번호 중복, 표시 이름표
import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/analyze";
import { assignDirectIds, findDuplicateMeasurementIds, isBlankDirect } from "@/lib/groupMeasurements";
import { fmt3 } from "@/lib/format";
import { format3, formatSigned, reasonKo, REASON_KO } from "@/lib/labels";
import { SAMPLE_EXPECTED, SAMPLE_MEASUREMENTS, SAMPLE_PROTOCOLS } from "@/lib/sampleData";
import type { DirectEntry, Measurement, ProtocolInput } from "@/lib/types";

const P_A: ProtocolInput = { protocolId: "P-A", sem: "0.40", swc: "1.20", plausibleMin: "5", plausibleMax: "100" };
const d = (athleteId: string, session: string, value: string, over: Partial<DirectEntry> = {}): DirectEntry => ({
  athleteId,
  athleteLabel: "",
  protocolId: "P-A",
  session,
  sessionDate: "",
  value,
  ...over,
});
const csv = (id: string, athleteId: string, session: string, value: string, protocolId = "P-A"): Measurement => ({
  measurementId: id,
  athleteId,
  protocolId,
  session,
  value,
});

describe("예시 데이터를 분석하면 기대 결과 14건과 같다", () => {
  // 예시 측정값을 CSV 로 들어온 기록처럼 넣는다.
  const a = analyze(SAMPLE_PROTOCOLS, [], SAMPLE_MEASUREMENTS);

  it("묶음 14개, 프로토콜 설정 오류 없음", () => {
    expect(a.bundles).toHaveLength(14);
    expect(a.registryErrors).toEqual([]);
    expect(a.measurementCount).toBe(28);
  });

  for (const x of SAMPLE_EXPECTED) {
    it(`${x.caseId}`, () => {
      const b = a.bundles.find((v) => v.athleteId === x.athleteId && v.protocolId === x.protocolId)!;
      expect(b).toBeDefined();
      expect([
        b.judge.recordStatus,
        b.judge.reason,
        fmt3(b.judge.change),
        fmt3(b.judge.mdc),
        b.judge.mdcStatus,
        b.judge.swcStatus,
        b.judge.sensitivity,
      ]).toEqual([x.recordStatus, x.reason, x.change, x.mdc, x.mdcStatus, x.swcStatus, x.sensitivity]);
    });
  }

  it("표시명·이전·현재 값·SWC", () => {
    const t01 = a.bundles.find((b) => b.athleteId === "A01")!;
    expect(t01).toMatchObject({ athleteLabel: "가상선수 01", baselineText: "40.00", currentText: "42.00", swc: 1.2 });
    const t08 = a.bundles.find((b) => b.athleteId === "A08")!;
    expect(t08).toMatchObject({ baselineText: "40.00", currentText: "" });
    expect(a.bundles.find((b) => b.athleteId === "A13")!.swc).toBeNull(); // 등록되지 않은 프로토콜
    expect(a.bundles.find((b) => b.athleteId === "A14")!.swc).toBeNull(); // SWC 미설정
  });
});

describe("직접 입력 기록 분석", () => {
  it("직접 입력만으로 판정한다", () => {
    const a = analyze([P_A], [d("A1", "BASELINE", "40"), d("A1", "CURRENT", "42")], []);
    expect(a.bundles).toHaveLength(1);
    expect(a.bundles[0].judge.recordStatus).toBe("OK");
    expect(a.bundles[0].judge.mdcStatus).toBe("ABOVE_MDC_INCREASE");
  });
  it("SEM 을 바꾸면 같은 기록의 판정이 바뀐다 (T02)", () => {
    const rows = [d("A2", "BASELINE", "40.00"), d("A2", "CURRENT", "42.00")];
    const before = analyze([{ ...P_A, sem: "1.00" }], rows, []).bundles[0].judge;
    const after = analyze([{ ...P_A, sem: "0.40" }], rows, []).bundles[0].judge;
    expect(before.mdcStatus).toBe("WITHIN_MDC");
    expect(after.mdcStatus).toBe("ABOVE_MDC_INCREASE");
  });
  it("완전히 빈 행(추가만 하고 비워 둔 행)은 분석하지 않는다", () => {
    const empty = d("", "BASELINE", "", { protocolId: "" });
    const a = analyze([P_A], [empty, d("A1", "BASELINE", "40"), d("A1", "CURRENT", "42")], []);
    expect(a.bundles).toHaveLength(1);
    expect(a.measurementCount).toBe(2);
  });
  it("값만 비어 있고 다른 칸이 채워진 행은 분석에 넣는다 (NON_NUMERIC)", () => {
    const a = analyze([P_A], [d("A1", "BASELINE", "40"), d("A1", "CURRENT", "")], []);
    expect(a.bundles[0].judge.reason).toBe("NON_NUMERIC");
  });
  it("기록이 하나도 없으면 묶음 없음", () => {
    expect(analyze([P_A], [], []).bundles).toEqual([]);
  });
});

describe("CSV 와 직접 입력을 함께 분석", () => {
  it("같은 선수·프로토콜의 기록은 한 묶음으로 합친다", () => {
    const a = analyze([P_A], [d("A1", "CURRENT", "42")], [csv("M1", "A1", "BASELINE", "40")]);
    expect(a.bundles).toHaveLength(1);
    expect(a.bundles[0].judge.recordStatus).toBe("OK");
  });
  it("CSV 에 BASELINE 이 있는데 직접 입력도 BASELINE 이면 DUPLICATE_SESSION", () => {
    const a = analyze(
      [P_A],
      [d("A1", "BASELINE", "41"), d("A1", "CURRENT", "42")],
      [csv("M1", "A1", "BASELINE", "40")],
    );
    expect(a.bundles[0].judge.reason).toBe("DUPLICATE_SESSION");
  });
  it("직접 입력 번호는 CSV 의 DIRECT-1 과 겹치지 않게 건너뛴다", () => {
    const ms = assignDirectIds([d("A1", "BASELINE", "40"), d("A1", "CURRENT", "42")], [csv("DIRECT-1", "A9", "BASELINE", "40")]);
    expect(ms.map((m) => m.measurementId)).toEqual(["DIRECT-2", "DIRECT-3"]);
  });
  it("그래서 CSV 에 DIRECT-1 이 있어도 중복 오류가 생기지 않는다", () => {
    const a = analyze(
      [P_A],
      [d("A1", "BASELINE", "40"), d("A1", "CURRENT", "42")],
      [csv("DIRECT-1", "A9", "BASELINE", "40"), csv("DIRECT-2", "A9", "CURRENT", "42")],
    );
    expect(a.bundles.find((b) => b.athleteId === "A1")!.judge.recordStatus).toBe("OK");
  });
});

describe("측정 번호(measurement_id) 중복 (r5 에 없는 PRD 확정 검사, 최우선)", () => {
  it("findDuplicateMeasurementIds: 빈칸은 검사하지 않고 앞뒤 공백은 같은 번호로 본다", () => {
    const dup = findDuplicateMeasurementIds([
      csv("M1", "A", "BASELINE", "1"),
      csv(" M1 ", "A", "CURRENT", "1"),
      csv("", "B", "BASELINE", "1"),
      csv("  ", "B", "CURRENT", "1"),
    ]);
    expect([...dup]).toEqual(["M1"]);
  });
  it("그 번호가 들어 있는 묶음만 DUPLICATE_MEASUREMENT_ID, 다른 묶음은 정상", () => {
    const a = analyze(
      [P_A],
      [],
      [
        csv("M1", "A1", "BASELINE", "40"),
        csv("M1", "A1", "CURRENT", "42"), // 번호 중복
        csv("M3", "A2", "BASELINE", "40"),
        csv("M4", "A2", "CURRENT", "42"),
      ],
    );
    expect(a.bundles.find((b) => b.athleteId === "A1")!.judge).toMatchObject({
      recordStatus: "DATA_ERROR",
      reason: "DUPLICATE_MEASUREMENT_ID",
      change: null,
      mdcStatus: "NOT_ASSESSED",
      swcStatus: "NOT_ASSESSED",
    });
    expect(a.bundles.find((b) => b.athleteId === "A2")!.judge.recordStatus).toBe("OK");
  });
  it("번호가 다른 묶음에 걸쳐 중복되면 두 묶음 모두 오류", () => {
    const a = analyze(
      [P_A],
      [],
      [csv("M1", "A1", "BASELINE", "40"), csv("M1", "A2", "BASELINE", "40"), csv("M2", "A1", "CURRENT", "42"), csv("M3", "A2", "CURRENT", "42")],
    );
    expect(a.bundles.map((b) => b.judge.reason)).toEqual(["DUPLICATE_MEASUREMENT_ID", "DUPLICATE_MEASUREMENT_ID"]);
  });
  it("프로토콜 속성(MDC95·민감도)은 그대로 알려 준다", () => {
    const a = analyze([P_A], [], [csv("M1", "A1", "BASELINE", "40"), csv("M1", "A1", "CURRENT", "42")]);
    expect(a.bundles[0].judge.mdc).toBeCloseTo(1.10874, 4);
    expect(a.bundles[0].judge.sensitivity).toBe("CAN_DETECT_SWC");
  });
  it("미등록 프로토콜이어도 번호 중복이 먼저 보고된다 (검사 순서 0번)", () => {
    const a = analyze([], [], [csv("M1", "A1", "BASELINE", "40"), csv("M1", "A1", "CURRENT", "42")]);
    expect(a.bundles[0].judge.reason).toBe("DUPLICATE_MEASUREMENT_ID");
  });
});

describe("프로토콜 설정 오류와 이름 규칙", () => {
  it("측정 기록의 protocol_id 는 공백을 지우지 않는다: ' P-A' 는 미등록", () => {
    const a = analyze([P_A], [], [csv("M1", "A1", "BASELINE", "40", " P-A"), csv("M2", "A1", "CURRENT", "42", " P-A")]);
    expect(a.bundles[0].judge.reason).toBe("UNKNOWN_PROTOCOL");
  });
  it("프로토콜 설정의 이름은 공백을 지우고 등록한다", () => {
    const a = analyze([{ ...P_A, protocolId: " P-A " }], [d("A1", "BASELINE", "40"), d("A1", "CURRENT", "42")], []);
    expect(a.bundles[0].judge.recordStatus).toBe("OK");
  });
  it("이름이 중복된 프로토콜은 둘 다 쓰지 않는다: 기록은 UNKNOWN_PROTOCOL, 오류 목록에 둘 다", () => {
    const a = analyze([P_A, { ...P_A, sem: "1.00" }], [d("A1", "BASELINE", "40"), d("A1", "CURRENT", "42")], []);
    expect(a.registryErrors).toHaveLength(2);
    expect(a.bundles[0].judge.reason).toBe("UNKNOWN_PROTOCOL");
    expect(a.bundles[0].judge.mdc).toBeNull();
  });
  it("허용 범위가 잘못된 프로토콜의 기록은 UNKNOWN_PROTOCOL", () => {
    const a = analyze([{ ...P_A, plausibleMax: "abc" }], [d("A1", "BASELINE", "40"), d("A1", "CURRENT", "42")], []);
    expect(a.registryErrors).toHaveLength(1);
    expect(a.bundles[0].judge.reason).toBe("UNKNOWN_PROTOCOL");
  });
});

describe("표시명", () => {
  it("묶음 안에서 처음 나온 비어 있지 않은 표시명을 쓴다", () => {
    const a = analyze(
      [P_A],
      [d("A1", "BASELINE", "40", { athleteLabel: " " }), d("A1", "CURRENT", "42", { athleteLabel: "홍길동" })],
      [],
    );
    expect(a.bundles[0].athleteLabel).toBe("홍길동");
  });
  it("표시명이 없으면 선수 ID", () => {
    expect(analyze([P_A], [d("A1", "BASELINE", "40")], []).bundles[0].athleteLabel).toBe("A1");
  });
  it("isBlankDirect: 세션 기본값은 보지 않는다", () => {
    expect(isBlankDirect(d("", "BASELINE", "", { protocolId: "" }))).toBe(true);
    expect(isBlankDirect(d("", "CURRENT", "", { protocolId: "" }))).toBe(true);
    expect(isBlankDirect(d("", "BASELINE", "40", { protocolId: "" }))).toBe(false);
    expect(isBlankDirect(d("", "BASELINE", "", { protocolId: "P-A" }))).toBe(false);
  });
});

describe("labels: 표시 규칙", () => {
  it("변화량은 부호와 소수 셋째 자리", () => {
    expect(formatSigned(2)).toBe("+2.000");
    expect(formatSigned(-1.8000000000000007)).toBe("−1.800");
    expect(formatSigned(0)).toBe("0.000");
    expect(formatSigned(null)).toBe("—");
  });
  it("MDC95 는 부호 없이", () => {
    expect(format3(1.10874)).toBe("1.109");
    expect(format3(null)).toBe("—");
  });
  it("기록 오류 사유 한글 (r5 REASON_KO 원문)", () => {
    expect(reasonKo("OUT_OF_RANGE")).toBe("허용 범위를 벗어난 측정값");
    expect(reasonKo("UNKNOWN_PROTOCOL")).toBe("등록되지 않은 측정 방식");
    expect(reasonKo("DUPLICATE_MEASUREMENT_ID")).toBe("같은 측정 번호(measurement_id)가 중복됨");
    expect(reasonKo("")).toBe("");
    expect(Object.keys(REASON_KO)).toHaveLength(7);
  });
  it("기준 누락 사유도 한글", () => {
    expect(reasonKo("SEM_MISSING")).not.toBe("SEM_MISSING");
    expect(reasonKo("SEM_SWC_MISSING")).toMatch(/모두/);
  });
});
