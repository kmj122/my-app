// 측정 기록 정리: 직접 입력 행에 번호 붙이기, measurement_id 중복 찾기, 선수·프로토콜로 묶기
// Design Ref: §4.1, §11 — 판정 단위는 (athlete_id, protocol_id) 묶음이다.
import type { DirectEntry, Measurement } from "./types";

/** 완전히 빈 직접 입력 행(추가만 하고 아직 채우지 않은 행)인지. 세션 기본값은 보지 않는다. */
export function isBlankDirect(d: DirectEntry): boolean {
  return [d.athleteId, d.athleteLabel, d.protocolId, d.sessionDate, d.value].every((s) => s.trim() === "");
}

/**
 * 직접 입력 행에 DIRECT-1, DIRECT-2 … 번호를 붙여 측정 기록으로 바꾼다.
 * CSV 에서 읽은 measurement_id 와 같은 번호는 건너뛰어 충돌하지 않게 한다.
 */
export function assignDirectIds(direct: readonly DirectEntry[], csvRows: readonly Measurement[]): Measurement[] {
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
    };
  });
}

/** 두 번 이상 나온 measurement_id 목록. 빈칸 ID 는 검사하지 않는다. */
export function findDuplicateMeasurementIds(rows: readonly Measurement[]): Set<string> {
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
  /** 화면 ④에서 이 묶음을 가리키는 키 */
  key: string;
  athleteId: string;
  protocolId: string;
  rows: Measurement[];
}

/** 같은 athlete_id·protocol_id 의 기록을 한 묶음으로 모은다. 처음 나온 순서를 지킨다. */
export function groupMeasurements(measurements: readonly Measurement[]): Bundle[] {
  const map = new Map<string, Bundle>();
  for (const m of measurements) {
    const key = JSON.stringify([m.athleteId, m.protocolId]);
    let bundle = map.get(key);
    if (!bundle) {
      bundle = { key, athleteId: m.athleteId, protocolId: m.protocolId, rows: [] };
      map.set(key, bundle);
    }
    bundle.rows.push(m);
  }
  return [...map.values()];
}
