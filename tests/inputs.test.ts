// 입력 처리 테스트 (r5에 없는 추가 검사): 숫자 읽기, CSV 파일 구조, measurement_id 중복, 직접 입력 ID 자동 부여
import { describe, expect, it } from "vitest";
import { CsvFileError, decodeUtf8, parseCsvText, parseMeasurementsCsv } from "@/lib/csv";
import { assignDirectIds, findDuplicateMeasurementIds, groupBundles } from "@/lib/groupMeasurements";
import { toFloat, toPositiveFloat } from "@/lib/parseNumber";
import type { DirectRow, Measurement } from "@/lib/types";

const enc = (s: string) => new TextEncoder().encode(s);

describe("엄격한 숫자 읽기", () => {
  it("정상 숫자는 인정한다", () => {
    for (const [text, want] of [["42.00", 42], [" 42.00 ", 42], ["+1.5", 1.5], ["-1.8", -1.8], [".5", 0.5], ["5.", 5]] as const) {
      expect(toFloat(text)).toBe(want);
    }
  });

  it("쉼표·단위·지수·Infinity·NaN·밑줄·빈칸은 숫자가 아니다", () => {
    for (const bad of ["45,3", "0.45(m)", "4e1", "Infinity", "NaN", "1_0", "", "  ", "abc", "--1"]) {
      expect(toFloat(bad)).toBeNull();
    }
  });

  it("양수 읽기: 0 이하는 null", () => {
    expect(toPositiveFloat("0")).toBeNull();
    expect(toPositiveFloat("-1")).toBeNull();
    expect(toPositiveFloat("0.4")).toBe(0.4);
  });
});

describe("CSV 읽기", () => {
  const header = "measurement_id,athlete_id,athlete_label,protocol_id,session,session_date,value";

  it("정상 파일(BOM·CRLF 포함)을 읽는다", () => {
    const text = `﻿${header}\r\nM1,A01,가상선수 01,P-A,BASELINE,2026-09-01,40.00\r\nM2,A01,가상선수 01,P-A,CURRENT,2026-11-01,42.00\r\n`;
    const out = parseMeasurementsCsv(enc(text));
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ measurementId: "M1", athleteLabel: "가상선수 01", session: "BASELINE", value: "40.00", source: "csv" });
  });

  it("선택 열(athlete_label, session_date)이 없어도 읽는다", () => {
    const out = parseMeasurementsCsv(enc("measurement_id,athlete_id,protocol_id,session,value\nM1,A01,P-A,BASELINE,40\n"));
    expect(out[0]).toMatchObject({ athleteLabel: "", sessionDate: "" });
  });

  it("따옴표 안의 쉼표를 한 칸으로 읽는다", () => {
    expect(parseCsvText('a,"b,c",d\n')).toEqual([["a", "b,c", "d"]]);
  });

  it("필수 열이 빠지면 파일 전체를 거부한다", () => {
    expect(() => parseMeasurementsCsv(enc("measurement_id,athlete_id,protocol_id,session\nM1,A01,P-A,BASELINE\n"))).toThrow(CsvFileError);
  });

  it("열 이름이 다르면(오타) 파일 전체를 거부한다", () => {
    expect(() => parseMeasurementsCsv(enc("measurement_id,athlete_id,protocol_id,session,valu\nM1,A01,P-A,BASELINE,40\n"))).toThrow(CsvFileError);
  });

  it("UTF-8로 읽을 수 없으면 파일 전체를 거부한다", () => {
    expect(() => decodeUtf8(new Uint8Array([0xff, 0xfe, 0xc0, 0x80]))).toThrow(CsvFileError);
  });

  it("빈 파일·닫히지 않은 따옴표는 파일 전체를 거부한다", () => {
    expect(() => parseMeasurementsCsv(enc(""))).toThrow(CsvFileError);
    expect(() => parseCsvText('a,"b\nc')).toThrow(CsvFileError);
  });

  it("숫자 형식 오류(45,3)는 파일 오류가 아니라 값 그대로 읽는다", () => {
    const out = parseMeasurementsCsv(enc('measurement_id,athlete_id,protocol_id,session,value\nM1,A01,P-A,BASELINE,"45,3"\n'));
    expect(out[0].value).toBe("45,3");
  });
});

function m(id: string, athlete = "A01", protocol = "P-A", session = "BASELINE", source: "csv" | "direct" = "csv"): Measurement {
  return { measurementId: id, athleteId: athlete, athleteLabel: "", protocolId: protocol, session, sessionDate: "", value: "40", source };
}

describe("measurement_id 중복 검사", () => {
  it("두 번 이상 나온 ID를 찾는다", () => {
    expect([...findDuplicateMeasurementIds([m("M1"), m("M2"), m("M1", "A02")])]).toEqual(["M1"]);
  });

  it("중복이 없으면 비어 있다", () => {
    expect(findDuplicateMeasurementIds([m("M1"), m("M2")]).size).toBe(0);
  });

  it("빈칸 ID는 검사하지 않는다", () => {
    expect(findDuplicateMeasurementIds([m(""), m("  "), m("M1")]).size).toBe(0);
  });
});

describe("직접 입력 행의 measurement_id 자동 부여", () => {
  const d = (uid: string): DirectRow => ({ uid, athleteId: "A01", athleteLabel: "", protocolId: "P-A", session: "BASELINE", sessionDate: "", value: "40" });

  it("DIRECT-1, DIRECT-2 … 로 겹치지 않게 붙인다", () => {
    const out = assignDirectIds([d("a"), d("b")], []);
    expect(out.map((x) => x.measurementId)).toEqual(["DIRECT-1", "DIRECT-2"]);
    expect(out.every((x) => x.source === "direct")).toBe(true);
  });

  it("CSV에서 읽은 ID와 같은 번호는 건너뛴다", () => {
    const out = assignDirectIds([d("a"), d("b")], [m("DIRECT-1"), m("DIRECT-3")]);
    expect(out.map((x) => x.measurementId)).toEqual(["DIRECT-2", "DIRECT-4"]);
    expect(findDuplicateMeasurementIds([...out, m("DIRECT-1"), m("DIRECT-3")]).size).toBe(0);
  });
});

describe("선수·프로토콜 묶기", () => {
  it("같은 선수·프로토콜 기록을 한 묶음으로 모으고 처음 나온 순서를 지킨다", () => {
    const bundles = groupBundles([m("1", "A01", "P-A"), m("2", "A02", "P-A"), m("3", "A01", "P-A"), m("4", "A01", "P-B")]);
    expect(bundles.map((b) => `${b.athleteId}/${b.protocolId}/${b.rows.length}`)).toEqual(["A01/P-A/2", "A02/P-A/1", "A01/P-B/1"]);
  });
});
