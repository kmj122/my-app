// PLAN 14번 확인: 카드 ①~⑦ 선택 (우선순위, 세부값, 묶음당 정확히 1개)
// (카드 기대 결과 CSV 14건과 카드 전용 검사 4건의 정식 채점은 PLAN 16번에서 한다.)
import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/analyze";
import { buildProtocol, judge } from "@/lib/judge";
import { SAMPLE_MEASUREMENTS, SAMPLE_PROTOCOLS } from "@/lib/sampleData";
import { selectCard } from "@/lib/selectCard";
import {
  CARD_IDS,
  DATA_ERROR_REASONS,
  MDC_STATUSES,
  SWC_STATUSES,
  type CriteriaReason,
  type DataErrorReason,
  type JudgeResult,
  type RecordStatus,
} from "@/lib/types";

const result = (over: Partial<JudgeResult>): JudgeResult => ({
  recordStatus: "OK",
  reason: "",
  change: 1,
  mdc: 1,
  mdcStatus: "WITHIN_MDC",
  swcStatus: "BELOW_SWC",
  sensitivity: "CAN_DETECT_SWC",
  ...over,
});

describe("카드 ①~⑦ 조건", () => {
  it("① 기록 오류 → CHECK_DATA, 세부값은 사유", () => {
    expect(selectCard(result({ recordStatus: "DATA_ERROR", reason: "OUT_OF_RANGE" }))).toEqual({
      card: "CHECK_DATA",
      detail: "OUT_OF_RANGE",
    });
  });
  it("② SEM 없음 → SECURE_SEM, 세부값은 사유", () => {
    expect(selectCard(result({ recordStatus: "CRITERIA_MISSING", reason: "SEM_MISSING" }))).toEqual({
      card: "SECURE_SEM",
      detail: "SEM_MISSING",
    });
  });
  it("② SEM·SWC 모두 없음 → SECURE_SEM, 세부값 SEM_SWC_MISSING", () => {
    expect(selectCard(result({ recordStatus: "CRITERIA_MISSING", reason: "SEM_SWC_MISSING" }))).toEqual({
      card: "SECURE_SEM",
      detail: "SEM_SWC_MISSING",
    });
  });
  it("③ SWC 없음 → SET_SWC, 세부값 없음", () => {
    expect(selectCard(result({ recordStatus: "CRITERIA_MISSING", reason: "SWC_MISSING" }))).toEqual({
      card: "SET_SWC",
      detail: "",
    });
  });
  it("④ 오차 이내 + 실용 충족(증가) → REVIEW_PROTOCOL INCREASE", () => {
    expect(selectCard(result({ mdcStatus: "WITHIN_MDC", swcStatus: "MEETS_SWC_INCREASE" }))).toEqual({
      card: "REVIEW_PROTOCOL",
      detail: "INCREASE",
    });
  });
  it("④ 오차 이내 + 실용 충족(감소) → REVIEW_PROTOCOL DECREASE", () => {
    expect(selectCard(result({ mdcStatus: "WITHIN_MDC", swcStatus: "MEETS_SWC_DECREASE" }))).toEqual({
      card: "REVIEW_PROTOCOL",
      detail: "DECREASE",
    });
  });
  it("⑤ 오차 초과 + 실용 충족 → MEANINGFUL_CHANGE (증가·감소)", () => {
    expect(selectCard(result({ mdcStatus: "ABOVE_MDC_INCREASE", swcStatus: "MEETS_SWC_INCREASE" }))).toEqual({
      card: "MEANINGFUL_CHANGE",
      detail: "INCREASE",
    });
    expect(selectCard(result({ mdcStatus: "ABOVE_MDC_DECREASE", swcStatus: "MEETS_SWC_DECREASE" }))).toEqual({
      card: "MEANINGFUL_CHANGE",
      detail: "DECREASE",
    });
  });
  it("⑥ 오차 초과 + 실용 미달 → SMALL_ABOVE_MDC (증가·감소)", () => {
    expect(selectCard(result({ mdcStatus: "ABOVE_MDC_INCREASE", swcStatus: "BELOW_SWC" }))).toEqual({
      card: "SMALL_ABOVE_MDC",
      detail: "INCREASE",
    });
    expect(selectCard(result({ mdcStatus: "ABOVE_MDC_DECREASE", swcStatus: "BELOW_SWC" }))).toEqual({
      card: "SMALL_ABOVE_MDC",
      detail: "DECREASE",
    });
  });
  it("⑦ 오차 이내 + 실용 미달 → WITHIN_NOISE, 세부값 없음", () => {
    expect(selectCard(result({ mdcStatus: "WITHIN_MDC", swcStatus: "BELOW_SWC" }))).toEqual({
      card: "WITHIN_NOISE",
      detail: "",
    });
  });
});

