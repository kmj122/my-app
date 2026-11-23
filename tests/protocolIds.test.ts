// 프로토콜 이름 처리 테스트 (r5에 없는 추가 검사)
// C-1: 같은 이름이 중복 등록되면 두 행 모두 오류  /  B-5: 측정 기록의 protocol_id 는 r5처럼 공백을 지우지 않는다
import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/analyze";
import { buildRegistry } from "@/lib/judge";
import type { Measurement, ProtocolInput } from "@/lib/types";
import { protocolInput } from "./helpers";

function csv(id: string, athlete: string, protocol: string, session: string, value: string): Measurement {
  return { measurementId: id, athleteId: athlete, athleteLabel: "", protocolId: protocol, session, sessionDate: "", value, source: "csv" };
}

describe("C-1 중복 프로토콜 이름", () => {
  it("같은 이름이 둘이면 두 행 모두 오류를 알리고 둘 다 등록하지 않는다", () => {
    const list: ProtocolInput[] = [
      protocolInput({ uid: "a", protocolId: "P-A" }),
      protocolInput({ uid: "b", protocolId: "P-A", sem: "1.00" }),
    ];
    const reg = buildRegistry(list);
    expect(reg.errors.map((e) => e.uid).sort()).toEqual(["a", "b"]);
    expect(reg.errors.every((e) => e.message.includes("중복"))).toBe(true);
    expect(reg.protocols.has("P-A")).toBe(false);
  });

  it("세 개가 같아도 첫 행에 오류가 한 번만 붙는다", () => {
    const list = ["a", "b", "c"].map((uid) => protocolInput({ uid, protocolId: "P-A" }));
    const reg = buildRegistry(list);
    expect(reg.errors.filter((e) => e.uid === "a")).toHaveLength(1);
    expect(reg.errors.map((e) => e.uid).sort()).toEqual(["a", "b", "c"]);
  });

  it("앞뒤 공백만 다른 이름도 같은 이름으로 보고 중복 처리한다", () => {
    const reg = buildRegistry([protocolInput({ uid: "a", protocolId: "P-A" }), protocolInput({ uid: "b", protocolId: " P-A " })]);
    expect(reg.errors.map((e) => e.uid).sort()).toEqual(["a", "b"]);
  });

  it("중복되지 않은 프로토콜은 정상 등록되고, 중복된 프로토콜의 기록은 UNKNOWN_PROTOCOL 이 된다", () => {
    const protocols = [
      protocolInput({ uid: "a", protocolId: "P-A" }),
      protocolInput({ uid: "b", protocolId: "P-A" }),
      protocolInput({ uid: "c", protocolId: "P-B" }),
    ];
    const a = analyze(protocols, [], [
      csv("M1", "A01", "P-A", "BASELINE", "40"),
      csv("M2", "A01", "P-A", "CURRENT", "42"),
      csv("M3", "A02", "P-B", "BASELINE", "40"),
      csv("M4", "A02", "P-B", "CURRENT", "42"),
    ]);
    const by = Object.fromEntries(a.bundles.map((b) => [b.athleteId, b.judge]));
    expect(by["A01"]).toMatchObject({ recordStatus: "DATA_ERROR", reason: "UNKNOWN_PROTOCOL", mdc: null, sensitivity: "NOT_ASSESSED" });
    expect(by["A02"].recordStatus).toBe("OK");
    expect(a.registryErrors.map((e) => e.uid).sort()).toEqual(["a", "b"]);
  });
});

describe("B-5 측정 기록 protocol_id 의 공백 (r5와 같게)", () => {
  const protocols = [protocolInput({ uid: "a", protocolId: "P-A" })];

  it('"P-A " 는 "P-A" 와 다른 ID 라서 UNKNOWN_PROTOCOL', () => {
    const a = analyze(protocols, [], [csv("M1", "A01", "P-A ", "BASELINE", "40"), csv("M2", "A01", "P-A ", "CURRENT", "42")]);
    expect(a.bundles).toHaveLength(1);
    expect(a.bundles[0].judge).toMatchObject({ recordStatus: "DATA_ERROR", reason: "UNKNOWN_PROTOCOL" });
  });

  it('같은 선수의 "P-A" 와 "P-A " 기록은 서로 다른 묶음으로 나뉘고, 공백 없는 쪽만 정상 판정한다', () => {
    const a = analyze(protocols, [], [
      csv("M1", "A01", "P-A", "BASELINE", "40"),
      csv("M2", "A01", "P-A", "CURRENT", "42"),
      csv("M3", "A01", "P-A ", "BASELINE", "40"),
      csv("M4", "A01", "P-A ", "CURRENT", "42"),
    ]);
    expect(a.bundles).toHaveLength(2);
    expect(a.bundles.map((b) => b.judge.reason).sort()).toEqual(["", "UNKNOWN_PROTOCOL"]);
    expect(a.bundles.find((b) => b.protocolId === "P-A")?.judge.recordStatus).toBe("OK");
  });

  it("프로토콜 설정 화면에서 입력한 이름의 앞뒤 공백은 지우고 등록한다 (r5의 protocols.csv 처리와 같음)", () => {
    const reg = buildRegistry([protocolInput({ uid: "a", protocolId: " P-A " })]);
    expect(reg.protocols.has("P-A")).toBe(true);
    const a = analyze([protocolInput({ uid: "a", protocolId: " P-A " })], [], [csv("M1", "A01", "P-A", "BASELINE", "40"), csv("M2", "A01", "P-A", "CURRENT", "42")]);
    expect(a.bundles[0].judge.recordStatus).toBe("OK");
  });
});
