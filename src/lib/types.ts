// ATHLETE SIGNAL 공통 데이터 형식 (DESIGN.md 4.2)
// Design Ref: §4.2 — 판정 결과·오류 코드·카드 7종 이름을 한곳에 정의한다.

export type Session = "BASELINE" | "CURRENT";

export type RecordStatus = "OK" | "CRITERIA_MISSING" | "DATA_ERROR";

// 선수·프로토콜 묶음의 기록 오류 사유 (DUPLICATE_MEASUREMENT_ID는 r5에 없는 PRD 확정 검사)
export type DataErrorReason =
  | "DUPLICATE_MEASUREMENT_ID"
  | "UNKNOWN_PROTOCOL"
  | "INVALID_SESSION"
  | "MISSING_SESSION"
  | "DUPLICATE_SESSION"
  | "NON_NUMERIC"
  | "OUT_OF_RANGE";

// 판단 기준이 없을 때의 사유
export type CriteriaReason = "SEM_MISSING" | "SWC_MISSING" | "SEM_SWC_MISSING";

export type MdcStatus =
  | "NOT_ASSESSED"
  | "WITHIN_MDC"
  | "ABOVE_MDC_INCREASE"
  | "ABOVE_MDC_DECREASE";

export type SwcStatus =
  | "NOT_ASSESSED"
  | "BELOW_SWC"
  | "MEETS_SWC_INCREASE"
  | "MEETS_SWC_DECREASE";

export type Sensitivity =
  | "CAN_DETECT_SWC"
  | "CANNOT_DETECT_SWC"
  | "NOT_ASSESSED";

export type CardId =
  | "CHECK_DATA"
  | "SECURE_SEM"
  | "SET_SWC"
  | "REVIEW_PROTOCOL"
  | "MEANINGFUL_CHANGE"
  | "SMALL_ABOVE_MDC"
  | "WITHIN_NOISE";

// 화면 ①에서 입력한 프로토콜 한 줄 (입력한 글자 그대로 보관)
export interface ProtocolInput {
  uid: string;
  protocolId: string;
  sem: string;
  swc: string;
  plausibleMin: string;
  plausibleMax: string;
}

// 계산이 끝난 프로토콜
export interface Protocol {
  protocolId: string;
  sem: number | null; // 없거나 숫자가 아니거나 0 이하이면 null
  swc: number | null;
  mdc: number | null; // 1.96 × SEM × √2
  sensitivity: Sensitivity;
  min: number; // plausible_min
  max: number; // plausible_max
}

// 화면 ②의 직접 입력 한 줄 (measurement_id는 분석할 때 앱이 붙인다)
export interface DirectRow {
  uid: string;
  athleteId: string;
  athleteLabel: string;
  protocolId: string;
  session: string;
  sessionDate: string;
  value: string;
}

// 분석에 쓰는 측정 기록 한 줄 (CSV 또는 직접 입력)
export interface Measurement {
  measurementId: string;
  athleteId: string;
  athleteLabel: string;
  protocolId: string;
  session: string; // 허용값 검사는 판정 단계에서 한다 (INVALID_SESSION)
  sessionDate: string;
  value: string; // 입력 그대로 보관, 숫자 읽기는 판정 단계에서 한다
  source: "direct" | "csv";
}

// 묶음 1개의 판정 결과
export interface JudgeResult {
  recordStatus: RecordStatus;
  reason: DataErrorReason | CriteriaReason | "";
  change: number | null; // 계산 중 반올림하지 않는다
  mdc: number | null;
  mdcStatus: MdcStatus;
  swcStatus: SwcStatus;
  sensitivity: Sensitivity;
}

// 판정에 넘기는 기록 (measurement_id 등은 판정에 필요하지 않다)
export interface JudgeRow {
  session: string;
  value: string;
}

// 화면에 그대로 쓰는 카드 문구
export interface CardView {
  cardId: CardId;
  detail: string; // INCREASE / DECREASE / 오류 사유 등
  shortLines: [string, string]; // 기본 화면: 결과 한 줄, 다음 행동 한 줄 (각 40자 이하)
  title: string; // 자세히 보기
  body: string;
  nextAction: string;
}
