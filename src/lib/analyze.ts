// 분석: 프로토콜 설정 + 측정 기록(직접 입력·CSV) → 선수·프로토콜 묶음별 판정 결과
// Design Ref: §4.1 — 처리 순서 0(measurement_id 중복) → r5 판정 순서
import {
  assignDirectIds,
  findDuplicateMeasurementIds,
  groupBundles,
} from "./groupMeasurements";
import {
  buildRegistry,
  dataErrorResult,
  judge,
  type ProtocolRegistryError,
} from "./judge";
import { buildCardView } from "./selectCard";
import type {
  CardView,
  DirectRow,
  JudgeResult,
  Measurement,
  ProtocolInput,
} from "./types";

export interface BundleResult {
  key: string;
  athleteId: string;
  athleteLabel: string; // 표시명이 없으면 athleteId
  protocolId: string;
  baselineText: string; // 표시용 (없으면 빈 글자)
  currentText: string;
  swc: number | null; // 그래프에 쓰는 실용 기준
  judge: JudgeResult;
  card: CardView; // 묶음당 정확히 1개
}

export interface Analysis {
  registryErrors: ProtocolRegistryError[];
  bundles: BundleResult[];
  measurementCount: number;
}

// 완전히 빈 직접 입력 행은 분석하지 않는다 (새로 추가만 하고 아직 채우지 않은 행)
function isBlankDirect(d: DirectRow): boolean {
  return [d.athleteId, d.athleteLabel, d.protocolId, d.sessionDate, d.value].every(
    (s) => s.trim() === "",
  );
}

export function analyze(
  protocolInputs: ProtocolInput[],
  directRows: DirectRow[],
  csvRows: Measurement[],
): Analysis {
  const registry = buildRegistry(protocolInputs);
  const filledDirect = directRows.filter((d) => !isBlankDirect(d));
  const measurements = [...csvRows, ...assignDirectIds(filledDirect, csvRows)];
  const duplicateIds = findDuplicateMeasurementIds(measurements);

  const bundles: BundleResult[] = groupBundles(measurements).map((b) => {
    const proto = registry.protocols.get(b.protocolId.trim());
    const hasDuplicateId = b.rows.some((r) =>
      duplicateIds.has(r.measurementId.trim()),
    );
    const result = hasDuplicateId
      ? dataErrorResult(proto, "DUPLICATE_MEASUREMENT_ID")
      : judge(b.rows, proto);

    const base = b.rows.find((r) => r.session === "BASELINE");
    const cur = b.rows.find((r) => r.session === "CURRENT");
    const label = b.rows.map((r) => r.athleteLabel.trim()).find((s) => s !== "");
    return {
      key: b.key,
      athleteId: b.athleteId,
      athleteLabel: label ?? b.athleteId,
      protocolId: b.protocolId,
      baselineText: base ? base.value.trim() : "",
      currentText: cur ? cur.value.trim() : "",
      swc: proto ? proto.swc : null,
      judge: result,
      card: buildCardView(result),
    };
  });

  return {
    registryErrors: registry.errors,
    bundles,
    measurementCount: measurements.length,
  };
}
