// 코치 후속 행동 카드 문구 (PLAN 15번)
// Design Ref: §6 — verify_athlete_signal_v1_1_r5.py 의 card_text, card_short, DIR_KO, FOOTER, FORBIDDEN 을 글자 그대로 옮긴 것이다.
// 문구를 새로 만들거나 다듬지 않는다. 바꿔야 하면 r5 스크립트를 먼저 고치고 tests/fixtures/r5-card-texts.json 을 다시 뽑는다.
// (기록 오류 사유의 한글 이름은 labels.ts 의 REASON_KO 를 쓴다. 측정 번호 중복만 r5 에 없는 PRD 확정 항목이다.)
import { REASON_KO } from "./labels";
import type { DataErrorReason } from "./types";

/** 증가/감소 방향의 한글 */
export const DIR_KO: Record<string, string> = { INCREASE: "증가", DECREASE: "감소" };

/** 카드 공통 안내 문구 (결과 화면 맨 아래에 한 번만 표시) */
export const FOOTER = "변화의 원인은 앱이 판단하지 않습니다. 이 결과만으로 훈련 효과나 경기력 향상을 확정할 수 없습니다.";

/** 카드 문구에 들어가면 안 되는 표현 (자동 검사용) */
export const FORBIDDEN = [
  "향상 확정",
  "향상되었습니다",
  "입증",
  "부상",
  "피로",
  "처방",
  "바꾸세요",
  "효과가 있",
] as const;

/** 자세히 보기: 제목·본문·다음 행동 */
export interface CardDetailText {
  title: string;
  body: string;
  nextAction: string;
}

/** 화면에 표시할 제목·본문·다음 행동 (r5 card_text). detail 은 증가/감소 방향 또는 사유 코드. */
export function cardText(cardId: string, detail: string): CardDetailText {
  const d = DIR_KO[detail] ?? "";
  if (cardId === "CHECK_DATA") {
    return {
      title: "데이터 확인 필요",
      body: `이 선수의 기록은 판정하지 않았습니다(사유: ${REASON_KO[detail as DataErrorReason] ?? detail}).`,
      nextAction: "원자료(측정 장비 기록)를 확인한 뒤 값을 다시 입력하세요.",
    };
  }
  if (cardId === "SECURE_SEM") {
    if (detail === "SEM_SWC_MISSING") {
      return {
        title: "측정 기준 확보 필요",
        body: "이 측정 방식의 측정 오차(SEM)와 실용 기준(SWC)이 모두 없어 두 판정을 모두 보류했습니다.",
        nextAction: "같은 장비·절차로 얻은 검사-재검사 신뢰도 자료로 SEM을 입력하고, SWC도 근거를 두고 설정하세요.",
      };
    }
    return {
      title: "측정 기준 확보 필요",
      body: "이 측정 방식의 측정 오차(SEM) 근거가 없어 오차 기준 판정을 보류했습니다.",
      nextAction: "같은 장비·절차로 얻은 검사-재검사 신뢰도 자료로 SEM을 입력하세요.",
    };
  }
  if (cardId === "SET_SWC") {
    return {
      title: "실용 기준 설정 필요",
      body: "코치가 정한 실용 기준(SWC)이 없어 실용 기준 판정을 보류했습니다.",
      nextAction: "종목과 선수 수준을 고려해 근거를 두고 SWC를 설정하세요.",
    };
  }
  if (cardId === "REVIEW_PROTOCOL") {
    return {
      title: "측정 방식 점검 필요",
      body: `${d}폭이 코치가 설정한 실용 기준에는 도달했지만, 현재 측정 방식의 오차 기준은 넘지 못했습니다.`,
      nextAction:
        "동일한 조건에서 재측정하거나 현재 장비와 측정 절차의 신뢰도 자료를 확인하세요. " +
        "더 정밀한 측정 방법이 필요한지는 코치가 검토합니다.",
    };
  }
  if (cardId === "MEANINGFUL_CHANGE") {
    return {
      title: `두 기준을 넘는 ${d} 관찰`,
      body: `설정한 측정 오차 기준과 실용 기준을 모두 넘는 ${d}가 관찰되었습니다.`,
      nextAction:
        "측정 조건이 같았는지 먼저 확인하고, 다른 수행 지표·훈련 기록과 함께 해석하세요. " +
        "다음 정기 측정에서 다시 확인하세요.",
    };
  }
  if (cardId === "SMALL_ABOVE_MDC") {
    return {
      title: "오차는 넘었지만 실용 기준 미만",
      body: `설정한 측정 오차 기준을 넘는 ${d}가 관찰되었으나, 코치가 설정한 실용 기준에는 미치지 못했습니다.`,
      nextAction: "실무적 의미는 크지 않을 수 있습니다. 다음 측정에서 같은 방향의 변화가 이어지는지 관찰하세요.",
    };
  }
  return {
    title: "추가 관찰",
    body: "측정 오차 범위 안의 변화이며 실용 기준에도 미치지 못했습니다.",
    nextAction: "이 결과 하나만으로 훈련 계획을 바꾸기보다 다른 정보와 함께 검토하세요.",
  };
}

/** 기본 화면에 표시할 "분석 결과 한 줄 + 다음 행동 한 줄" (r5 card_short). 방향을 모르면 "변화"로 쓴다. */
export function cardShort(cardId: string, detail: string): [string, string] {
  const d = DIR_KO[detail] ?? "변화";
  switch (cardId) {
    case "CHECK_DATA":
      return ["데이터 확인이 필요합니다.", "측정 기록을 다시 확인하세요."];
    case "SECURE_SEM":
      return [
        detail === "SEM_SWC_MISSING" ? "측정 오차와 중요 변화 기준 자료가 모두 없습니다." : "측정 오차 자료가 없습니다.",
        "측정 기준 자료를 확인하세요.",
      ];
    case "SET_SWC":
      return ["중요 변화 기준이 없습니다.", "중요 변화 기준을 설정하세요."];
    case "REVIEW_PROTOCOL":
      return [`중요한 크기의 ${d}이지만 측정 오차와 구별하기 어렵습니다.`, "측정 조건 확인 및 재측정을 검토하세요."];
    case "MEANINGFUL_CHANGE":
      return [`두 기준을 모두 넘는 ${d}가 관찰되었습니다.`, "다른 체력 지표와 함께 확인하세요."];
    case "SMALL_ABOVE_MDC":
      return [`오차 기준은 넘었지만 작은 ${d}입니다.`, "다음 측정에서 추세를 확인하세요."];
    case "WITHIN_NOISE":
      return ["측정 오차 범위 안의 작은 변화입니다.", "변화를 조금 더 관찰하세요."];
    default:
      // r5 의 table[card_id] 는 모르는 카드에서 KeyError 로 멈춘다. 새 문구를 지어내지 않고 오류로 알린다.
      throw new Error(`알 수 없는 카드: ${cardId}`);
  }
}
