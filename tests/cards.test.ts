// 코치 후속 행동 카드 테스트: 카드 기대 결과 14건 + 카드 전용 검사 4건 (r5 스크립트와 같은 입력·같은 정답)
import { describe, expect, it } from "vitest";
import { cardShort, cardText, FOOTER, FORBIDDEN, REASON_KO } from "@/lib/cardText";
import { buildRegistry, judge } from "@/lib/judge";
import { buildCardView, selectCard } from "@/lib/selectCard";
import type { CardId } from "@/lib/types";
import { loadRecords, protocolInputFromCsv, rows, unitProto } from "./helpers";

const protocolRows = loadRecords("protocols.csv", ["protocol_id", "sem_cm", "swc_cm", "plausible_min", "plausible_max"]);
const measurementRows = loadRecords("measurements.csv", ["measurement_id", "athlete_id", "protocol_id", "session", "value"]);
const cardRows = loadRecords("card_expected_results.csv", ["case_id", "athlete_id", "protocol_id", "expected_card", "expected_detail"]);
const expectedRows = loadRecords("expected_results.csv", ["case_id", "athlete_id", "protocol_id", "expected_record_status"]);

const registry = buildRegistry(protocolRows.map(protocolInputFromCsv));
const groups = new Map<string, { session: string; value: string }[]>();
for (const r of measurementRows) {
  const key = `${r["athlete_id"]}|${r["protocol_id"]}`;
  groups.set(key, [...(groups.get(key) ?? []), { session: r["session"], value: r["value"] }]);
}

describe("카드 기대 결과 14건 (card_expected_results.csv)", () => {
  it("카드 기대 결과가 14건이다", () => {
    expect(cardRows).toHaveLength(14);
  });

  it("카드 기대 결과와 기본 판정 기대 결과의 사례·선수·프로토콜이 일치한다 (완전성)", () => {
    const toMap = (list: Record<string, string>[]) =>
      Object.fromEntries(list.map((r) => [r["case_id"], `${r["athlete_id"]}|${r["protocol_id"]}`]));
    expect(toMap(cardRows)).toEqual(toMap(expectedRows));
  });

  for (const e of cardRows) {
    it(`${e["case_id"]} ${e["athlete_id"]}·${e["protocol_id"]} → ${e["expected_card"]}`, () => {
      const res = judge(groups.get(`${e["athlete_id"]}|${e["protocol_id"]}`) ?? [], registry.protocols.get(e["protocol_id"]));
      const got = selectCard(res);
      expect([got.cardId, got.detail]).toEqual([e["expected_card"], e["expected_detail"]]);
    });
  }
});

describe("카드 전용 검사 4건", () => {
  it("C1 6번 카드: P-A 40→41.15 (오차 초과·실용 미달)", () => {
    const got = selectCard(judge(rows(["BASELINE", "40"], ["CURRENT", "41.15"]), unitProto()));
    expect([got.cardId, got.detail]).toEqual(["SMALL_ABOVE_MDC", "INCREASE"]);
  });

  it("C2 SEM·SWC 모두 없음", () => {
    const got = selectCard(judge(rows(["BASELINE", "40"], ["CURRENT", "42"]), unitProto("", "")));
    expect([got.cardId, got.detail]).toEqual(["SECURE_SEM", "SEM_SWC_MISSING"]);
  });

  it("C3 4번 카드 감소: P-B 40→38", () => {
    const got = selectCard(judge(rows(["BASELINE", "40"], ["CURRENT", "38"]), unitProto("1.00", "1.20")));
    expect([got.cardId, got.detail]).toEqual(["REVIEW_PROTOCOL", "DECREASE"]);
  });

  it("C4 모든 카드 문구에 금지 표현이 없고, 기본 화면 한 줄은 40자 이하", () => {
    const r5Reasons = ["UNKNOWN_PROTOCOL", "INVALID_SESSION", "MISSING_SESSION", "DUPLICATE_SESSION", "NON_NUMERIC", "OUT_OF_RANGE"];
    const combos: [CardId, string][] = [
      ...Object.keys(REASON_KO).map((r): [CardId, string] => ["CHECK_DATA", r]),
      ["SECURE_SEM", "SEM_MISSING"],
      ["SECURE_SEM", "SEM_SWC_MISSING"],
      ["SET_SWC", ""],
      ["WITHIN_NOISE", ""],
      ...(["REVIEW_PROTOCOL", "MEANINGFUL_CHANGE", "SMALL_ABOVE_MDC"] as CardId[]).flatMap((c): [CardId, string][] => [
        [c, "INCREASE"],
        [c, "DECREASE"],
      ]),
    ];
    // r5의 6가지 사유는 반드시 포함되어야 한다 (r5 검사 16종 + 새 사유 1종)
    expect(r5Reasons.every((r) => r in REASON_KO)).toBe(true);
    expect(combos.length).toBe(17);

    const bad: string[] = [];
    const tooLong: string[] = [];
    for (const [c, d] of combos) {
      const text = [...cardText(c, d), ...cardShort(c, d)].join(" ") + " " + FOOTER;
      for (const w of FORBIDDEN) if (text.includes(w)) bad.push(`${c}/${d}: ${w}`);
      for (const s of cardShort(c, d)) if ([...s].length > 40) tooLong.push(`${c}/${d}: ${s}`);
    }
    expect(bad).toEqual([]);
    expect(tooLong).toEqual([]);
  });
});

describe("카드 구성 (r5에 없는 확인)", () => {
  it("묶음마다 카드 1개의 문구(기본 2줄 + 자세히 보기 3개)가 모두 채워진다", () => {
    const res = judge(rows(["BASELINE", "40"], ["CURRENT", "42"]), unitProto());
    const view = buildCardView(res);
    expect(view.cardId).toBe("MEANINGFUL_CHANGE");
    expect(view.shortLines).toEqual(["두 기준을 모두 넘는 증가가 관찰되었습니다.", "다른 체력 지표와 함께 확인하세요."]);
    expect(view.title).toBe("두 기준을 넘는 증가 관찰");
    expect(view.body.length).toBeGreaterThan(0);
    expect(view.nextAction.length).toBeGreaterThan(0);
  });

  it("카드 종류는 7종으로 고정되어 있다", () => {
    const ids = new Set<string>();
    for (const e of cardRows) {
      const res = judge(groups.get(`${e["athlete_id"]}|${e["protocol_id"]}`) ?? [], registry.protocols.get(e["protocol_id"]));
      ids.add(selectCard(res).cardId);
    }
    expect([...ids].sort()).toEqual(
      ["CHECK_DATA", "MEANINGFUL_CHANGE", "REVIEW_PROTOCOL", "SECURE_SEM", "SET_SWC", "WITHIN_NOISE"].sort(),
    );
  });

  it("기록 오류(measurement_id 중복)는 ① 데이터 확인 카드이고 사유 문구가 있다", () => {
    const view = buildCardView({
      recordStatus: "DATA_ERROR",
      reason: "DUPLICATE_MEASUREMENT_ID",
      change: null,
      mdc: null,
      mdcStatus: "NOT_ASSESSED",
      swcStatus: "NOT_ASSESSED",
      sensitivity: "NOT_ASSESSED",
    });
    expect(view.cardId).toBe("CHECK_DATA");
    expect(view.body).toContain("같은 측정 번호");
  });
});
