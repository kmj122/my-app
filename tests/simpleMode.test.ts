// 체력측정 첫 화면(간단 입력·결과)의 규칙 확인: 입력 변환, 기준 없을 때의 안내, 정밀 분석 표시 조건, 비교 그래프 좌표
import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/analyze";
import { cardShort } from "@/lib/cardText";
import {
  buildCompareChart,
  COMPARE_CHART_BOTTOM,
  COMPARE_CHART_TOP,
  DEFAULT_PLAUSIBLE_MAX,
  DEFAULT_PLAUSIBLE_MIN,
  DEFAULT_PROTOCOL_ID,
  describeSimple,
  simpleEntries,
} from "@/lib/simpleMode";
import { initialState, reducer, type Action, type AppState } from "@/state/appState";

const run = (actions: Action[], from: AppState = initialState) => actions.reduce(reducer, from);
const add = (name: string, b: string, c: string): Action => ({ type: "addSimpleRecord", name, baseline: b, current: c });
const view = (s: AppState, id: string) => {
  const a = analyze(s.protocols, s.directRows, s.csvRows);
  return describeSimple(a.bundles.find((x) => x.athleteId === id)!);
};
/** 고급 설정에서 SEM·SWC 를 입력한 상태 */
const withCriteria = (s: AppState): AppState => ({
  ...s,
  protocols: s.protocols.map((p) => ({ ...p, sem: "0.40", swc: "1.20" })),
});

describe("입력 변환", () => {
  it("이름·이전·오늘 → BASELINE, CURRENT 두 줄 (값은 글자 그대로)", () => {
    expect(simpleEntries(" 김선수 ", "40.00", " 42 ")).toEqual([
      { athleteId: "김선수", athleteLabel: "김선수", protocolId: "기본 측정", sessionDate: "", session: "BASELINE", value: "40.00" },
      { athleteId: "김선수", athleteLabel: "김선수", protocolId: "기본 측정", sessionDate: "", session: "CURRENT", value: " 42 " },
    ]);
  });
  it("기본 허용 범위는 테스트용 5~100 이고 기본 프로토콜의 SEM·SWC 는 비어 있다", () => {
    expect([DEFAULT_PLAUSIBLE_MIN, DEFAULT_PLAUSIBLE_MAX]).toEqual(["5", "100"]);
    expect(initialState.protocols[0]).toMatchObject({ sem: "", swc: "", plausibleMin: "5", plausibleMax: "100" });
  });
});

describe("addSimpleRecord · resetSimple", () => {
  it("두 줄이 들어가고 방금 입력한 선수를 기억한다", () => {
    const s = run([add("김선수", "40", "42")]);
    expect(s.directRows).toHaveLength(2);
    expect(s.simpleAthleteId).toBe("김선수");
    expect(s.directRows.map((r) => r.uid)).toEqual(["d1", "d2"]);
  });
  it("여러 선수는 쌓인다", () => {
    const s = run([add("김선수", "40", "42"), add("박선수", "38", "37")]);
    expect(s.directRows).toHaveLength(4);
    expect(analyze(s.protocols, s.directRows, []).bundles.map((b) => b.athleteId)).toEqual(["김선수", "박선수"]);
  });
  it("같은 이름을 다시 입력하면 그 선수의 이전 간단 입력만 바꾼다 (중복 오류로 만들지 않는다)", () => {
    const s = run([add("김선수", "40", "42"), add("박선수", "38", "37"), add("김선수", "41", "43")]);
    expect(s.directRows).toHaveLength(4);
    const kim = s.directRows.filter((r) => r.athleteId === "김선수").map((r) => r.value);
    expect(kim).toEqual(["41", "43"]);
    const b = analyze(s.protocols, s.directRows, []).bundles.find((x) => x.athleteId === "김선수")!;
    expect(b.judge.recordStatus).not.toBe("DATA_ERROR");
  });
  it("예시 데이터를 불러와 기본 프로토콜이 없어져도 다시 넣어 준다", () => {
    const s = run([{ type: "loadSample" }, add("김선수", "40", "42")]);
    expect(s.protocols.some((p) => p.protocolId === DEFAULT_PROTOCOL_ID)).toBe(true);
    expect(view(s, "김선수").kind).toBe("change");
  });
  it("resetSimple 은 방금 본 선수만 지우고 입력한 기록은 남긴다", () => {
    const s = run([add("김선수", "40", "42"), { type: "resetSimple" }]);
    expect(s.simpleAthleteId).toBeNull();
    expect(s.directRows).toHaveLength(2);
  });
  it("예시 데이터를 불러오면 sampleLoaded 가 켜진다 (가상 데이터 문구는 이때만)", () => {
    expect(run([add("김선수", "40", "42")]).sampleLoaded).toBe(false);
    expect(run([{ type: "loadSample" }]).sampleLoaded).toBe(true);
  });
});

