// PLAN 9번 확인: 화면 상태 규칙 (입력값 보관, 탭 이동, CSV 교체)
import { describe, expect, it } from "vitest";
import { initialState, reducer, TABS, type Action, type AppState } from "@/state/appState";
import { SAMPLE_EXPECTED } from "@/lib/sampleData";
import { runExpectedCheck } from "@/lib/selfCheck";
import type { Measurement } from "@/lib/types";

// 아래 규칙 테스트는 프로토콜이 하나도 없는 상태에서 시작한다. (실제 첫 화면에는 기본 프로토콜 하나가 들어 있다.)
const EMPTY: AppState = { ...initialState, protocols: [] };
const run = (actions: Action[], from: AppState = EMPTY) => actions.reduce(reducer, from);

const m = (id: string): Measurement => ({
  measurementId: id,
  athleteId: "A1",
  protocolId: "P-A",
  session: "BASELINE",
  value: "40",
});

describe("초기 상태", () => {
  it("기록 입력 화면에서 시작하고, 기록은 비어 있으며 기본 프로토콜 하나만 있다 (SEM·SWC 는 비어 있음)", () => {
    expect(initialState).toMatchObject({
      tab: "simple",
      selectedKey: null,
      directRows: [],
      csvRows: [],
      csvFileName: null,
      simpleAthleteId: null,
      sampleLoaded: false,
    });
    expect(initialState.protocols).toHaveLength(1);
    expect(initialState.protocols[0]).toMatchObject({ protocolId: "기본 측정", sem: "", swc: "" });
  });
  it("상단 메뉴는 기록 입력 / 팀 결과 / 분석 설정 3개 (선수 상세는 메뉴가 아니다)", () => {
    expect(TABS.map((t) => t.id)).toEqual(["simple", "results", "settings"]);
    expect(TABS.map((t) => t.label)).toEqual(["기록 입력", "팀 결과", "분석 설정"]);
  });
});

describe("탭 이동", () => {
  it("setTab", () => expect(run([{ type: "setTab", tab: "settings" }]).tab).toBe("settings"));
  it("탭을 옮겨도 입력값은 유지된다", () => {
    const s = run([
      { type: "addProtocol", initial: { protocolId: "P-A", sem: "0.40" } },
      { type: "setTab", tab: "results" },
      { type: "setTab", tab: "settings" },
    ]);
    expect(s.protocols[0]).toMatchObject({ protocolId: "P-A", sem: "0.40" });
  });
  it("openDetail: 선수 상세 탭으로 이동하고 묶음을 기억한다", () => {
    const s = run([{ type: "openDetail", key: "A1|P-A" }]);
    expect(s.tab).toBe("detail");
    expect(s.selectedKey).toBe("A1|P-A");
  });
});

describe("프로토콜 입력", () => {
  it("추가하면 빈 줄과 겹치지 않는 uid", () => {
    const s = run([{ type: "addProtocol" }, { type: "addProtocol" }]);
    expect(s.protocols).toHaveLength(2);
    expect(s.protocols[0].uid).not.toBe(s.protocols[1].uid);
    expect(s.protocols[0]).toMatchObject({ protocolId: "", sem: "", swc: "", plausibleMin: "", plausibleMax: "" });
  });
  it("글자 그대로 보관한다 (숫자로 바꾸지 않음)", () => {
    const s = run([{ type: "addProtocol" }]);
    const s2 = reducer(s, { type: "updateProtocol", uid: s.protocols[0].uid, patch: { sem: " 0.40 " } });
    expect(s2.protocols[0].sem).toBe(" 0.40 ");
  });
  it("SEM 을 바꾸면 그 줄만 바뀐다", () => {
    const s = run([
      { type: "addProtocol", initial: { protocolId: "P-A", sem: "0.40" } },
      { type: "addProtocol", initial: { protocolId: "P-B", sem: "1.00" } },
    ]);
    const s2 = reducer(s, { type: "updateProtocol", uid: s.protocols[1].uid, patch: { sem: "0.40" } });
    expect(s2.protocols.map((p) => p.sem)).toEqual(["0.40", "0.40"]);
    expect(s.protocols[1].sem).toBe("1.00"); // 이전 상태는 그대로 (원본을 고치지 않음)
  });
  it("삭제", () => {
    const s = run([{ type: "addProtocol" }, { type: "addProtocol" }]);
    const s2 = reducer(s, { type: "removeProtocol", uid: s.protocols[0].uid });
    expect(s2.protocols.map((p) => p.uid)).toEqual([s.protocols[1].uid]);
  });
  it("삭제 뒤 새로 추가해도 uid 가 겹치지 않는다", () => {
    const s = run([{ type: "addProtocol" }, { type: "addProtocol" }]);
    const s2 = run(
      [{ type: "removeProtocol", uid: s.protocols[1].uid }, { type: "addProtocol" }],
      s,
    );
    expect(new Set(s2.protocols.map((p) => p.uid)).size).toBe(2);
  });
});

