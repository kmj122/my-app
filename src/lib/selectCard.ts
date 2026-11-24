// 코치 후속 행동 카드 선택 (PLAN 14번)
// Design Ref: §4.1 — verify_athlete_signal_v1_1_r5.py 의 card() 와 direction() 을 그대로 옮긴 것이다.
// 우선순위 ①~⑦ 을 위에서부터 확인해 처음 맞는 카드 1개만 고른다. 순서·조건을 임의로 바꾸지 않는다.
import type { CardId, JudgeResult } from "./types";

export interface CardSelection {
  card: CardId;
  /** 세부값: 기록 오류·기준 누락이면 사유 코드, ④~⑥ 이면 "INCREASE" | "DECREASE", 그 밖에는 "" */
  detail: string;
}

/** 오차 판정 → 실용 판정 순서로 살펴 증가/감소 방향을 읽는다. 방향이 없으면 "". */
function direction(r: JudgeResult): "INCREASE" | "DECREASE" | "" {
  for (const v of [r.mdcStatus, r.swcStatus]) {
    if (v.endsWith("_INCREASE")) return "INCREASE";
    if (v.endsWith("_DECREASE")) return "DECREASE";
  }
  return "";
}

/** 판정 결과 하나에 카드 정확히 1개를 고른다. */
export function selectCard(r: JudgeResult): CardSelection {
  const above = r.mdcStatus.startsWith("ABOVE_MDC");
  const meets = r.swcStatus.startsWith("MEETS_SWC");

  if (r.recordStatus === "DATA_ERROR") return { card: "CHECK_DATA", detail: r.reason }; // ①
  if (r.reason === "SEM_MISSING" || r.reason === "SEM_SWC_MISSING") {
    return { card: "SECURE_SEM", detail: r.reason }; // ②
  }
  if (r.reason === "SWC_MISSING") return { card: "SET_SWC", detail: "" }; // ③
  if (r.mdcStatus === "WITHIN_MDC" && meets) return { card: "REVIEW_PROTOCOL", detail: direction(r) }; // ④
  if (above && meets) return { card: "MEANINGFUL_CHANGE", detail: direction(r) }; // ⑤
  if (above && r.swcStatus === "BELOW_SWC") return { card: "SMALL_ABOVE_MDC", detail: direction(r) }; // ⑥
  return { card: "WITHIN_NOISE", detail: "" }; // ⑦
}
