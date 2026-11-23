// PLAN 7번 확인: 기본 판정 14건 + 추가 단위 검사 11건 (내장 원본 사본으로 채점)
import { describe, expect, it } from "vitest";
import { SAMPLE_EXPECTED } from "@/lib/sampleData";
import { runExpectedCheck, runUnitChecks, SAMPLE_DATA } from "@/lib/selfCheck";

describe("기본 판정 14건 (T01~T14, 7칸씩 = 98칸)", () => {
  const result = runExpectedCheck();

  it("14/14 통과, 불일치 0건", () => {
    expect(result.mismatches).toEqual([]);
    expect(result.passed).toBe(14);
    expect(result.total).toBe(14);
  });

  // 실패하면 어느 사례인지 바로 보이도록 사례마다 따로 확인한다.
  for (const x of SAMPLE_EXPECTED) {
    it(`${x.caseId} ${x.protocolId}`, () => {
      expect(result.mismatches.filter((m) => m.caseId === x.caseId)).toEqual([]);
    });
  }
});

describe("추가 단위 검사 11건 (U1~U11)", () => {
  const result = runUnitChecks();

  it("11/11 통과", () => {
    expect(result.total).toBe(11);
    expect(result.passed).toBe(11);
  });

  for (const c of result.checks) {
    it(`${c.id} ${c.name}`, () => {
      expect(c.ok).toBe(true);
    });
  }
});

describe("음성 대조: 틀린 기대값을 정확히 잡아내는가", () => {
  it("T02 오차 판정을 일부러 바꾸면 불일치 1건", () => {
    const tampered = {
      ...SAMPLE_DATA,
      expected: SAMPLE_EXPECTED.map((x) =>
        x.caseId === "T02" ? { ...x, mdcStatus: "ABOVE_MDC_INCREASE" } : x,
      ),
    };
    const r = runExpectedCheck(tampered);
    expect(r.passed).toBe(13);
    expect(r.mismatches).toEqual([
      { caseId: "T02", item: "오차 판정", got: "WITHIN_MDC", want: "ABOVE_MDC_INCREASE" },
    ]);
  });

  it("SEM 을 바꾼 프로토콜 사본을 넘기면 결과가 달라진다 (원본 사본은 그대로)", () => {
    const changed = {
      ...SAMPLE_DATA,
      protocols: SAMPLE_DATA.protocols.map((p) => (p.protocolId === "P-B" ? { ...p, sem: "0.40" } : p)),
    };
    expect(runExpectedCheck(changed).passed).toBeLessThan(14);
    expect(runExpectedCheck().passed).toBe(14); // 원본 사본은 영향 없음
  });
});
