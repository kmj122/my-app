// 측정 기록 정리: 직접 입력 행에 ID 붙이기, measurement_id 중복 찾기, 선수·프로토콜로 묶기
import type { DirectRow, Measurement } from "./types";

/**
 * 직접 입력 행에 DIRECT-1, DIRECT-2 … 번호를 붙인다.
 * CSV에서 읽은 measurement_id 와 같은 번호는 건너뛰어 충돌하지 않게 한다.
 */
export function assignDirectIds(
  direct: DirectRow[],
  csvRows: Measurement[],
): Measurement[] {
  const used = new Set(csvRows.map((m) => m.measurementId.trim()));
  let n = 0;
  return direct.map((d) => {
    let id: string;
    do {
      n += 1;
      id = `DIRECT-${n}`;
    } while (used.has(id));
    used.add(id);
    return {
      measurementId: id,
      athleteId: d.athleteId,
      athleteLabel: d.athleteLabel,
      protocolId: d.protocolId,
      session: d.session,
      sessionDate: d.sessionDate,
      value: d.value,
      source: "direct" as const,
    };
  });
}

/** 두 번 이상 나온 measurement_id 목록. 빈칸 ID는 검사하지 않는다. */
export function findDuplicateMeasurementIds(rows: Measurement[]): Set<string> {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const m of rows) {
    const id = m.measurementId.trim();
    if (!id) continue;
    if (seen.has(id)) dup.add(id);
    else seen.add(id);
  }
  return dup;
}

export interface Bundle {
  key: string;
  athleteId: string;
  protocolId: string;
  rows: Measurement[];
}

/** 같은 athlete_id·protocol_id 의 기록을 한 묶음으로 모은다. 처음 나온 순서를 유지한다. */
export function groupBundles(rows: Measurement[]): Bundle[] {
  const map = new Map<string, Bundle>();
  for (const m of rows) {
    const key = `${m.athleteId}\u0000${m.protocolId}`;
    let b = map.get(key);
    if (!b) {
      b = { key, athleteId: m.athleteId, protocolId: m.protocolId, rows: [] };
      map.set(key, b);
    }
    b.rows.push(m);
  }
  return [...map.values()];
}
