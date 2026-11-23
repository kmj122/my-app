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

// ---- 판정 함수가 주고받는 구조 (PLAN 6번) ----

/** 화면 ①에서 입력한 프로토콜 한 줄. 모두 글자 그대로 보관한다. (숫자 읽기는 buildProtocol 에서) */
export interface ProtocolInput {
  protocolId: string;
  sem: string;
  semSource?: string; // SEM 근거 (판정에는 쓰지 않는다)
  swc: string;
  swcBasis?: string; // SWC 근거 (판정에는 쓰지 않는다)
  plausibleMin: string;
  plausibleMax: string;
}

/** 측정 기록 한 줄 (화면 ② 한 줄 / CSV 한 줄). 값은 입력 그대로 보관한다. */
export interface Measurement {
  measurementId: string;
  athleteId: string;
  athleteLabel?: string;
  protocolId: string;
  session: string; // 허용값 검사는 판정 단계에서 (INVALID_SESSION)
  sessionDate?: string;
  value: string; // 숫자 읽기는 판정 단계에서 (NON_NUMERIC)
}

/** 화면 ②에서 직접 입력한 기록 한 줄. measurement_id 는 입력하지 않고 분석할 때 앱이 붙인다. */
export interface DirectEntry {
  athleteId: string;
  athleteLabel: string;
  protocolId: string;
  session: string;
  sessionDate: string;
  value: string;
}

/** 판정에 쓰는 프로토콜. SEM·SWC 가 없거나 0 이하이면 null. MDC95·민감도는 프로토콜의 속성이다. */
export interface Protocol {
  protocolId: string;
  sem: number | null;
  swc: number | null;
  mdc: number | null;
  sensitivity: Sensitivity;
  min: number;
  max: number;
}

/** 한 선수·프로토콜 묶음에 속한 기록 한 줄. 입력 그대로(글자) 보관하고 판정 단계에서 검사한다. */
export interface JudgeRow {
  session: string;
  value: string;
}

/** 묶음 1개의 판정 결과. change·mdc 는 반올림하지 않은 값(없으면 null). */
export interface JudgeResult {
  recordStatus: RecordStatus;
  reason: DataErrorReason | CriteriaReason | "";
  change: number | null;
  mdc: number | null;
  mdcStatus: MdcStatus;
  swcStatus: SwcStatus;
  sensitivity: Sensitivity;
}
