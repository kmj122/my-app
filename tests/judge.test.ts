// 판정 기능 테스트: 기본 판정 14건 + 추가 단위 검사 11건 (r5 스크립트와 같은 입력·같은 정답)
import { describe, expect, it } from "vitest";
import { buildProtocol, buildRegistry, fmt3, judge, mdc95 } from "@/lib/judge";
import { toFloat } from "@/lib/parseNumber";
import type { Protocol } from "@/lib/types";
import {
  loadRecords,
  protocolInput,
  protocolInputFromCsv,
  rows,
  unitProto,
} from "./helpers";

const protocolRows = loadRecords("protocols.csv", ["protocol_id", "sem_cm", "swc_cm", "plausible_min", "plausible_max"]);
const measurementRows = loadRecords("measurements.csv", ["measurement_id", "athlete_id", "protocol_id", "session", "value"]);
const expectedRows = loadRecords("expected_results.csv", [
  "case_id", "athlete_id", "protocol_id", "expected_record_status", "expected_reason",
  "expected_change", "expected_mdc", "expected_mdc_status", "expected_swc_status", "expected_sensitivity",
]);

const registry = buildRegistry(protocolRows.map(protocolInputFromCsv));
const groups = new Map<string, Record<string, string>[]>();
for (const r of measurementRows) {
  const key = `${r["athlete_id"]}|${r["protocol_id"]}`;
  groups.set(key, [...(groups.get(key) ?? []), r]);
}

describe("기본 판정 14건 (expected_results.csv)", () => {
  it("프로토콜 CSV에 설정 오류가 없다", () => {
    expect(registry.errors).toEqual([]);
  });

  it("기대 결과가 14건이다", () => {
    expect(expectedRows).toHaveLength(14);
  });

  for (const e of expectedRows) {
    it(`${e["case_id"]} ${e["athlete_id"]}·${e["protocol_id"]}`, () => {
      const rowsOfGroup = (groups.get(`${e["athlete_id"]}|${e["protocol_id"]}`) ?? []).map((r) => ({
        session: r["session"],
        value: r["value"],
      }));
      const got = judge(rowsOfGroup, registry.protocols.get(e["protocol_id"]));
      expect(got.recordStatus).toBe(e["expected_record_status"]);
      expect(got.reason).toBe(e["expected_reason"]);
      expect(fmt3(got.change)).toBe(e["expected_change"]);
      expect(fmt3(got.mdc)).toBe(e["expected_mdc"]);
      expect(got.mdcStatus).toBe(e["expected_mdc_status"]);
      expect(got.swcStatus).toBe(e["expected_swc_status"]);
      expect(got.sensitivity).toBe(e["expected_sensitivity"]);
    });
  }

  it("기대 결과가 없는 측정 묶음이 없다", () => {
    const covered = new Set(expectedRows.map((e) => `${e["athlete_id"]}|${e["protocol_id"]}`));
    const uncovered = [...groups.keys()].filter((k) => !covered.has(k));
    expect(uncovered).toEqual([]);
  });
});

describe("MDC95 공식", () => {
  it("SEM 0.40 → 1.109, SEM 1.00 → 2.772", () => {
    expect(mdc95(0.4)).toBeCloseTo(1.10874, 4);
    expect(mdc95(1.0)).toBeCloseTo(2.77186, 4);
  });
});

describe("추가 단위 검사 11건", () => {
  const sem = 0.4;
  const mdc = mdc95(sem);

  it("U1 SEM·SWC 모두 없음", () => {
    const got = judge(rows(["BASELINE", "40"], ["CURRENT", "42"]), unitProto("", ""));
    expect(got).toMatchObject({
      recordStatus: "CRITERIA_MISSING",
      reason: "SEM_SWC_MISSING",
      mdcStatus: "NOT_ASSESSED",
      swcStatus: "NOT_ASSESSED",
      sensitivity: "NOT_ASSESSED",
    });
  });

  it("U2 SWC = MDC95 (민감도 경계)", () => {
    const p = buildProtocol(protocolInput({ protocolId: "P-X", sem: "0.40", swc: String(mdc) }));
    expect(p.sensitivity).toBe("CAN_DETECT_SWC");
  });

  it("U3 |Δ| = MDC95 (오차 판정 경계)", () => {
    const got = judge(rows(["BASELINE", "40"], ["CURRENT", String(40 + mdc)]), unitProto());
    expect(got).toMatchObject({ recordStatus: "OK", mdcStatus: "WITHIN_MDC" });
  });

  it("U4 BASELINE 없음", () => {
    const got = judge(rows(["CURRENT", "42"]), unitProto());
    expect(got).toMatchObject({ recordStatus: "DATA_ERROR", reason: "MISSING_SESSION" });
  });

  it("U5 CURRENT 2건", () => {
    const got = judge(rows(["BASELINE", "40"], ["CURRENT", "42"], ["CURRENT", "42"]), unitProto());
    expect(got).toMatchObject({ recordStatus: "DATA_ERROR", reason: "DUPLICATE_SESSION" });
  });

  it("U6 최솟값 미만(4.99)", () => {
    const got = judge(rows(["BASELINE", "4.99"], ["CURRENT", "42"]), unitProto());
    expect(got).toMatchObject({ recordStatus: "DATA_ERROR", reason: "OUT_OF_RANGE" });
  });

  it("U7 SEM이 숫자 아님(abc, Infinity, 공백, 0)", () => {
    for (const bad of ["abc", "Infinity", " ", "0"]) {
      const got = judge(rows(["BASELINE", "40"], ["CURRENT", "42"]), unitProto(bad, "1.20"));
      expect(got.reason).toBe("SEM_MISSING");
    }
  });

  it("U8 측정값 지수 표기(4e1)", () => {
    const got = judge(rows(["BASELINE", "4e1"], ["CURRENT", "42"]), unitProto());
    expect(got).toMatchObject({ recordStatus: "DATA_ERROR", reason: "NON_NUMERIC" });
  });

  it("U9 앞뒤 공백이 있는 숫자(' 42.00 ') 인정", () => {
    expect(toFloat(" 42.00 ")).toBe(42.0);
  });

  it("U10 세션 이름 MID·소문자 baseline", () => {
    for (const r of [
      rows(["BASELINE", "40"], ["MID", "41"], ["CURRENT", "42"]),
      rows(["baseline", "40"], ["CURRENT", "42"]),
    ]) {
      expect(judge(r, unitProto()).reason).toBe("INVALID_SESSION");
    }
  });

  it("U11 허용 범위 숫자 아님·역전, 프로토콜 이름 중복·빈칸 → 설정 오류", () => {
    const base = protocolInput({ protocolId: "P-X" });
    const hasError = (list: ReturnType<typeof protocolInput>[]) => buildRegistry(list).errors.length > 0;
    expect(hasError([{ ...base, plausibleMax: "abc" }])).toBe(true);
    expect(hasError([{ ...base, plausibleMin: "100", plausibleMax: "5" }])).toBe(true);
    expect(hasError([base, { ...base }])).toBe(true);
    expect(hasError([{ ...base, protocolId: " " }])).toBe(true);
    expect(hasError([base])).toBe(false);
  });
});

describe("판정 보충 (r5에 없는 확인)", () => {
  it("모르는 프로토콜은 UNKNOWN_PROTOCOL", () => {
    const got = judge(rows(["BASELINE", "40"], ["CURRENT", "42"]), undefined as Protocol | undefined);
    expect(got).toMatchObject({ recordStatus: "DATA_ERROR", reason: "UNKNOWN_PROTOCOL" });
  });
});