describe("우선순위: 위 카드가 아래 카드보다 먼저", () => {
  it("① > ②: 기록 오류면 기준 누락 사유가 겹쳐도 CHECK_DATA", () => {
    // 실제 판정에서는 두 상태가 함께 나오지 않지만, 순서 규칙 자체를 확인한다.
    const r = result({ recordStatus: "DATA_ERROR", reason: "UNKNOWN_PROTOCOL", mdcStatus: "ABOVE_MDC_INCREASE", swcStatus: "MEETS_SWC_INCREASE" });
    expect(selectCard(r).card).toBe("CHECK_DATA");
  });
  it("② > ⑤: SEM 없음은 실용 판정 결과가 있어도 SECURE_SEM (T10)", () => {
    const r = result({ recordStatus: "CRITERIA_MISSING", reason: "SEM_MISSING", mdcStatus: "NOT_ASSESSED", swcStatus: "MEETS_SWC_INCREASE" });
    expect(selectCard(r).card).toBe("SECURE_SEM");
  });
  it("③ > ⑤: SWC 없음은 오차 판정 결과가 있어도 SET_SWC (T14)", () => {
    const r = result({ recordStatus: "CRITERIA_MISSING", reason: "SWC_MISSING", mdcStatus: "ABOVE_MDC_INCREASE", swcStatus: "NOT_ASSESSED" });
    expect(selectCard(r).card).toBe("SET_SWC");
  });
  it("④ > ⑤: 오차 이내와 오차 초과는 동시에 맞지 않는다 (경계 T05·T06)", () => {
    const p = buildProtocol({ protocolId: "P-B", sem: "1.00", swc: "1.20", plausibleMin: "5", plausibleMax: "100" });
    const at = (cur: string) => selectCard(judge([{ session: "BASELINE", value: "40.00" }, { session: "CURRENT", value: cur }], p));
    expect(at("42.77")).toEqual({ card: "REVIEW_PROTOCOL", detail: "INCREASE" });
    expect(at("42.78")).toEqual({ card: "MEANINGFUL_CHANGE", detail: "INCREASE" });
  });
});

describe("판정 함수를 거친 경계 사례 (카드 전용 검사 C1~C3 와 같은 입력)", () => {
  const rows = (a: string, b: string) => [
    { session: "BASELINE", value: a },
    { session: "CURRENT", value: b },
  ];
  const p = (sem: string, swc: string) =>
    buildProtocol({ protocolId: "P-X", sem, swc, plausibleMin: "5", plausibleMax: "100" });

  it("C1: P-A 40→41.15 (오차 초과, SWC 미달) → SMALL_ABOVE_MDC INCREASE", () => {
    expect(selectCard(judge(rows("40", "41.15"), p("0.40", "1.20")))).toEqual({
      card: "SMALL_ABOVE_MDC",
      detail: "INCREASE",
    });
  });
  it("C1 감소 방향: 40→38.85 → SMALL_ABOVE_MDC DECREASE", () => {
    expect(selectCard(judge(rows("40", "38.85"), p("0.40", "1.20")))).toEqual({
      card: "SMALL_ABOVE_MDC",
      detail: "DECREASE",
    });
  });
  it("C2: SEM·SWC 모두 없음 40→42 → SECURE_SEM SEM_SWC_MISSING", () => {
    expect(selectCard(judge(rows("40", "42"), p("", "")))).toEqual({
      card: "SECURE_SEM",
      detail: "SEM_SWC_MISSING",
    });
  });
  it("C3: SEM 1.00, SWC 1.20, 40→38 → REVIEW_PROTOCOL DECREASE", () => {
    expect(selectCard(judge(rows("40", "38"), p("1.00", "1.20")))).toEqual({
      card: "REVIEW_PROTOCOL",
      detail: "DECREASE",
    });
  });
});

