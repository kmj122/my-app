// 자가 검증 (PLAN 7번): 내장 원본 사본으로 기본 판정 14건과 추가 단위 검사 11건을 채점한다.
// Design Ref: §9 — 사용자가 화면에서 SEM·SWC 를 바꿔도 결과가 달라지지 않도록, 화면 상태가 아니라
//   sampleData 의 원본 사본만 쓴다. 카드 검사(14건+4건)는 PLAN 16번에서 더한다.
import { cardShort, cardText, FOOTER, FORBIDDEN } from "./cardText";
import { mdc95 } from "./criteria";
import { fmt3 } from "./format";
import { groupMeasurements } from "./groupMeasurements";
import { buildProtocol, judge } from "./judge";
import { REASON_KO } from "./labels";
import { toFloat } from "./parseNumber";
import { buildRegistry } from "./protocolRegistry";
import {
  SAMPLE_CARD_EXPECTED,
  SAMPLE_EXPECTED,
  SAMPLE_MEASUREMENTS,
  SAMPLE_PROTOCOLS,
  type CardExpectedCase,
  type ExpectedCase,
} from "./sampleData";
import { selectCard } from "./selectCard";
import type { JudgeResult, Measurement, ProtocolInput } from "./types";

export interface SelfCheckData {
  protocols: readonly ProtocolInput[];
  measurements: readonly Measurement[];
  expected: readonly ExpectedCase[];
  cardExpected: readonly CardExpectedCase[];
}

export const SAMPLE_DATA: SelfCheckData = {
  protocols: SAMPLE_PROTOCOLS,
  measurements: SAMPLE_MEASUREMENTS,
  expected: SAMPLE_EXPECTED,
  cardExpected: SAMPLE_CARD_EXPECTED,
};

export interface Mismatch {
  caseId: string;
  item: string;
  got: string;
  want: string;
}

export interface ExpectedCheckResult {
  passed: number;
  total: number;
  mismatches: Mismatch[];
}

/** 판정 결과를 기대 결과와 같은 글자 형식 7칸으로 바꾼다. (변화량·MDC95 는 소수 셋째 자리) */
function toItems(r: JudgeResult): [string, string][] {
  return [
    ["기록 상태", r.recordStatus],
    ["사유", r.reason],
    ["변화량", fmt3(r.change)],
    ["MDC95", fmt3(r.mdc)],
    ["오차 판정", r.mdcStatus],
    ["실용 판정", r.swcStatus],
    ["민감도", r.sensitivity],
  ];
}

function wantItems(x: ExpectedCase): string[] {
  return [x.recordStatus, x.reason, x.change, x.mdc, x.mdcStatus, x.swcStatus, x.sensitivity];
}

/** 기본 판정 검사: 기대 결과 한 건마다 7칸을 글자로 비교한다. */
export function runExpectedCheck(data: Pick<SelfCheckData, "protocols" | "measurements" | "expected"> = SAMPLE_DATA): ExpectedCheckResult {
  const { protocols } = buildRegistry([...data.protocols]);
  const bundles = groupMeasurements([...data.measurements]);
  const mismatches: Mismatch[] = [];
  let passed = 0;

  for (const x of data.expected) {
    const bundle = bundles.find((b) => b.athleteId === x.athleteId && b.protocolId === x.protocolId);
    const result = judge(bundle ? bundle.rows : [], protocols.get(x.protocolId));
    const want = wantItems(x);
    const got = toItems(result);
    let ok = true;
    got.forEach(([item, value], i) => {
      if (value !== want[i]) {
        ok = false;
        mismatches.push({ caseId: x.caseId, item, got: value, want: want[i] });
      }
    });
    if (ok) passed += 1;
  }
  return { passed, total: data.expected.length, mismatches };
}

export interface UnitCheck {
  id: string;
  name: string;
  ok: boolean;
}

export interface UnitCheckResult {
  passed: number;
  total: number;
  checks: UnitCheck[];
}