describe("직접 입력 행", () => {
  it("추가하면 세션 기본값 BASELINE, 나머지는 빈 값", () => {
    const s = run([{ type: "addDirectRow" }]);
    expect(s.directRows[0]).toMatchObject({
      athleteId: "",
      athleteLabel: "",
      protocolId: "",
      session: "BASELINE",
      sessionDate: "",
      value: "",
    });
  });
  it("수정·삭제", () => {
    const s = run([{ type: "addDirectRow" }, { type: "addDirectRow" }]);
    const uid = s.directRows[0].uid;
    const s2 = reducer(s, { type: "updateDirectRow", uid, patch: { value: "42.00", session: "CURRENT" } });
    expect(s2.directRows[0]).toMatchObject({ value: "42.00", session: "CURRENT" });
    expect(s2.directRows[1].value).toBe("");
    expect(reducer(s2, { type: "removeDirectRow", uid }).directRows).toHaveLength(1);
  });
  it("프로토콜 uid 와 직접 입력 행 uid 는 서로 다르다", () => {
    const s = run([{ type: "addProtocol" }, { type: "addDirectRow" }]);
    expect(s.protocols[0].uid).not.toBe(s.directRows[0].uid);
  });
});

describe("CSV 기록", () => {
  it("새 CSV 는 이전 CSV 기록만 교체하고 직접 입력 행은 남긴다", () => {
    const s = run([
      { type: "addDirectRow" },
      { type: "setCsv", rows: [m("M1"), m("M2")], fileName: "a.csv" },
      { type: "setCsv", rows: [m("M3")], fileName: "b.csv" },
    ]);
    expect(s.csvRows.map((r) => r.measurementId)).toEqual(["M3"]);
    expect(s.csvFileName).toBe("b.csv");
    expect(s.directRows).toHaveLength(1);
  });
  it("clearCsv", () => {
    const s = run([
      { type: "setCsv", rows: [m("M1")], fileName: "a.csv" },
      { type: "clearCsv" },
    ]);
    expect(s.csvRows).toEqual([]);
    expect(s.csvFileName).toBeNull();
  });
});

describe("예시 데이터 불러오기", () => {
  const loaded = run([{ type: "loadSample" }]);

  it("프로토콜 4개와 기록 28행, CSV 는 비움", () => {
    expect(loaded.protocols.map((p) => p.protocolId)).toEqual(["P-A", "P-B", "P-C", "P-D"]);
    expect(loaded.directRows).toHaveLength(28);
    expect(loaded.csvRows).toEqual([]);
    expect(loaded.csvFileName).toBeNull();
  });
  it("이미 입력한 프로토콜·기록·CSV 는 교체된다", () => {
    const s = run(
      [
        { type: "addProtocol", initial: { protocolId: "내 프로토콜" } },
        { type: "addDirectRow" },
        { type: "setCsv", rows: [m("M1")], fileName: "a.csv" },
        { type: "loadSample" },
      ],
    );
    expect(s.protocols.map((p) => p.protocolId)).toEqual(["P-A", "P-B", "P-C", "P-D"]);
    expect(s.directRows).toHaveLength(28);
    expect(s.csvRows).toEqual([]);
  });
  it("줄 번호(uid)가 모두 다르다", () => {
    const uids = [...loaded.protocols.map((p) => p.uid), ...loaded.directRows.map((r) => r.uid)];
    expect(new Set(uids).size).toBe(uids.length);
  });
  it("불러온 뒤 다시 추가해도 uid 가 겹치지 않는다", () => {
    const s = reducer(loaded, { type: "addDirectRow" });
    const uids = s.directRows.map((r) => r.uid);
    expect(new Set(uids).size).toBe(uids.length);
  });
  it("불러온 입력을 그대로 판정하면 기대 결과 14/14 (화면 입력 → 판정이 이어지는지)", () => {
    const measurements: Measurement[] = loaded.directRows.map((r, i) => ({
      measurementId: `X${i}`,
      athleteId: r.athleteId,
      protocolId: r.protocolId,
      session: r.session,
      value: r.value,
    }));
    const r = runExpectedCheck({ protocols: loaded.protocols, measurements, expected: SAMPLE_EXPECTED });
    expect(r.mismatches).toEqual([]);
    expect(r.passed).toBe(14);
  });
  it("값은 글자 그대로 (측정실패·420 도 그대로)", () => {
    const values = loaded.directRows.map((r) => r.value);
    expect(values).toContain("측정실패");
    expect(values).toContain("420");
  });
});

describe("저장하지 않는다", () => {
  it("상태 파일에 브라우저 저장소 사용이 없다", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    for (const f of ["src/state/appState.ts", "src/state/AppStateProvider.tsx", "src/components/AppTabs.tsx"]) {
      // 주석(설명 글)은 빼고 코드만 검사한다.
      const code = readFileSync(path.join(process.cwd(), f), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(code).not.toMatch(/localStorage|sessionStorage|indexedDB|fetch\(/);
    }
  });
});
