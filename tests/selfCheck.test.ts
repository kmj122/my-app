// PLAN 7번 확인: 기본 판정 14건 + 추가 단위 검사 11건 (내장 원본 사본으로 채점)
import { describe, expect, it } from "vitest";
import { SAMPLE_CARD_EXPECTED, SAMPLE_EXPECTED } from "@/lib/sampleData";
import {
  runCardExpectedCheck,
  runCardUnitChecks,
  runCompletenessCheck,
  runExpectedCheck,
  runSelfCheck,
  runUnitChecks,
  SAMPLE_DATA,
} from "@/lib/selfCheck";

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

describe("카드 기대 결과 14건 (PLAN 16번)", () => {
  const result = runCardExpectedCheck();
  it("14/14 통과, 불일치 0건", () => {
    expect(result.mismatches).toEqual([]);
    expect(result.passed).toBe(14);
    expect(result.total).toBe(14);
  });
  for (const x of SAMPLE_CARD_EXPECTED) {
    it(`${x.caseId} ${x.card}${x.detail ? ` (${x.detail})` : ""}`, () => {
      expect(result.mismatches.filter((m) => m.caseId === x.caseId)).toEqual([]);
    });
  }
});

describe("카드 전용 검사 4건 (C1~C4)", () => {
  const result = runCardUnitChecks();
  it("4/4 통과", () => {
    expect(result.total).toBe(4);
    expect(result.passed).toBe(4);
    expect(result.checks.map((c) => c.id)).toEqual(["C1", "C2", "C3", "C4"]);
  });
  for (const c of result.checks) {
    it(`${c.id} ${c.name}`, () => expect(c.ok).toBe(true));
  }
});

describe("누락·중복·불일치 확인과 전체 실행", () => {
  it("예시 데이터는 문제 없음", () => expect(runCompletenessCheck()).toEqual([]));
  it("카드 기대 결과가 한 건 빠지면 알려 준다", () => {
    const p = runCompletenessCheck({ ...SAMPLE_DATA, cardExpected: SAMPLE_CARD_EXPECTED.slice(1) });
    expect(p).toEqual(["카드 기대 결과: 빠진 사례 T01"]);
  });
  it("사례 번호가 겹치면 알려 준다", () => {
    const p = runCompletenessCheck({ ...SAMPLE_DATA, cardExpected: [...SAMPLE_CARD_EXPECTED, SAMPLE_CARD_EXPECTED[0]] });
    expect(p.some((t) => t.includes("사례 번호 중복 T01"))).toBe(true);
  });
  it("선수·프로토콜이 서로 다르면 알려 준다", () => {
    const p = runCompletenessCheck({
      ...SAMPLE_DATA,
      cardExpected: SAMPLE_CARD_EXPECTED.map((x) => (x.caseId === "T03" ? { ...x, protocolId: "P-B" } : x)),
    });
    expect(p).toEqual(["두 기대 결과의 선수·프로토콜 불일치 T03"]);
  });
  it("틀린 카드 기대값은 불일치로 잡힌다", () => {
    const r = runCardExpectedCheck({
      ...SAMPLE_DATA,
      cardExpected: SAMPLE_CARD_EXPECTED.map((x) => (x.caseId === "T02" ? { ...x, card: "MEANINGFUL_CHANGE" } : x)),
    });
    expect(r.passed).toBe(13);
    expect(r.mismatches).toEqual([{ caseId: "T02", got: "REVIEW_PROTOCOL,INCREASE", want: "MEANINGFUL_CHANGE,INCREASE" }]);
  });
  it("자가 검증 전체: 14/14, 11/11, 14/14, 4/4", () => {
    const r = runSelfCheck();
    expect([r.expected.passed, r.units.passed, r.cards.passed, r.cardUnits.passed]).toEqual([14, 11, 14, 4]);
    expect([r.expected.total, r.units.total, r.cards.total, r.cardUnits.total]).toEqual([14, 11, 14, 4]);
    expect(r.allPassed).toBe(true);
  });
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
