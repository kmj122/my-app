// PLAN 4번 확인: 엄격한 숫자 읽기 (r5 단위 검사 U8 지수 표기, U9 앞뒤 공백 숫자와 같은 규칙)
import { describe, expect, it } from "vitest";
import { toFloat, toPositiveFloat } from "@/lib/parseNumber";

describe("toFloat: 숫자로 인정하는 값", () => {
  const cases: [string, number][] = [
    ["42.00", 42],
    ["42", 42],
    [" 42.00 ", 42], // 앞뒤 공백은 허용 (U9)
    ["\t42\n", 42],
    ["+1.5", 1.5],
    ["-1.8", -1.8],
    [".5", 0.5],
    ["5.", 5],
    ["0", 0],
    ["-0.0", -0],
  ];
  for (const [text, want] of cases) {
    it(`${JSON.stringify(text)} → ${want}`, () => {
      expect(toFloat(text)).toBe(want);
    });
  }
});

describe("toFloat: 숫자가 아닌 값은 null", () => {
  const bad = [
    "45,3", // 쉼표
    "1,000",
    "0.45(m)", // 단위
    "40cm",
    "4e1", // 지수 표기 (U8)
    "4E1",
    "Infinity",
    "-Infinity",
    "NaN",
    "1_0", // 밑줄
    "", // 빈칸
    "   ", // 공백만 있는 값
    "abc",
    "측정실패",
    "--1",
    "+-1",
    "1.2.3",
    "0x10",
    ".",
    "+",
  ];
  for (const text of bad) {
    it(`${JSON.stringify(text)} → null`, () => {
      expect(toFloat(text)).toBeNull();
    });
  }

  it("null·undefined 도 null", () => {
    expect(toFloat(null)).toBeNull();
    expect(toFloat(undefined)).toBeNull();
  });
});

describe("toPositiveFloat: 0 이하는 null", () => {
  it("양수는 그대로", () => {
    expect(toPositiveFloat("0.4")).toBe(0.4);
    expect(toPositiveFloat(" 1.20 ")).toBe(1.2);
  });

  it("0, 음수, 숫자가 아닌 값은 null", () => {
    for (const text of ["0", "0.0", "-1", "-0.5", "abc", "", " ", "Infinity", "4e1"]) {
      expect(toPositiveFloat(text)).toBeNull();
    }
  });
});
