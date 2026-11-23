// 분석 (PLAN 12번): 프로토콜 설정 + 측정 기록(직접 입력·CSV) → 선수·프로토콜 묶음별 판정 결과
// Design Ref: §4.1 — 처리 순서 0(measurement_id 중복) → r5 판정 순서. 코치 후속 행동 카드는 PLAN 14~16번에서 더한다.
import { assignDirectIds, findDuplicateMeasurementIds, groupMeasurements, isBlankDirect } from "./groupMeasurements";
import { dataError, judge } from "./judge";
import { buildRegistry, type ProtocolRegistryError } from "./protocolRegistry";
import type { DirectEntry, JudgeResult, Measurement, ProtocolInput } from "./types";

export interface BundleResult {
  key: string;
  athleteId: string;
  /** 표시명. 없으면 athleteId */
  athleteLabel: string;
  protocolId: string;
  /** 표시용 입력 글자 (없으면 빈 글자) */
  baselineText: string;
  currentText: string;
  /** 그래프에 쓰는 실용 기준 (없으면 null) */
  swc: number | null;
  judge: JudgeResult;
}

export interface Analysis {
  registryErrors: ProtocolRegistryError[];
  bundles: BundleResult[];
  measurementCount: number;
}

export function analyze(
  protocolInputs: readonly ProtocolInput[],
  directRows: readonly DirectEntry[],
  csvRows: readonly Measurement[],
): Analysis {
  const registry = buildRegistry([...protocolInputs]);
  const filledDirect = directRows.filter((d) => !isBlankDirect(d));
  const measurements = [...csvRows, ...assignDirectIds(filledDirect, csvRows)];
  const duplicateIds = findDuplicateMeasurementIds(measurements);

  const bundles: BundleResult[] = groupMeasurements(measurements).map((b) => {
    // r5 처럼 측정 기록의 protocol_id 는 공백을 지우지 않는다. "P-A " 는 "P-A" 와 다른 ID 라서 UNKNOWN_PROTOCOL 이 된다.
    const proto = registry.protocols.get(b.protocolId);
    const hasDuplicateId = b.rows.some((r) => duplicateIds.has(r.measurementId.trim()));
    const result = hasDuplicateId ? dataError(proto, "DUPLICATE_MEASUREMENT_ID") : judge(b.rows, proto);

    const base = b.rows.find((r) => r.session === "BASELINE");
    const cur = b.rows.find((r) => r.session === "CURRENT");
    const label = b.rows.map((r) => (r.athleteLabel ?? "").trim()).find((s) => s !== "");
    return {
      key: b.key,
      athleteId: b.athleteId,
      athleteLabel: label ?? b.athleteId,
      protocolId: b.protocolId,
      baselineText: base ? base.value.trim() : "",
      currentText: cur ? cur.value.trim() : "",
      swc: proto ? proto.swc : null,
      judge: result,
    };
  });

  return { registryErrors: registry.errors, bundles, measurementCount: measurements.length };
}
