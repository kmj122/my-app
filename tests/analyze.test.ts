// 분석 통합 테스트 (r5에 없는 추가 검사): measurement_id 중복 → 해당 묶음만 데이터 오류, 직접 입력 ID 충돌 방지
import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/analyze";
import type { DirectRow, Measurement, ProtocolInput } from "@/lib/types";

const protocols: ProtocolInput[] = [
  { uid: "p1", protocolId: "P-A", sem: "0.40", swc: "1.20", plausibleMin: "5", plausibleMax: "100" },
];

function csv(id: string, athlete: string, session: string, value: string): Measurement {
  return { measurementId: id, athleteId: athlete, athleteLabel: "", protocolId: "P-A", session, sessionDate: "", value, source: "csv" };
}

function direct(athlete: string, session: string, value: string): DirectRow {
  return { uid: `${athlete}-${session}`, athleteId: athlete, athleteLabel: "", protocolId: "P-A", session, sessionDate: "", value };
}

describe("분석 (analyze)", () => {
  it("정상 기록은 판정한다", () => {
    const a = analyze(protocols, [], [csv("M1", "A01", "BASELINE", "40"), csv("M2", "A01", "CURRENT", "42")]);
    expect(a.bundles).toHaveLength(1);
    expect(a.bundles[0].judge).toMatchObject({ recordStatus: "OK", mdcStatus: "ABOVE_MDC_INCREASE", swcStatus: "MEETS_SWC_INCREASE" });
  });

  it("measurement_id가 중복되면 관련 묶음을 모두 DUPLICATE_MEASUREMENT_ID 오류로 처리하고 나머지 묶음은 정상 분석한다", () => {
    const a = analyze(protocols, [], [
      csv("M1", "A01", "BASELINE", "40"),
      csv("M2", "A01", "CURRENT", "42"),
      csv("M3", "A02", "BASELINE", "40"),
      csv("M1", "A02", "CURRENT", "42"), // M1 중복: A01 묶음과 A02 묶음이 모두 걸린다
      csv("M5", "A03", "BASELINE", "40"),
      csv("M6", "A03", "CURRENT", "40.5"),
    ]);
    const byAthlete = Object.fromEntries(a.bundles.map((b) => [b.athleteId, b.judge]));
    expect(byAthlete["A01"]).toMatchObject({ recordStatus: "DATA_ERROR", reason: "DUPLICATE_MEASUREMENT_ID", change: null });
    expect(byAthlete["A02"]).toMatchObject({ recordStatus: "DATA_ERROR", reason: "DUPLICATE_MEASUREMENT_ID" });
    expect(byAthlete["A03"]).toMatchObject({ recordStatus: "OK" });
  });

  it("직접 입력 행은 CSV의 DIRECT-1 과 충돌하지 않고, 아직 채우지 않은 빈 행은 분석하지 않는다", () => {
    const a = analyze(
      protocols,
      [
        direct("A01", "BASELINE", "40"),
        direct("A01", "CURRENT", "42"),
        { ...direct("", "BASELINE", ""), uid: "blank", protocolId: "" },
      ],
      [csv("DIRECT-1", "A09", "BASELINE", "40"), csv("DIRECT-2", "A09", "CURRENT", "41")],
    );
    expect(a.bundles.map((b) => b.athleteId)).toEqual(["A09", "A01"]);
    expect(a.bundles.every((b) => b.judge.reason !== "DUPLICATE_MEASUREMENT_ID")).toBe(true);
    expect(a.measurementCount).toBe(4);
  });

  it("등록되지 않은 프로토콜은 UNKNOWN_PROTOCOL", () => {
    const a = analyze([], [direct("A01", "BASELINE", "40"), direct("A01", "CURRENT", "42")], []);
    expect(a.bundles[0].judge).toMatchObject({ recordStatus: "DATA_ERROR", reason: "UNKNOWN_PROTOCOL" });
  });

  it("표시명이 없으면 선수 ID를 쓰고, 있으면 표시명을 쓴다", () => {
    const rows = [csv("M1", "A01", "BASELINE", "40"), csv("M2", "A01", "CURRENT", "42")];
    expect(analyze(protocols, [], rows).bundles[0].athleteLabel).toBe("A01");
    rows[0].athleteLabel = "가상선수 01";
    expect(analyze(protocols, [], rows).bundles[0].athleteLabel).toBe("가상선수 01");
  });
});
