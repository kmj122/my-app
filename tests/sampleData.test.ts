// PLAN 7번 확인: 내장 원본 사본이 실제 CSV 파일과 글자 하나까지 같은지
// (CSV 는 이 테스트에서만 읽는다. 앱의 CSV 읽기 기능은 PLAN 8번에서 만든다.)
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SAMPLE_EXPECTED, SAMPLE_MEASUREMENTS, SAMPLE_PROTOCOLS } from "@/lib/sampleData";

/** 이 CSV 3개에는 따옴표가 없어서 쉼표로 나누는 간단한 읽기로 충분하다. (테스트 전용) */
function readCsv(name: string): Record<string, string>[] {
  const text = readFileSync(path.join(process.cwd(), name), "utf8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    expect(cells.length).toBe(header.length);
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });
}

describe("내장 사본 = 실제 CSV", () => {
  it("protocols.csv: 4행", () => {
    const rows = readCsv("protocols.csv");
    expect(SAMPLE_PROTOCOLS.length).toBe(rows.length);
    rows.forEach((r, i) => {
      const p = SAMPLE_PROTOCOLS[i];
      expect(p).toMatchObject({
        protocolId: r.protocol_id,
        sem: r.sem_cm,
        semSource: r.sem_source,
        swc: r.swc_cm,
        swcBasis: r.swc_basis,
        plausibleMin: r.plausible_min,
        plausibleMax: r.plausible_max,
      });
    });
  });

  it("measurements.csv: 28행", () => {
    const rows = readCsv("measurements.csv");
    expect(rows.length).toBe(28);
    expect(SAMPLE_MEASUREMENTS.length).toBe(rows.length);
    rows.forEach((r, i) => {
      expect(SAMPLE_MEASUREMENTS[i]).toEqual({
        measurementId: r.measurement_id,
        athleteId: r.athlete_id,
        athleteLabel: r.athlete_label,
        protocolId: r.protocol_id,
        session: r.session,
        sessionDate: r.session_date,
        value: r.value,
      });
    });
  });

  it("expected_results.csv: 14행", () => {
    const rows = readCsv("expected_results.csv");
    expect(rows.length).toBe(14);
    expect(SAMPLE_EXPECTED.length).toBe(rows.length);
    rows.forEach((r, i) => {
      expect(SAMPLE_EXPECTED[i]).toEqual({
        caseId: r.case_id,
        athleteId: r.athlete_id,
        protocolId: r.protocol_id,
        recordStatus: r.expected_record_status,
        reason: r.expected_reason,
        change: r.expected_change,
        mdc: r.expected_mdc,
        mdcStatus: r.expected_mdc_status,
        swcStatus: r.expected_swc_status,
        sensitivity: r.expected_sensitivity,
      });
    });
  });
});