/** CSV 14건이 덮지 못하는 분기를 판정 함수에 직접 값을 넣어 확인한다. (허용 범위 5~100, 기본 SEM 0.40·SWC 1.20) */
export function runUnitChecks(): UnitCheckResult {
  const proto = (sem = "0.40", swc = "1.20") =>
    buildProtocol({ protocolId: "P-X", sem, swc, plausibleMin: "5", plausibleMax: "100" });
  const rows = (...pairs: [string, string][]) => pairs.map(([session, value]) => ({ session, value }));
  const mdc = mdc95(0.4);

  const checks: UnitCheck[] = [];
  const add = (id: string, name: string, ok: boolean) => checks.push({ id, name, ok });

  const u1 = judge(rows(["BASELINE", "40"], ["CURRENT", "42"]), proto("", ""));
  add(
    "U1",
    "SEM·SWC 모두 없음",
    u1.recordStatus === "CRITERIA_MISSING" &&
      u1.reason === "SEM_SWC_MISSING" &&
      u1.mdcStatus === "NOT_ASSESSED" &&
      u1.swcStatus === "NOT_ASSESSED" &&
      u1.sensitivity === "NOT_ASSESSED",
  );

  add("U2", "SWC = MDC95 (민감도 경계)", proto("0.40", String(mdc)).sensitivity === "CAN_DETECT_SWC");

  const u3 = judge(rows(["BASELINE", "40"], ["CURRENT", String(40 + mdc)]), proto());
  add("U3", "|변화량| = MDC95 (오차 판정 경계)", u3.recordStatus === "OK" && u3.mdcStatus === "WITHIN_MDC");

  const u4 = judge(rows(["CURRENT", "42"]), proto());
  add("U4", "BASELINE 없음", u4.recordStatus === "DATA_ERROR" && u4.reason === "MISSING_SESSION");

  const u5 = judge(rows(["BASELINE", "40"], ["CURRENT", "42"], ["CURRENT", "42"]), proto());
  add("U5", "CURRENT 2건", u5.recordStatus === "DATA_ERROR" && u5.reason === "DUPLICATE_SESSION");

  const u6 = judge(rows(["BASELINE", "4.99"], ["CURRENT", "42"]), proto());
  add("U6", "최솟값 미만(4.99)", u6.recordStatus === "DATA_ERROR" && u6.reason === "OUT_OF_RANGE");

  add(
    "U7",
    "SEM이 숫자 아님(abc, Infinity, 공백, 0)",
    ["abc", "Infinity", " ", "0"].every(
      (bad) => judge(rows(["BASELINE", "40"], ["CURRENT", "42"]), proto(bad, "1.20")).reason === "SEM_MISSING",
    ),
  );

  const u8 = judge(rows(["BASELINE", "4e1"], ["CURRENT", "42"]), proto());
  add("U8", "측정값 지수 표기(4e1)", u8.recordStatus === "DATA_ERROR" && u8.reason === "NON_NUMERIC");

  add("U9", "앞뒤 공백이 있는 숫자(' 42.00 ') 인정", toFloat(" 42.00 ") === 42);

  add(
    "U10",
    "세션 이름 MID·소문자 baseline",
    [
      rows(["BASELINE", "40"], ["MID", "41"], ["CURRENT", "42"]),
      rows(["baseline", "40"], ["CURRENT", "42"]),
    ].every((r) => judge(r, proto()).reason === "INVALID_SESSION"),
  );

  const base: ProtocolInput = { protocolId: "P-X", sem: "0.40", swc: "1.20", plausibleMin: "5", plausibleMax: "100" };
  const hasError = (list: ProtocolInput[]) => buildRegistry(list).errors.length > 0;
  add(
    "U11",
    "허용 범위 숫자 아님·역전, 프로토콜 이름 중복·빈칸 → 설정 오류",
    hasError([{ ...base, plausibleMax: "abc" }]) &&
      hasError([{ ...base, plausibleMin: "100", plausibleMax: "5" }]) &&
      hasError([base, { ...base }]) &&
      hasError([{ ...base, protocolId: " " }]) &&
      !hasError([base]),
  );

  return { passed: checks.filter((c) => c.ok).length, total: checks.length, checks };
}

export interface CardCheckResult {
  passed: number;
  total: number;
  mismatches: { caseId: string; got: string; want: string }[];
}

/** 카드 기대 결과 검사: 기대 카드 한 건마다 (카드, 세부값)을 비교한다. (r5 card_checks 앞부분) */
export function runCardExpectedCheck(data: SelfCheckData = SAMPLE_DATA): CardCheckResult {
  const { protocols } = buildRegistry([...data.protocols]);
  const bundles = groupMeasurements([...data.measurements]);
  const mismatches: CardCheckResult["mismatches"] = [];
  let passed = 0;
  for (const x of data.cardExpected) {
    const bundle = bundles.find((b) => b.athleteId === x.athleteId && b.protocolId === x.protocolId);
    const s = selectCard(judge(bundle ? bundle.rows : [], protocols.get(x.protocolId)));
    if (s.card === x.card && s.detail === x.detail) passed += 1;
    else mismatches.push({ caseId: x.caseId, got: `${s.card},${s.detail}`, want: `${x.card},${x.detail}` });
  }
  return { passed, total: data.cardExpected.length, mismatches };
}

