// 내장 원본 사본 (PLAN 7번): 가상 프로토콜 4개, 측정값 28행, 기대 결과 14건
// Design Ref: §6 — protocols.csv · measurements.csv · expected_results.csv 와 글자 하나까지 같아야 한다.
// 값을 바꿔야 하면 Python 스크립트(verify_athlete_signal_v1_1_r5.py)로 먼저 확인한다.
// tests/sampleData.test.ts 가 실제 CSV 파일과 같은지 확인한다. 화면에서 수정하지 않으며 public 폴더에는 두지 않는다.
import type { Measurement, ProtocolInput } from "./types";

const SEM_SRC_A = "가상값(검사-재검사 신뢰도 연구가 있다고 가정)";
const SWC_BASIS = "가상값(코치가 설정한 실용적 기준)";

export const SAMPLE_PROTOCOLS: readonly ProtocolInput[] = [
  { protocolId: "P-A", sem: "0.40", semSource: SEM_SRC_A, swc: "1.20", swcBasis: SWC_BASIS, plausibleMin: "5", plausibleMax: "100" },
  { protocolId: "P-B", sem: "1.00", semSource: "가상값(다른 장비·최고값 사용 가정)", swc: "1.20", swcBasis: SWC_BASIS, plausibleMin: "5", plausibleMax: "100" },
  { protocolId: "P-C", sem: "", semSource: "근거 미확보", swc: "1.20", swcBasis: SWC_BASIS, plausibleMin: "5", plausibleMax: "100" },
  { protocolId: "P-D", sem: "0.40", semSource: SEM_SRC_A, swc: "", swcBasis: "기준 미설정", plausibleMin: "5", plausibleMax: "100" },
];

function m(
  measurementId: string,
  athleteNo: string,
  protocolId: string,
  session: string,
  sessionDate: string,
  value: string,
): Measurement {
  return {
    measurementId,
    athleteId: `A${athleteNo}`,
    athleteLabel: `가상선수 ${athleteNo}`,
    protocolId,
    session,
    sessionDate,
    value,
  };
}

const B = "2026-09-01";
const C = "2026-11-01";

export const SAMPLE_MEASUREMENTS: readonly Measurement[] = [
  m("M001", "01", "P-A", "BASELINE", B, "40.00"),
  m("M002", "01", "P-A", "CURRENT", C, "42.00"),
  m("M003", "02", "P-B", "BASELINE", B, "40.00"),
  m("M004", "02", "P-B", "CURRENT", C, "42.00"),
  m("M005", "03", "P-A", "BASELINE", B, "38.00"),
  m("M006", "03", "P-A", "CURRENT", C, "38.50"),
  m("M007", "04", "P-A", "BASELINE", B, "45.00"),
  m("M008", "04", "P-A", "CURRENT", C, "43.20"),
  m("M009", "05", "P-B", "BASELINE", B, "40.00"),
  m("M010", "05", "P-B", "CURRENT", C, "42.77"),
  m("M011", "06", "P-B", "BASELINE", B, "40.00"),
  m("M012", "06", "P-B", "CURRENT", C, "42.78"),
  m("M013", "07", "P-A", "BASELINE", B, "40.00"),
  m("M014", "07", "P-A", "CURRENT", C, "41.20"),
  m("M015", "08", "P-A", "BASELINE", B, "40.00"),
  m("M016", "09", "P-A", "BASELINE", B, "40.00"),
  m("M017", "09", "P-A", "CURRENT", C, "420"),
  m("M018", "10", "P-C", "BASELINE", B, "40.00"),
  m("M019", "10", "P-C", "CURRENT", C, "42.00"),
  m("M020", "11", "P-A", "BASELINE", B, "40.00"),
  m("M021", "11", "P-A", "BASELINE", "2026-09-02", "41.00"),
  m("M022", "11", "P-A", "CURRENT", C, "42.00"),
  m("M023", "12", "P-A", "BASELINE", B, "40.00"),
  m("M024", "12", "P-A", "CURRENT", C, "측정실패"),
  m("M025", "13", "P-Z", "BASELINE", B, "40.00"),
  m("M026", "13", "P-Z", "CURRENT", C, "42.00"),
  m("M027", "14", "P-D", "BASELINE", B, "40.00"),
  m("M028", "14", "P-D", "CURRENT", C, "42.00"),
];

/** 기대 결과 한 줄. 변화량·MDC95 는 소수 셋째 자리 글자이고, 해당 없으면 빈 글자다. */
export interface ExpectedCase {
  caseId: string;
  athleteId: string;
  protocolId: string;
  recordStatus: string;
  reason: string;
  change: string;
  mdc: string;
  mdcStatus: string;
  swcStatus: string;
  sensitivity: string;
}

