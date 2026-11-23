// PLAN 9번 확인: 화면 상태 규칙 (입력값 보관, 탭 이동, CSV 교체)
import { describe, expect, it } from "vitest";
import { initialState, reducer, TABS, type Action, type AppState } from "@/state/appState";
import type { Measurement } from "@/lib/types";

const run = (actions: Action[], from: AppState = initialState) => actions.reduce(reducer, from);

const m = (id: string): Measurement => ({
  measurementId: id,
  athleteId: "A1",
  protocolId: "P-A",
  session: "BASELINE",
  value: "40",
});

describe("초기 상태", () => {
  it("비어 있고 ① 화면에서 시작한다", () => {
    expect(initialState).toMatchObject({
      tab: "settings",
      selectedKey: null,
      protocols: [],
      directRows: [],
      csvRows: [],
      csvFileName: null,
    });
  });
  it("탭은 ①~④ 4개", () => {
    expect(TABS.map((t) => t.id)).toEqual(["settings", "input", "results", "detail"]);
  });
});

describe("탭 이동", () => {
  it("setTab", () => expect(run([{ type: "setTab", tab: "input" }]).tab).toBe("input"));
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