/** 카드 전용 검사 C1~C4 (r5 와 같은 입력). C1~C3 은 카드 선택, C4 는 모든 카드 문구의 금지 표현·40자 검사. */
export function runCardUnitChecks(): UnitCheckResult {
  const proto = (sem = "0.40", swc = "1.20") =>
    buildProtocol({ protocolId: "P-X", sem, swc, plausibleMin: "5", plausibleMax: "100" });
  const rows = (b: string, c: string) => [
    { session: "BASELINE", value: b },
    { session: "CURRENT", value: c },
  ];
  const is = (r: JudgeResult, card: string, detail: string) => {
    const s = selectCard(r);
    return s.card === card && s.detail === detail;
  };
  const checks: UnitCheck[] = [];
  const add = (id: string, name: string, ok: boolean) => checks.push({ id, name, ok });

  add("C1", "6번 카드: P-A 40→41.15 (오차 초과·실용 미달)", is(judge(rows("40", "41.15"), proto()), "SMALL_ABOVE_MDC", "INCREASE"));
  add("C2", "SEM·SWC 모두 없음", is(judge(rows("40", "42"), proto("", "")), "SECURE_SEM", "SEM_SWC_MISSING"));
  add("C3", "4번 카드 감소: P-B 40→38", is(judge(rows("40", "38"), proto("1.00", "1.20")), "REVIEW_PROTOCOL", "DECREASE"));

  const combos: [string, string][] = [
    ...Object.keys(REASON_KO).map((r): [string, string] => ["CHECK_DATA", r]),
    ["SECURE_SEM", "SEM_MISSING"],
    ["SECURE_SEM", "SEM_SWC_MISSING"],
    ["SET_SWC", ""],
    ["WITHIN_NOISE", ""],
    ...["REVIEW_PROTOCOL", "MEANINGFUL_CHANGE", "SMALL_ABOVE_MDC"].flatMap((card): [string, string][] => [
      [card, "INCREASE"],
      [card, "DECREASE"],
    ]),
  ];
  let c4 = true;
  for (const [card, detail] of combos) {
    const t = cardText(card, detail);
    const short = cardShort(card, detail);
    const all = [t.title, t.body, t.nextAction, ...short, FOOTER].join(" ");
    if (FORBIDDEN.some((w) => all.includes(w))) c4 = false;
    if (short.some((line) => [...line].length > 40)) c4 = false;
  }
  add("C4", `카드 문구 ${combos.length}종 금지 표현 검사, 기본 화면 한 줄 40자 이하`, c4);

  return { passed: checks.filter((x) => x.ok).length, total: checks.length, checks };
}

/** 기대 결과 두 파일의 사례가 빠짐없이·중복 없이·같은 선수·프로토콜로 들어 있는지 확인한다. 문제 목록을 돌려준다. (r5 completeness_checks) */
export function runCompletenessCheck(data: SelfCheckData = SAMPLE_DATA): string[] {
  const problems: string[] = [];
  const dup = (vals: string[]) => [...new Set(vals.filter((v, i) => vals.indexOf(v) !== i))].sort();
  const labels: [string, { caseId: string; athleteId: string; protocolId: string }[]][] = [
    ["기대 결과", [...data.expected]],
    ["카드 기대 결과", [...data.cardExpected]],
  ];
  for (const [label, list] of labels) {
    const d = dup(list.map((r) => r.caseId));
    if (d.length) problems.push(`${label}: 사례 번호 중복 ${d.join(", ")}`);
    const k = dup(list.map((r) => `${r.athleteId}|${r.protocolId}`));
    if (k.length) problems.push(`${label}: 같은 선수·프로토콜 묶음 중복 ${k.join(", ")}`);
  }
  const exp = new Map(data.expected.map((r) => [r.caseId, `${r.athleteId}|${r.protocolId}`]));
  const card = new Map(data.cardExpected.map((r) => [r.caseId, `${r.athleteId}|${r.protocolId}`]));
  const missing = [...exp.keys()].filter((id) => !card.has(id)).sort();
  const extra = [...card.keys()].filter((id) => !exp.has(id)).sort();
  if (missing.length) problems.push(`카드 기대 결과: 빠진 사례 ${missing.join(", ")}`);
  if (extra.length) problems.push(`카드 기대 결과: 기대 결과에 없는 사례 ${extra.join(", ")}`);
  const mism = [...exp.keys()].filter((id) => card.has(id) && exp.get(id) !== card.get(id)).sort();
  if (mism.length) problems.push(`두 기대 결과의 선수·프로토콜 불일치 ${mism.join(", ")}`);
  return problems;
}

export interface SelfCheckReport {
  expected: ExpectedCheckResult;
  units: UnitCheckResult;
  cards: CardCheckResult;
  cardUnits: UnitCheckResult;
  completeness: string[];
  allPassed: boolean;
}

/** 자가 검증 전체 실행: 기대 결과 14, 추가 검사 11, 카드 14, 카드 검사 4 와 누락·중복 확인 */
export function runSelfCheck(): SelfCheckReport {
  const expected = runExpectedCheck();
  const units = runUnitChecks();
  const cards = runCardExpectedCheck();
  const cardUnits = runCardUnitChecks();
  const completeness = runCompletenessCheck();
  const allPassed =
    expected.passed === expected.total &&
    units.passed === units.total &&
    cards.passed === cards.total &&
    cardUnits.passed === cardUnits.total &&
    completeness.length === 0;
  return { expected, units, cards, cardUnits, completeness, allPassed };
}