function e(
  caseId: string,
  athleteNo: string,
  protocolId: string,
  recordStatus: string,
  reason: string,
  change: string,
  mdc: string,
  mdcStatus: string,
  swcStatus: string,
  sensitivity: string,
): ExpectedCase {
  return { caseId, athleteId: `A${athleteNo}`, protocolId, recordStatus, reason, change, mdc, mdcStatus, swcStatus, sensitivity };
}

const NA = "NOT_ASSESSED";
const CAN = "CAN_DETECT_SWC";
const CANNOT = "CANNOT_DETECT_SWC";
const UP = "ABOVE_MDC_INCREASE";
const SWC_UP = "MEETS_SWC_INCREASE";

/** 카드 기대 결과 한 줄 (card_expected_results.csv 의 사본, PLAN 16번). detail 은 없으면 빈 글자. */
export interface CardExpectedCase {
  caseId: string;
  athleteId: string;
  protocolId: string;
  card: string;
  detail: string;
}

function c(caseId: string, athleteNo: string, protocolId: string, card: string, detail: string): CardExpectedCase {
  return { caseId, athleteId: `A${athleteNo}`, protocolId, card, detail };
}

export const SAMPLE_CARD_EXPECTED: readonly CardExpectedCase[] = [
  c("T01", "01", "P-A", "MEANINGFUL_CHANGE", "INCREASE"),
  c("T02", "02", "P-B", "REVIEW_PROTOCOL", "INCREASE"),
  c("T03", "03", "P-A", "WITHIN_NOISE", ""),
  c("T04", "04", "P-A", "MEANINGFUL_CHANGE", "DECREASE"),
  c("T05", "05", "P-B", "REVIEW_PROTOCOL", "INCREASE"),
  c("T06", "06", "P-B", "MEANINGFUL_CHANGE", "INCREASE"),
  c("T07", "07", "P-A", "MEANINGFUL_CHANGE", "INCREASE"),
  c("T08", "08", "P-A", "CHECK_DATA", "MISSING_SESSION"),
  c("T09", "09", "P-A", "CHECK_DATA", "OUT_OF_RANGE"),
  c("T10", "10", "P-C", "SECURE_SEM", "SEM_MISSING"),
  c("T11", "11", "P-A", "CHECK_DATA", "DUPLICATE_SESSION"),
  c("T12", "12", "P-A", "CHECK_DATA", "NON_NUMERIC"),
  c("T13", "13", "P-Z", "CHECK_DATA", "UNKNOWN_PROTOCOL"),
  c("T14", "14", "P-D", "SET_SWC", ""),
];

export const SAMPLE_EXPECTED: readonly ExpectedCase[] = [
  e("T01", "01", "P-A", "OK", "", "2.000", "1.109", UP, SWC_UP, CAN),
  e("T02", "02", "P-B", "OK", "", "2.000", "2.772", "WITHIN_MDC", SWC_UP, CANNOT),
  e("T03", "03", "P-A", "OK", "", "0.500", "1.109", "WITHIN_MDC", "BELOW_SWC", CAN),
  e("T04", "04", "P-A", "OK", "", "-1.800", "1.109", "ABOVE_MDC_DECREASE", "MEETS_SWC_DECREASE", CAN),
  e("T05", "05", "P-B", "OK", "", "2.770", "2.772", "WITHIN_MDC", SWC_UP, CANNOT),
  e("T06", "06", "P-B", "OK", "", "2.780", "2.772", UP, SWC_UP, CANNOT),
  e("T07", "07", "P-A", "OK", "", "1.200", "1.109", UP, SWC_UP, CAN),
  e("T08", "08", "P-A", "DATA_ERROR", "MISSING_SESSION", "", "1.109", NA, NA, CAN),
  e("T09", "09", "P-A", "DATA_ERROR", "OUT_OF_RANGE", "", "1.109", NA, NA, CAN),
  e("T10", "10", "P-C", "CRITERIA_MISSING", "SEM_MISSING", "2.000", "", NA, SWC_UP, NA),
  e("T11", "11", "P-A", "DATA_ERROR", "DUPLICATE_SESSION", "", "1.109", NA, NA, CAN),
  e("T12", "12", "P-A", "DATA_ERROR", "NON_NUMERIC", "", "1.109", NA, NA, CAN),
  e("T13", "13", "P-Z", "DATA_ERROR", "UNKNOWN_PROTOCOL", "", "", NA, NA, NA),
  e("T14", "14", "P-D", "CRITERIA_MISSING", "SWC_MISSING", "2.000", "1.109", UP, NA, NA),
];
