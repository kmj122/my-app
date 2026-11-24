// 간단 모드 (체력측정 첫 화면): 선수 이름·이전 점프 높이·오늘 점프 높이만으로 기존 판정 엔진을 쓴다.
// 판정 공식·카드·문구는 바꾸지 않고, 입력을 기존 입력(BASELINE·CURRENT 두 줄)으로 바꿔 주는 연결부만 둔다.
// SEM·SWC 는 임의로 만들어 넣지 않는다. 고급 설정에서 입력하기 전까지는 비워 두고, 그 상태에서는 오차 초과 여부를 판단하지 않는다.
import { cardShort, cardText, FOOTER, type CardDetailText } from "./cardText";
import { fixed3 } from "./format";
import { formatSigned } from "./labels";
import { toFloat } from "./parseNumber";
import { selectCard } from "./selectCard";
import type { BundleResult } from "./analyze";
import type { DirectEntry, ProtocolInput } from "./types";

/** 간단 모드가 쓰는 내부 기본 프로토콜 이름 (고급 설정에서 SEM·SWC 를 입력하는 대상) */
export const DEFAULT_PROTOCOL_ID = "기본 측정";

/**
 * 입력 오타를 거르기 위한 임시 기본 허용 범위(cm). 테스트용으로 정한 값이며
 * 모든 선수에게 맞는 절대 기준이 아니다. 고급 설정에서 바꿀 수 있다.
 */
export const DEFAULT_PLAUSIBLE_MIN = "5";
export const DEFAULT_PLAUSIBLE_MAX = "100";

/** 기본 프로토콜: SEM·SWC 는 비어 있다. */
export function defaultProtocolInput(): ProtocolInput {
  return {
    protocolId: DEFAULT_PROTOCOL_ID,
    sem: "",
    swc: "",
    plausibleMin: DEFAULT_PLAUSIBLE_MIN,
    plausibleMax: DEFAULT_PLAUSIBLE_MAX,
  };
}

/** 이름·이전·오늘 기록을 기존 입력 형식(BASELINE, CURRENT 두 줄)으로 바꾼다. 값은 입력한 글자 그대로 둔다. */
export function simpleEntries(name: string, baseline: string, current: string): DirectEntry[] {
  const id = name.trim();
  const base = { athleteId: id, athleteLabel: id, protocolId: DEFAULT_PROTOCOL_ID, sessionDate: "" };
  return [
    { ...base, session: "BASELINE", value: baseline },
    { ...base, session: "CURRENT", value: current },
  ];
}

export type SimpleResultView =
  | {
      kind: "error";
      title: string;
      reason: string;
      next: string;
      /** 허용 범위를 벗어났을 때만: 임시 기본 범위임을 알리는 설명 */
      rangeHint: string;
    }
  | {
      kind: "change";
      /** 예: "40.000 → 42.000 cm" */
      headline: string;
      /** 예: "+2.000 cm 증가" */
      changeLine: string;
      direction: "INCREASE" | "DECREASE" | "NONE";
      baseline: number;
      current: number;
      /** 측정 기준이 있어 정밀 분석(카드)을 보여 줄 수 있으면 채워진다. 없으면 null. */
      precise: null | {
        short: [string, string];
        detail: CardDetailText;
        footer: string;
      };
      /** 측정 기준이 없을 때의 안내. 정밀 분석이 있으면 빈 글자. */
      needCriteriaNotice: string;
    };

/** 간단 화면에 보일 결과를 정한다. 기록 오류면 변화를 보여 주지 않고 확인 안내만 낸다. */
export function describeSimple(b: BundleResult): SimpleResultView {
  const j = b.judge;
  const base = toFloat(b.baselineText);
  const cur = toFloat(b.currentText);

  if (j.recordStatus === "DATA_ERROR" || j.change === null || base === null || cur === null) {
    const sel = selectCard(j);
    const [title, next] = cardShort(sel.card, sel.detail);
    const reason = cardText(sel.card, sel.detail).body.replace(/^.*\(사유: (.*)\)\.$/, "$1");
    return {
      kind: "error",
      title,
      reason,
      next,
      rangeHint:
        j.reason === "OUT_OF_RANGE"
          ? `입력 확인을 위한 임시 허용 범위(${DEFAULT_PLAUSIBLE_MIN}~${DEFAULT_PLAUSIBLE_MAX}cm)를 벗어났습니다. 모든 선수에게 맞는 기준은 아니며 분석 설정의 상세 설정에서 바꿀 수 있습니다.`
          : "",
    };
  }

  const direction = j.change > 0 ? "INCREASE" : j.change < 0 ? "DECREASE" : "NONE";
  const word = direction === "INCREASE" ? "증가" : direction === "DECREASE" ? "감소" : "변화 없음";
  const sel = selectCard(j);
  const hasCriteria = j.recordStatus === "OK";
  return {
    kind: "change",
    headline: `${fixed3(base)} → ${fixed3(cur)} cm`,
    changeLine: `${formatSigned(j.change)} cm ${word}`,
    direction,
    baseline: base,
    current: cur,
    precise: hasCriteria
      ? { short: cardShort(sel.card, sel.detail), detail: cardText(sel.card, sel.detail), footer: FOOTER }
      : null,
    needCriteriaNotice: hasCriteria ? "" : "정밀 분석을 위해 측정 기준 설정 필요",
  };
}

/** 이전·오늘 두 값을 한 그래프에 그리기 위한 좌표 (세로 눈금은 두 값이 잘 보이게 좁힌다) */
export interface CompareChart {
  min: number;
  max: number;
  /** 값 → 세로 위치(위가 큰 값) */
  y: (v: number) => number;
}

export const COMPARE_CHART_WIDTH = 360;
export const COMPARE_CHART_HEIGHT = 190;
export const COMPARE_CHART_TOP = 40;
export const COMPARE_CHART_BOTTOM = 140;

export function buildCompareChart(baseline: number, current: number): CompareChart {
  const lo = Math.min(baseline, current);
  const hi = Math.max(baseline, current);
  const pad = Math.max((hi - lo) * 0.5, 1);
  const min = lo - pad;
  const max = hi + pad;
  const y = (v: number) =>
    COMPARE_CHART_BOTTOM - ((v - min) / (max - min)) * (COMPARE_CHART_BOTTOM - COMPARE_CHART_TOP);
  return { min, max, y };
}
