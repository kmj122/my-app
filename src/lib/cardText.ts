// 코치 후속 행동 카드 문구 — verify_athlete_signal_v1_1_r5.py 의 확정 원문을 그대로 옮긴 것이다.
// Design Ref: §6 — 앱은 이 문구를 그대로 사용하고, 실행 중에 새로운 문구를 만들지 않는다.
// 문구를 바꾸려면 r5 스크립트의 원문과 함께 바꿔야 한다. (임의 수정 금지)
import type { CardId } from "./types";

// 기록 오류 사유의 쉬운 말. DUPLICATE_MEASUREMENT_ID 는 r5에 없는 PRD 확정 검사라 새로 붙인 문구다.
export const REASON_KO: Record<string, string> = {
  UNKNOWN_PROTOCOL: "등록되지 않은 측정 방식",
  INVALID_SESSION: "세션 이름 오류",
  MISSING_SESSION: "이전 또는 현재 측정값 없음",
  DUPLICATE_SESSION: "같은 세션의 기록 중복",
  NON_NUMERIC: "숫자가 아닌 측정값",
  OUT_OF_RANGE: "허용 범위를 벗어난 측정값",
  DUPLICATE_MEASUREMENT_ID: "같은 측정 번호(measurement_id)가 중복됨",
};

export const DIR_KO: Record<string, string> = { INCREASE: "증가", DECREASE: "감소" };

export const FOOTER =
  "변화의 원인은 앱이 판단하지 않습니다. 이 결과만으로 훈련 효과나 경기력 향상을 확정할 수 없습니다.";

// 카드 문구에 들어가면 안 되는 표현 (카드 전용 검사 C4)
export const FORBIDDEN = [
  "향상 확정",
  "향상되었습니다",
  "입증",
  "부상",
  "피로",
  "처방",
  "바꾸세요",
  "효과가 있",
];

/** 자세히 보기에 표시할 제목·본문·다음 행동 */
export function cardText(cardId: CardId, detail: string): [string, string, string] {
  const d = DIR_KO[detail] ?? "";
  if (cardId === "CHECK_DATA") {
    return [
      "데이터 확인 필요",
      `이 선수의 기록은 판정하지 않았습니다(사유: ${REASON_KO[detail] ?? detail}).`,
      "원자료(측정 장비 기록)를 확인한 뒤 값을 다시 입력하세요.",
    ];
  }
  if (cardId === "SECURE_SEM") {
    if (detail === "SEM_SWC_MISSING") {
      return [
        "측정 기준 확보 필요",
        "이 측정 방식의 측정 오차(SEM)와 실용 기준(SWC)이 모두 없어 두 판정을 모두 보류했습니다.",
        "같은 장비·절차로 얻은 검사-재검사 신뢰도 자료로 SEM을 입력하고, SWC도 근거를 두고 설정하세요.",
      ];
    }
    return [
      "측정 기준 확보 필요",
      "이 측정 방식의 측정 오차(SEM) 근거가 없어 오차 기준 판정을 보류했습니다.",
      "같은 장비·절차로 얻은 검사-재검사 신뢰도 자료로 SEM을 입력하세요.",
    ];
  }
  if (cardId === "SET_SWC") {
    return [
      "실용 기준 설정 필요",
      "코치가 정한 실용 기준(SWC)이 없어 실용 기준 판정을 보류했습니다.",
      "종목과 선수 수준을 고려해 근거를 두고 SWC를 설정하세요.",
    ];
  }
  if (cardId === "REVIEW_PROTOCOL") {
    return [
      "측정 방식 점검 필요",
      `${d}폭이 코치가 설정한 실용 기준에는 도달했지만, 현재 측정 방식의 오차 기준은 넘지 못했습니다.`,
      "동일한 조건에서 재측정하거나 현재 장비와 측정 절차의 신뢰도 자료를 확인하세요. " +
        "더 정밀한 측정 방법이 필요한지는 코치가 검토합니다.",
    ];
  }
  if (cardId === "MEANINGFUL_CHANGE") {
    return [
      `두 기준을 넘는 ${d} 관찰`,
      `설정한 측정 오차 기준과 실용 기준을 모두 넘는 ${d}가 관찰되었습니다.`,
      "측정 조건이 같았는지 먼저 확인하고, 다른 수행 지표·훈련 기록과 함께 해석하세요. " +
        "다음 정기 측정에서 다시 확인하세요.",
    ];
  }
  if (cardId === "SMALL_ABOVE_MDC") {
    return [
      "오차는 넘었지만 실용 기준 미만",
      `설정한 측정 오차 기준을 넘는 ${d}가 관찰되었으나, 코치가 설정한 실용 기준에는 미치지 못했습니다.`,
      "실무적 의미는 크지 않을 수 있습니다. 다음 측정에서 같은 방향의 변화가 이어지는지 관찰하세요.",
    ];
  }
  return [
    "추가 관찰",
    "측정 오차 범위 안의 변화이며 실용 기준에도 미치지 못했습니다.",
    "이 결과 하나만으로 훈련 계획을 바꾸기보다 다른 정보와 함께 검토하세요.",
  ];
}

/** 기본 화면에 표시할 '분석 결과 한 줄 + 다음 행동 한 줄' (각 40자 이하) */
export function cardShort(cardId: CardId, detail: string): [string, string] {
  const d = DIR_KO[detail] ?? "변화";
  const table: Record<CardId, [string, string]> = {
    CHECK_DATA: ["데이터 확인이 필요합니다.", "측정 기록을 다시 확인하세요."],
    SECURE_SEM: [
      detail === "SEM_SWC_MISSING"
        ? "측정 오차와 중요 변화 기준 자료가 모두 없습니다."
        : "측정 오차 자료가 없습니다.",
      "측정 기준 자료를 확인하세요.",
    ],
    SET_SWC: ["중요 변화 기준이 없습니다.", "중요 변화 기준을 설정하세요."],
    REVIEW_PROTOCOL: [
      `중요한 크기의 ${d}이지만 측정 오차와 구별하기 어렵습니다.`,
      "측정 조건 확인 및 재측정을 검토하세요.",
    ],
    MEANINGFUL_CHANGE: [`두 기준을 모두 넘는 ${d}가 관찰되었습니다.`, "다른 체력 지표와 함께 확인하세요."],
    SMALL_ABOVE_MDC: [`오차 기준은 넘었지만 작은 ${d}입니다.`, "다음 측정에서 추세를 확인하세요."],
    WITHIN_NOISE: ["측정 오차 범위 안의 작은 변화입니다.", "변화를 조금 더 관찰하세요."],
  };
  return table[cardId];
}