describe("측정 기준이 없을 때: 변화량만, 오차 초과 여부는 확정하지 않는다", () => {
  const v = view(run([add("김선수", "40", "42")]), "김선수");
  it("변화량·증가 표시", () => {
    expect(v.kind).toBe("change");
    if (v.kind !== "change") return;
    expect(v.headline).toBe("40.000 → 42.000 cm");
    expect(v.changeLine).toBe("+2.000 cm 증가");
    expect(v.direction).toBe("INCREASE");
  });
  it("정밀 분석(카드)은 없고 안내 문구가 나온다", () => {
    if (v.kind !== "change") throw new Error();
    expect(v.precise).toBeNull();
    expect(v.needCriteriaNotice).toBe("정밀 분석을 위해 측정 기준 설정 필요");
  });
  it("엔진은 두 판정을 보류로 둔다 (SEM·SWC 를 임의로 넣지 않는다)", () => {
    const s = run([add("김선수", "40", "42")]);
    const j = analyze(s.protocols, s.directRows, []).bundles[0].judge;
    expect(j.recordStatus).toBe("CRITERIA_MISSING");
    expect([j.mdcStatus, j.swcStatus]).toEqual(["NOT_ASSESSED", "NOT_ASSESSED"]);
  });
  it("SEM 만 입력해도 SWC 가 없으면 정밀 분석을 보여 주지 않는다", () => {
    const s0 = run([add("김선수", "40", "42")]);
    const s = { ...s0, protocols: s0.protocols.map((p) => ({ ...p, sem: "0.40" })) };
    const x = view(s, "김선수");
    expect(x.kind === "change" && x.precise === null).toBe(true);
  });
});

describe("측정 기준이 있을 때: 기존 카드를 그대로 보여 준다", () => {
  it("두 기준을 넘는 증가 → 카드 ⑤ 한 줄·자세히 보기·공통 안내", () => {
    const v = view(withCriteria(run([add("김선수", "40", "42")])), "김선수");
    if (v.kind !== "change" || !v.precise) throw new Error("정밀 분석이 있어야 합니다");
    expect(v.precise.short).toEqual(cardShort("MEANINGFUL_CHANGE", "INCREASE"));
    expect(v.precise.detail.title).toBe("두 기준을 넘는 증가 관찰");
    expect(v.precise.footer).toContain("변화의 원인은 앱이 판단하지 않습니다");
    expect(v.needCriteriaNotice).toBe("");
  });
  it("감소: −1.800 cm 감소", () => {
    const v = view(withCriteria(run([add("박선수", "45", "43.2")])), "박선수");
    if (v.kind !== "change") throw new Error();
    expect(v.changeLine).toBe("−1.800 cm 감소");
    expect(v.precise?.short).toEqual(cardShort("MEANINGFUL_CHANGE", "DECREASE"));
  });
  it("변화 없음: 0.000 cm 변화 없음, 카드 ⑦", () => {
    const v = view(withCriteria(run([add("최선수", "40", "40")])), "최선수");
    if (v.kind !== "change") throw new Error();
    expect(v.changeLine).toBe("0.000 cm 변화 없음");
    expect(v.direction).toBe("NONE");
    expect(v.precise?.short).toEqual(cardShort("WITHIN_NOISE", ""));
  });
});

describe("입력 오류: 변화를 보여 주지 않고 확인 안내", () => {
  it("허용 범위 밖(420): 임시 범위임을 알리고 절대 기준이 아니라고 설명한다", () => {
    const v = view(run([add("김선수", "40", "420")]), "김선수");
    if (v.kind !== "error") throw new Error();
    expect(v.reason).toBe("허용 범위를 벗어난 측정값");
    expect(v.rangeHint).toContain("임시 허용 범위(5~100cm)");
    expect(v.rangeHint).toContain("모든 선수에게 맞는 기준은 아니며");
    expect(v.title).toBe("데이터 확인이 필요합니다.");
  });
  it("숫자가 아님(abc): 안내만, 허용 범위 설명은 없다", () => {
    const v = view(run([add("김선수", "40", "abc")]), "김선수");
    if (v.kind !== "error") throw new Error();
    expect(v.reason).toBe("숫자가 아닌 측정값");
    expect(v.rangeHint).toBe("");
  });
});

describe("이전·오늘 비교 그래프 좌표", () => {
  it("큰 값이 더 위(작은 y)에 있고 모두 그림 영역 안에 있다", () => {
    const c = buildCompareChart(40, 42);
    expect(c.y(42)).toBeLessThan(c.y(40));
    for (const v of [40, 42]) {
      expect(c.y(v)).toBeGreaterThanOrEqual(COMPARE_CHART_TOP);
      expect(c.y(v)).toBeLessThanOrEqual(COMPARE_CHART_BOTTOM);
    }
  });
  it("같은 값이면 가운데 한 높이에 놓인다", () => {
    const c = buildCompareChart(40, 40);
    expect(c.y(40)).toBeCloseTo((COMPARE_CHART_TOP + COMPARE_CHART_BOTTOM) / 2, 6);
  });
  it("감소도 같은 규칙: 작아진 값이 더 아래", () => {
    const c = buildCompareChart(45, 43.2);
    expect(c.y(43.2)).toBeGreaterThan(c.y(45));
  });
});
