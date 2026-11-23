// PLAN 7번 확인: 소수 셋째 자리 표시가 Python f"{v:.3f}" 와 같은지
import { describe, expect, it } from "vitest";
import { fixed3, fmt3 } from "@/lib/format";

describe("fixed3: 일반 값", () => {
  const cases: [number, string][] = [
    [2, "2.000"],
    [0.5, "0.500"],
    [-1.8000000000000007, "-1.800"], // 43.2 - 45
    [2.769999999999996, "2.770"], // 42.77 - 40 (T05)
    [2.780000000000001, "2.780"], // T06
    [1.2000000000000028, "1.200"], // T07
    [1.10874, "1.109"],
    [2.77186, "2.772"],
    [0, "0.000"],
  ];
  for (const [v, want] of cases) {
    it(`${v} → ${want}`, () => expect(fixed3(v)).toBe(want));
  }
});

describe("fixed3: 정확히 절반인 값은 Python 처럼 가까운 짝수로", () => {
  const cases: [number, string][] = [
    [0.0625, "0.062"],
    [0.1875, "0.188"],
    [0.3125, "0.312"],
    [-0.0625, "-0.062"],
  ];
  for (const [v, want] of cases) {
    it(`${v} → ${want}`, () => expect(fixed3(v)).toBe(want));
  }
});

describe("fixed3: 부호", () => {
  it("-0 은 '-0.000' (Python 과 같음)", () => expect(fixed3(-0)).toBe("-0.000"));
  it("아주 작은 음수도 '-0.000'", () => expect(fixed3(-1e-12)).toBe("-0.000"));
});

describe("fmt3: 없으면 빈 글자", () => {
  it("null → ''", () => expect(fmt3(null)).toBe(""));
  it("값 → 셋째 자리", () => expect(fmt3(2)).toBe("2.000"));
});
