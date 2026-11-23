// 코치 후속 행동 카드 선택: 판정 결과 → 카드 ①~⑦ 중 처음 맞는 1개
// Design Ref: §4.1 — r5 스크립트의 card() 와 같은 우선순위. 통계 판정은 바꾸지 않는다.
// Plan SC: 선수·프로토콜 묶음당 카드 정확히 1개.
import { cardShort, cardText } from "./cardText";
import type { CardId, CardView, JudgeResult } from "./types";

export function direction(res: JudgeResult): "INCREASE" | "DECREASE" | "" {
  for (const v of [res.mdcStatus, res.swcStatus]) {
    if (v.endsWith("_INCREASE")) return "INCREASE";
    if (v.endsWith("_DECREASE")) return "DECREASE";
  }
  return "";
}

/** 우선순위 ①~⑦을 위에서부터 확인해 처음 맞는 카드를 돌려준다. */
export function selectCard(res: JudgeResult): { cardId: CardId; detail: string } {
  const m = res.mdcStatus;
  const s = res.swcStatus;
  const above = m.startsWith("ABOVE_MDC");
  const meets = s.startsWith("MEETS_SWC");

  if (res.recordStatus === "DATA_ERROR") return { cardId: "CHECK_DATA", detail: res.reason }; // ①
  if (res.reason === "SEM_MISSING" || res.reason === "SEM_SWC_MISSING") {
    return { cardId: "SECURE_SEM", detail: res.reason }; // ②
  }
  if (res.reason === "SWC_MISSING") return { cardId: "SET_SWC", detail: "" }; // ③
  if (m === "WITHIN_MDC" && meets) return { cardId: "REVIEW_PROTOCOL", detail: direction(res) }; // ④
  if (above && meets) return { cardId: "MEANINGFUL_CHANGE", detail: direction(res) }; // ⑤
  if (above && s === "BELOW_SWC") return { cardId: "SMALL_ABOVE_MDC", detail: direction(res) }; // ⑥
  return { cardId: "WITHIN_NOISE", detail: "" }; // ⑦
}

/** 화면에 그대로 쓰는 카드: 선택 + 확정 문구 */
export function buildCardView(res: JudgeResult): CardView {
  const { cardId, detail } = selectCard(res);
  const [title, body, nextAction] = cardText(cardId, detail);
  return { cardId, detail, shortLines: cardShort(cardId, detail), title, body, nextAction };
}
