// 선수·프로토콜 묶기 (PLAN 7번에서 필요해 먼저 만든 최소 기능)
// Design Ref: §4.1 — 판정 단위는 (athlete_id, protocol_id) 묶음이다.
import type { Measurement } from "./types";

export interface Bundle {
  athleteId: string;
  protocolId: string;
  rows: Measurement[];
}

/** 기록을 athlete_id + protocol_id 로 묶는다. 묶음은 처음 나온 순서를 지킨다. */
export function groupMeasurements(measurements: Measurement[]): Bundle[] {
  const map = new Map<string, Bundle>();
  for (const m of measurements) {
    const key = JSON.stringify([m.athleteId, m.protocolId]);
    let bundle = map.get(key);
    if (!bundle) {
      bundle = { athleteId: m.athleteId, protocolId: m.protocolId, rows: [] };
      map.set(key, bundle);
    }
    bundle.rows.push(m);
  }
  return [...map.values()];
}
