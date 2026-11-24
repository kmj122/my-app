// 증가·감소 표시 색 (디자인 전용). 색만으로 구분하지 않고 화살표와 글자를 함께 쓴다.
export type Direction = "INCREASE" | "DECREASE" | "NONE";

export const DIRECTION_STYLE: Record<Direction, { arrow: string; text: string; badge: string; line: string }> = {
  INCREASE: {
    arrow: "▲",
    text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    line: "#059669",
  },
  DECREASE: {
    arrow: "▼",
    text: "text-rose-700",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
    line: "#e11d48",
  },
  NONE: {
    arrow: "■",
    text: "text-slate-600",
    badge: "bg-slate-100 text-slate-600 ring-slate-200",
    line: "#64748b",
  },
};

/** 공통 카드 모양 */
export const CARD = "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6";