describe("예시 데이터 14건: 패키지 11.1절 카드 판정표와 같다", () => {
  const a = analyze(SAMPLE_PROTOCOLS, [], SAMPLE_MEASUREMENTS);
  const want: Record<string, [string, string]> = {
    A01: ["MEANINGFUL_CHANGE", "INCREASE"], // T01
    A02: ["REVIEW_PROTOCOL", "INCREASE"], // T02
    A03: ["WITHIN_NOISE", ""], // T03
    A04: ["MEANINGFUL_CHANGE", "DECREASE"], // T04
    A05: ["REVIEW_PROTOCOL", "INCREASE"], // T05
    A06: ["MEANINGFUL_CHANGE", "INCREASE"], // T06
    A07: ["MEANINGFUL_CHANGE", "INCREASE"], // T07
    A08: ["CHECK_DATA", "MISSING_SESSION"], // T08
    A09: ["CHECK_DATA", "OUT_OF_RANGE"], // T09
    A10: ["SECURE_SEM", "SEM_MISSING"], // T10
    A11: ["CHECK_DATA", "DUPLICATE_SESSION"], // T11
    A12: ["CHECK_DATA", "NON_NUMERIC"], // T12
    A13: ["CHECK_DATA", "UNKNOWN_PROTOCOL"], // T13
    A14: ["SET_SWC", ""], // T14
  };
  for (const [athleteId, [card, detail]] of Object.entries(want)) {
    it(`${athleteId} → ${card}${detail ? ` (${detail})` : ""}`, () => {
      const b = a.bundles.find((x) => x.athleteId === athleteId)!;
      expect(selectCard(b.judge)).toEqual({ card, detail });
    });
  }
  it("묶음 14개 모두 카드가 정확히 1개 (7종 중 하나)", () => {
    expect(a.bundles).toHaveLength(14);
    for (const b of a.bundles) expect(CARD_IDS).toContain(selectCard(b.judge).card);
  });
});

describe("어떤 판정 조합이 와도 카드는 정확히 1개 (7종 중 하나)", () => {
  const records: RecordStatus[] = ["OK", "CRITERIA_MISSING", "DATA_ERROR"];
  const reasons: (DataErrorReason | CriteriaReason | "")[] = [...DATA_ERROR_REASONS, "SEM_MISSING", "SWC_MISSING", "SEM_SWC_MISSING", ""];
  it("모든 상태 조합을 돌려도 항상 7종 중 하나이고 세부값은 문자열", () => {
    let n = 0;
    for (const recordStatus of records)
      for (const reason of reasons)
        for (const mdcStatus of MDC_STATUSES)
          for (const swcStatus of SWC_STATUSES) {
            const s = selectCard(result({ recordStatus, reason, mdcStatus, swcStatus }));
            expect(CARD_IDS).toContain(s.card);
            expect(typeof s.detail).toBe("string");
            n += 1;
          }
    expect(n).toBe(3 * 11 * 4 * 4);
  });
  it("방향이 필요한 카드(④⑤⑥)의 세부값은 INCREASE 또는 DECREASE", () => {
    for (const mdcStatus of MDC_STATUSES)
      for (const swcStatus of SWC_STATUSES) {
        const s = selectCard(result({ mdcStatus, swcStatus }));
        if (["REVIEW_PROTOCOL", "MEANINGFUL_CHANGE", "SMALL_ABOVE_MDC"].includes(s.card)) {
          expect(["INCREASE", "DECREASE"]).toContain(s.detail);
        }
      }
  });
});
