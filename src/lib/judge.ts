// 기록 오류 검사와 SEM·SWC 보류 처리 (PLAN 6번)
// Design Ref: §4.1 — verify_athlete_signal_v1_1_r5.py 의 판정 순서를 그대로 따른다.
//   (선수+프로토콜 묶기, measurement_id 중복 검사, 프로토콜 이름 중복 검사는 묶기·화면 단계에서 한다.)
import { change, judgeMdc, judgeSwc, mdc95, sensitivity } from "./criteria";
import { toFloat, toPositiveFloat } from "./parseNumber";
import type {
  CriteriaReason,
  DataErrorReason,
  JudgeResult,
  JudgeRow,
  Protocol,
  ProtocolInput,
} from "./types";

/** 허용 범위가 숫자가 아니거나 최솟값이 최댓값보다 작지 않을 때 */
export class ProtocolConfigError extends Error {}

/**
 * 프로토콜 입력 한 줄을 판정용 프로토콜로 바꾼다.
 * SEM·SWC 가 비었거나 숫자가 아니거나 0 이하이면 "없음"(null)으로 두고, 있는 값으로 MDC95·민감도를 계산한다.
 * 허용 범위가 잘못되면 ProtocolConfigError.
 */
export function buildProtocol(input: ProtocolInput): Protocol {
  const sem = toPositiveFloat(input.sem);
  const swc = toPositiveFloat(input.swc);
  const mdc = sem !== null ? mdc95(sem) : null;

  const min = toFloat(input.plausibleMin);
  const max = toFloat(input.plausibleMax);
  if (min === null || max === null || min >= max) {
    throw new ProtocolConfigError(
      `프로토콜 ${input.protocolId.trim() || "?"}: 허용 범위(최솟값·최댓값)가 숫자가 아니거나 최솟값이 최댓값보다 작지 않습니다.`,
    );
  }

  return {
    protocolId: input.protocolId.trim(),
    sem,
    swc,
    mdc,
    sensitivity: sensitivity(mdc, swc),
    min,
    max,
  };
}

/** 기록 오류 결과: 판정을 중단하고 변화량과 두 판정은 비운다. MDC95·민감도는 프로토콜 속성이라 그대로 알려 준다. */
function dataError(proto: Protocol | undefined, reason: DataErrorReason): JudgeResult {
  return {
    recordStatus: "DATA_ERROR",
    reason,
    change: null,
    mdc: proto ? proto.mdc : null,
    mdcStatus: "NOT_ASSESSED",
    swcStatus: "NOT_ASSESSED",
    sensitivity: proto ? proto.sensitivity : "NOT_ASSESSED",
  };
}

/** 한 선수·한 프로토콜의 기록 묶음을 판정 순서대로 처리한다. */
export function judge(rows: JudgeRow[], proto: Protocol | undefined): JudgeResult {
  // 1) 프로토콜 존재 여부
  if (!proto) return dataError(proto, "UNKNOWN_PROTOCOL");

  // 2) 세션 이름: BASELINE, CURRENT 외의 값(대소문자 다름 포함)이 하나라도 있으면 오류
  if (rows.some((r) => r.session !== "BASELINE" && r.session !== "CURRENT")) {
    return dataError(proto, "INVALID_SESSION");
  }

  // 3) 세션 개수: BASELINE 1건, CURRENT 1건
  const base = rows.filter((r) => r.session === "BASELINE");
  const cur = rows.filter((r) => r.session === "CURRENT");
  if (base.length === 0 || cur.length === 0) return dataError(proto, "MISSING_SESSION");
  if (base.length > 1 || cur.length > 1) return dataError(proto, "DUPLICATE_SESSION");

  // 4) 숫자 여부
  const b = toFloat(base[0].value);
  const c = toFloat(cur[0].value);
  if (b === null || c === null) return dataError(proto, "NON_NUMERIC");

  // 5) 허용 범위
  for (const v of [b, c]) {
    if (v < proto.min || v > proto.max) return dataError(proto, "OUT_OF_RANGE");
  }

  // 6) 변화량 = 현재 − 이전
  const delta = change(b, c);

  // 7) 기준 확보 여부: 없는 쪽 판정만 보류하고, 있는 쪽 판정은 계속한다.
  let recordStatus: JudgeResult["recordStatus"] = "OK";
  let reason: CriteriaReason | "" = "";
  if (proto.sem === null && proto.swc === null) {
    recordStatus = "CRITERIA_MISSING";
    reason = "SEM_SWC_MISSING";
  } else if (proto.sem === null) {
    recordStatus = "CRITERIA_MISSING";
    reason = "SEM_MISSING";
  } else if (proto.swc === null) {
    recordStatus = "CRITERIA_MISSING";
    reason = "SWC_MISSING";
  }

  return {
    recordStatus,
    reason,
    change: delta,
    mdc: proto.mdc,
    // 8) 오차 판정(SEM 이 있을 때)  9) 실용 판정(SWC 가 있을 때)
    mdcStatus: proto.mdc !== null ? judgeMdc(delta, proto.mdc) : "NOT_ASSESSED",
    swcStatus: proto.swc !== null ? judgeSwc(delta, proto.swc) : "NOT_ASSESSED",
    sensitivity: proto.sensitivity,
  };
}
