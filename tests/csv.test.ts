// PLAN 8번 확인: CSV 읽기 — UTF-8, 필수 열, 파일 전체 거부
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CsvFileError,
  decodeUtf8,
  parseCsvText,
  parseMeasurementsCsv,
  readCsvRecords,
} from "@/lib/csv";
import { SAMPLE_MEASUREMENTS } from "@/lib/sampleData";

const enc = (s: string) => new TextEncoder().encode(s);
const HEADER = "measurement_id,athlete_id,protocol_id,session,value";

describe("decodeUtf8", () => {
  it("한글 UTF-8 은 그대로", () => expect(decodeUtf8(enc("측정실패"))).toBe("측정실패"));
  it("맨 앞 BOM 은 제거", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...enc("a,b")]);
    expect(decodeUtf8(bytes)).toBe("a,b");
  });
  it("UTF-8 이 아닌 바이트(CP949 '가')는 파일 오류", () => {
    expect(() => decodeUtf8(new Uint8Array([0xb0, 0xa1]))).toThrow(CsvFileError);
  });
});

describe("parseCsvText", () => {
  it("쉼표와 줄바꿈(\\n, \\r\\n, \\r)", () => {
    expect(parseCsvText("a,b\n1,2\r\n3,4\r5,6")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
      ["5", "6"],
    ]);
  });
  it("마지막 줄 끝에 줄바꿈이 없어도 읽는다", () => {
    expect(parseCsvText("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("완전히 빈 줄은 건너뛴다", () => {
    expect(parseCsvText("a\n\n1\n\n")).toEqual([["a"], ["1"]]);
  });
  it("따옴표 안의 쉼표·줄바꿈·겹따옴표", () => {
    expect(parseCsvText('a,b\n"x,y","l1\nl2"\n"say ""hi""",z')).toEqual([
      ["a", "b"],
      ["x,y", "l1\nl2"],
      ['say "hi"', "z"],
    ]);
  });
  it("빈 칸은 빈 글자", () => {
    expect(parseCsvText("a,b,c\n1,,3")).toEqual([["a", "b", "c"], ["1", "", "3"]]);
  });
  it("따옴표가 닫히지 않으면 파일 오류", () => {
    expect(() => parseCsvText('a,b\n"x,y')).toThrow(CsvFileError);
  });
  it("값은 글자 그대로(공백·0 유지)", () => {
    expect(parseCsvText("v\n 42.00 \n007")).toEqual([["v"], [" 42.00 "], ["007"]]);
  });
});

describe("readCsvRecords: 필수 열 검사", () => {
  it("빈 파일은 파일 오류", () => {
    expect(() => readCsvRecords("", ["a"])).toThrow(CsvFileError);
  });
  it("필수 열이 빠지면 어떤 열인지 알려 주고 거부", () => {
    expect(() => readCsvRecords("a,b\n1,2", ["a", "c"], "시험 파일")).toThrow(/시험 파일.*\(c\)/);
  });
  it("열 이름이 다르면(대소문자·띄어쓰기) 거부", () => {
    expect(() => readCsvRecords("Value,a\n1,2", ["value"])).toThrow(CsvFileError);
    expect(() => readCsvRecords("value ,a\n1,2", ["value"])).toThrow(CsvFileError);
  });
  it("필수 열이 두 번 나오면 거부", () => {
    expect(() => readCsvRecords("a,a\n1,2", ["a"])).toThrow(CsvFileError);
  });
  it("열 순서가 달라도, 추가 열이 있어도 읽는다", () => {
    expect(readCsvRecords("b,x,a\n2,9,1", ["a", "b"])).toEqual([{ a: "1", b: "2", x: "9" }]);
  });
  it("칸이 모자란 줄은 빈 값으로 채운다", () => {
    expect(readCsvRecords("a,b\n1", ["a", "b"])).toEqual([{ a: "1", b: "" }]);
  });
  it("모든 칸이 빈 줄(,,)은 건너뛴다", () => {
    expect(readCsvRecords("a,b\n1,2\n,\n3,4", ["a", "b"])).toHaveLength(2);
  });
  it("머리글만 있으면 기록 0건 (오류 아님)", () => {
    expect(readCsvRecords("a,b", ["a", "b"])).toEqual([]);
  });
});

describe("parseMeasurementsCsv", () => {
  it("필수 열 5개만 있어도 읽고, 선택 열은 빈 글자", () => {
    const r = parseMeasurementsCsv(enc(`${HEADER}\nM1,A1,P-A,BASELINE,40.00`));
    expect(r).toEqual([
      {
        measurementId: "M1",
        athleteId: "A1",
        athleteLabel: "",
        protocolId: "P-A",
        session: "BASELINE",
        sessionDate: "",
        value: "40.00",
      },
    ]);
  });
  it("값·세션·프로토콜은 다듬지 않고 그대로 (판정 단계에서 검사)", () => {
    const r = parseMeasurementsCsv(enc(`${HEADER}\nM1,A1, P-A ,baseline, 4e1 `));
    expect(r[0].protocolId).toBe(" P-A ");
    expect(r[0].session).toBe("baseline");
    expect(r[0].value).toBe(" 4e1 ");
  });
  it("필수 열 하나가 없으면 파일 전체 거부", () => {
    expect(() => parseMeasurementsCsv(enc("measurement_id,athlete_id,protocol_id,session\nM1,A1,P-A,BASELINE"))).toThrow(
      /\(value\)/,
    );
  });
  it("UTF-8 이 아니면 파일 전체 거부", () => {
    expect(() => parseMeasurementsCsv(new Uint8Array([0xb0, 0xa1]))).toThrow(CsvFileError);
  });
  it("실제 measurements.csv 28행이 내장 사본과 같다", () => {
    const bytes = readFileSync(path.join(process.cwd(), "measurements.csv"));
    expect(parseMeasurementsCsv(bytes)).toEqual(SAMPLE_MEASUREMENTS);
  });
});
