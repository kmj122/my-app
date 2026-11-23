// ATHLETE SIGNAL 판정 값·오류 코드·카드 이름 (PLAN 3번)
// Design Ref: §4.1, §4.2 — 이름은 verify_athlete_signal_v1_1_r5.py 와 같고, 상수 목록은 한곳에서만 정의한다.
// 값 목록은 `as const` 배열로 두고, 타입은 그 배열에서 만든다. (목록과 타입이 어긋나지 않게)

/** 측정 기록의 세션 이름. 이 두 가지만 허용한다 (대소문자 구분). */
export const SESSIONS = ["BASELINE", "CURRENT"] as const;
export type Session = (typeof SESSIONS)[number];

/** 선수·프로토콜 묶음의 기록 상태 */
export const RECORD_STATUSES = ["OK", "CRITERIA_MISSING", "DATA_ERROR"] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/**
 * 기록 오류 사유 (RecordStatus 가 DATA_ERROR 일 때). 검사하는 순서대로 적었다.
 * DUPLICATE_MEASUREMENT_ID 는 r5에 없는 PRD 확정 검사이며 가장 먼저 확인한다.
 */
export const DATA_ERROR_REASONS = [
  "DUPLICATE_MEASUREMENT_ID",
  "UNKNOWN_PROTOCOL",
  "INVALID_SESSION",
  "MISSING_SESSION",
  "DUPLICATE_SESSION",
  "NON_NUMERIC",
  "OUT_OF_RANGE",
] as const;
export type DataErrorReason = (typeof DATA_ERROR_REASONS)[number];

/** 판단 기준(SEM·SWC)이 없을 때의 사유 (RecordStatus 가 CRITERIA_MISSING 일 때) */
export const CRITERIA_REASONS = [
  "SEM_MISSING",
  "SWC_MISSING",
  "SEM_SWC_MISSING",
] as const;
export type CriteriaReason = (typeof CRITERIA_REASONS)[number];

/** 측정 오차 기준(MDC95) 판정 */
export const MDC_STATUSES = [
  "NOT_ASSESSED",
  "WITHIN_MDC",
  "ABOVE_MDC_INCREASE",
  "ABOVE_MDC_DECREASE",
] as const;
export type MdcStatus = (typeof MDC_STATUSES)[number];

/** 중요 변화 기준(SWC) 판정 */
export const SWC_STATUSES = [
  "NOT_ASSESSED",
  "BELOW_SWC",
  "MEETS_SWC_INCREASE",
  "MEETS_SWC_DECREASE",
] as const;
export type SwcStatus = (typeof SWC_STATUSES)[number];

/** 측정 민감도: MDC95 가 SWC 이하이면 SWC 크기의 변화를 감지할 수 있다 */
export const SENSITIVITIES = [
  "CAN_DETECT_SWC",
  "CANNOT_DETECT_SWC",
  "NOT_ASSESSED",
] as const;
export type Sensitivity = (typeof SENSITIVITIES)[number];

/** 코치 후속 행동 카드 7종. 선택 우선순위 ①~⑦ 순서대로 적었다. 임의로 바꾸거나 늘리지 않는다. */
export const CARD_IDS = [
  "CHECK_DATA", // ① 기록 오류
  "SECURE_SEM", // ② SEM 없음
  "SET_SWC", // ③ SWC 없음
  "REVIEW_PROTOCOL", // ④ 오차 이내 + 실용 충족
  "MEANINGFUL_CHANGE", // ⑤ 오차 초과 + 실용 충족
  "SMALL_ABOVE_MDC", // ⑥ 오차 초과 + 실용 미달
  "WITHIN_NOISE", // ⑦ 그 밖의 모든 경우
] as const;
export type CardId = (typeof CARD_IDS)[number];
