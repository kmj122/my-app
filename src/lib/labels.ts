// 화면에 보여 줄 한글 이름표와 숫자 표시 규칙 (PLAN 12번)
// 상태 문구는 개발 착수 패키지 3.1절 "화면 문구"를, 기록 오류 사유는 r5 스크립트의 REASON_KO 를 글자 그대로 쓴다.
// (DUPLICATE_MEASUREMENT_ID 는 r5 에 없는 PRD 확정 검사라 새 문구를 추가했다.)
import { fixed3 } from "./format";
import type { CriteriaReason, DataErrorReason, MdcStatus, RecordStatus, Sensitivity, SwcStatus } from "./types";

/** 변화량 표시: 부호(+/−)를 붙이고 소수 셋째 자리까지. 없으면 "—". 0.000 은 부호 없이 표시한다. */
export function formatSigned(v: number | null): string {
  if (v === null) return "—";
  const t = fixed3(Math.abs(v));
  if (t === "0.000") return t;
  return `${v > 0 ? "+" : "−"}${t}`;
}

/** 부호 없는 숫자(MDC95, SWC 등)를 소수 셋째 자리까지. 없으면 "—". */
export function format3(v: number | null): string {
  return v === null ? "—" : fixed3(v);
}

export const RECORD_STATUS_KO: Record<RecordStatus, string> = {
  OK: "판정 가능",
  DATA_ERROR: "데이터 확인 필요",
  CRITERIA_MISSING: "측정 기준 일부 미확보",
};

export const MDC_STATUS_KO: Record<MdcStatus, string> = {
  ABOVE_MDC_INCREASE: "설정한 측정 오차 기준을 초과하는 증가가 관찰됨",
  ABOVE_MDC_DECREASE: "설정한 측정 오차 기준을 초과하는 감소가 관찰됨",
  WITHIN_MDC: "측정 오차 범위 이내의 변화",
  NOT_ASSESSED: "판정 보류",
};

export const SWC_STATUS_KO: Record<SwcStatus, string> = {
  MEETS_SWC_INCREASE: "코치가 정한 실용 기준 이상의 증가",
  MEETS_SWC_DECREASE: "코치가 정한 실용 기준 이상의 감소",
  BELOW_SWC: "실용 기준 미만의 변화",
  NOT_ASSESSED: "판정 보류",
};

export const SENSITIVITY_KO: Record<Sensitivity, string> = {
  CAN_DETECT_SWC: "SWC 감지 가능",
  CANNOT_DETECT_SWC: "SWC 감지 불가",
  NOT_ASSESSED: "판정 보류",
};

/** 기록 오류 사유 (r5 REASON_KO 원문 + 측정 번호 중복) */
export const REASON_KO: Record<DataErrorReason, string> = {
  DUPLICATE_MEASUREMENT_ID: "같은 측정 번호(measurement_id)가 중복됨",
  UNKNOWN_PROTOCOL: "등록되지 않은 측정 방식",
  INVALID_SESSION: "세션 이름 오류",
  MISSING_SESSION: "이전 또는 현재 측정값 없음",
  DUPLICATE_SESSION: "같은 세션의 기록 중복",
  NON_NUMERIC: "숫자가 아닌 측정값",
  OUT_OF_RANGE: "허용 범위를 벗어난 측정값",
};

/** 판단 기준(SEM·SWC)이 없을 때의 사유 */
export const CRITERIA_REASON_KO: Record<CriteriaReason, string> = {
  SEM_MISSING: "측정 오차(SEM) 없음",
  SWC_MISSING: "중요 변화 기준(SWC) 없음",
  SEM_SWC_MISSING: "측정 오차(SEM)와 중요 변화 기준(SWC) 모두 없음",
};

/** 판정 결과의 사유를 한글로 (없으면 빈 글자) */
export function reasonKo(reason: DataErrorReason | CriteriaReason | ""): string {
  if (reason === "") return "";
  if (reason in REASON_KO) return REASON_KO[reason as DataErrorReason];
  return CRITERIA_REASON_KO[reason as CriteriaReason];
}
