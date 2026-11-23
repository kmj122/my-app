// 소수 셋째 자리 표시 테스트 — 정답은 Python r5 의 f"{v:.3f}" 결과를 그대로 옮긴 것이다.
// (판정 공식·비교 기준과는 무관하고, 화면 표시 결과만 r5 와 맞춘다.)
import { describe, expect, it } from "vitest";
import { fixed3 } from "@/lib/format";
import { fmt3 } from "@/lib/judge";
import { formatSigned, format3 } from "@/lib/labels";

// [값, Python 결과]
const PYTHON_ORACLE: [number, string][] = [
  [0.0625, "0.062"], // 정확히 절반: 짝수(62)로
  [0.1875, "0.188"], // 187.5 → 188 (짝수)
  [0.3125, "0.312"],
  [0.4375, "0.438"],
  [0.5625, "0.562"],
  [0.6875, "0.688"],
  [0.8125, "0.812"],
  [0.9375, "0.938"],
  [1.0625, "1.062"],
  [2.0625, "2.062"],
  [12.0625, "12.062"],
  [-0.0625, "-0.062"],
  [-0.1875, "-0.188"],
  [-2.0625, "-2.062"],
  [1000000.0625, "1000000.062"],
  // 절반이 아닌 값은 그대로
  [0.0, "0.000"],
  [-0.0, "-0.000"],
  [2.772, "2.772"],
  [1.109, "1.109"],
  [0.0005, "0.001"],
  [0.0015, "0.002"],
  [1.005, "1.005"],
  [2.675, "2.675"],
  [0.5, "0.500"],
  [1.2, "1.200"],
  [-1.8, "-1.800"],
  [2.77, "2.770"],
  [2.78, "2.780"],
];

describe("소수 셋째 자리 표시 (Python r5 와 같은 결과)", () => {
  for (const [v, want] of PYTHON_ORACLE) {
    it(`${Object.is(v, -0) ? "-0" : v} → ${want}`, () => {
      expect(fixed3(v)).toBe(want);
    });
  }

  it("판정 표시 함수들도 같은 반올림을 쓴다", () => {
    expect(fmt3(0.0625)).toBe("0.062");
    expect(fmt3(null)).toBe("");
    expect(format3(0.3125)).toBe("0.312");
    expect(format3(null)).toBe("—");
    expect(formatSigned(2.0625)).toBe("+2.062");
    expect(formatSigned(-2.0625)).toBe("−2.062");
    expect(formatSigned(0)).toBe("0.000");
    expect(formatSigned(null)).toBe("—");
  });
});
