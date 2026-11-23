// PLAN 7번 확인: 프로토콜 등록(설정 오류)과 선수·프로토콜 묶기
import { describe, expect, it } from "vitest";
import { groupMeasurements } from "@/lib/groupMeasurements";
import { judge } from "@/lib/judge";
import { buildRegistry } from "@/lib/protocolRegistry";
import type { Measurement, ProtocolInput } from "@/lib/types";

const base: ProtocolInput = {
  protocolId: "P-X",
  sem: "0.40",
  swc: "1.20",
  plausibleMin: "5",
  plausibleMax: "100",
};

describe("buildRegistry", () => {
  it("정상 프로토콜은 등록, 오류 없음", () => {
    const r = buildRegistry([base]);
    expect(r.errors).toEqual([]);
    expect(r.protocols.get("P-X")?.mdc).toBeCloseTo(1.10874, 4);
  });

  it("이름 앞뒤 공백은 지우고 등록", () => {
    expect(buildRegistry([{ ...base, protocolId: " P-X " }]).protocols.has("P-X")).toBe(true);
  });

  it("이름 빈칸: 오류, 등록 안 됨", () => {
    const r = buildRegistry([{ ...base, protocolId: "  " }]);
    expect(r.protocols.size).toBe(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].index).toBe(0);
  });

  it("이름 중복: 처음 행과 뒤 행 모두 오류, 둘 다 등록 안 됨", () => {
    const r = buildRegistry([base, { ...base, sem: "1.00" }]);
    expect(r.protocols.size).toBe(0);
    expect(r.errors.map((e) => e.index)).toEqual([0, 1]);
  });

  it("이름 중복 + 정상 프로토콜 섞임: 정상 것만 등록", () => {
    const r = buildRegistry([base, { ...base, protocolId: "P-Y" }, { ...base }]);
    expect([...r.protocols.keys()]).toEqual(["P-Y"]);
    expect(r.errors.map((e) => e.index)).toEqual([0, 2]);
  });

  it("허용 범위 오류: 그 프로토콜만 등록 안 됨", () => {
    const r = buildRegistry([base, { ...base, protocolId: "P-Y", plausibleMax: "abc" }]);
    expect([...r.protocols.keys()]).toEqual(["P-X"]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].index).toBe(1);
  });

  it("등록되지 않은 프로토콜의 기록은 UNKNOWN_PROTOCOL", () => {
    const r = buildRegistry([{ ...base, plausibleMax: "abc" }]);
    const res = judge(
      [
        { session: "BASELINE", value: "40" },
        { session: "CURRENT", value: "42" },
      ],
      r.protocols.get("P-X"),
    );
    expect(res.reason).toBe("UNKNOWN_PROTOCOL");
    expect(res.mdc).toBeNull();
    expect(res.sensitivity).toBe("NOT_ASSESSED");
  });
});

describe("groupMeasurements", () => {
  const m = (id: string, athleteId: string, protocolId: string): Measurement => ({
    measurementId: id,
    athleteId,
    protocolId,
    session: "BASELINE",
    value: "40",
  });

  it("선수+프로토콜로 묶고 처음 나온 순서를 지킨다", () => {
    const g = groupMeasurements([m("1", "A1", "P-A"), m("2", "A2", "P-A"), m("3", "A1", "P-A"), m("4", "A1", "P-B")]);
    expect(g.map((b) => [b.athleteId, b.protocolId, b.rows.length])).toEqual([
      ["A1", "P-A", 2],
      ["A2", "P-A", 1],
      ["A1", "P-B", 1],
    ]);
  });

  it("같은 선수라도 프로토콜이 다르면 다른 묶음", () => {
    expect(groupMeasurements([m("1", "A1", "P-A"), m("2", "A1", "P-B")])).toHaveLength(2);
  });

  it("빈 목록은 빈 결과", () => {
    expect(groupMeasurements([])).toEqual([]);
  });
});
