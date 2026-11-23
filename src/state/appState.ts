// 화면 상태 규칙 (PLAN 9번): 4개 화면이 함께 쓰는 입력값을 메모리에만 보관한다.
// Plan SC: 선수 기록을 서버·localStorage·IndexedDB에 저장하지 않는다. 새로고침하면 초기화된다.
// 화면 없이 테스트할 수 있도록 상태 변경 규칙은 순수 함수(reducer)로 둔다.
// 판정 결과는 여기에 저장하지 않는다. 입력(프로토콜·기록)이 바뀌면 화면이 그때그때 다시 계산한다.
import { SAMPLE_MEASUREMENTS, SAMPLE_PROTOCOLS } from "@/lib/sampleData";
import type { DirectEntry, Measurement, ProtocolInput } from "@/lib/types";

export const TABS = [
  { id: "settings", label: "① 측정 기준 설정" },
  { id: "input", label: "② 측정값 입력" },
  { id: "results", label: "③ 팀 결과표" },
  { id: "detail", label: "④ 선수 상세" },
] as const;
export type TabId = (typeof TABS)[number]["id"];

/** 화면 ①의 한 줄. uid 는 화면에서 줄을 구분하는 번호이고 판정에는 쓰지 않는다. */
export type ProtocolRow = ProtocolInput & { uid: string };

/** 화면 ②에서 직접 입력한 한 줄. uid 는 화면에서 줄을 구분하는 번호이고 판정에는 쓰지 않는다. */
export interface DirectRow extends DirectEntry {
  uid: string;
}

export interface AppState {
  tab: TabId;
  /** 화면 ④에서 보고 있는 선수·프로토콜 묶음의 키 */
  selectedKey: string | null;
  protocols: ProtocolRow[];
  directRows: DirectRow[];
  /** CSV 로 올린 기록. 직접 입력한 행과 따로 보관한다. */
  csvRows: Measurement[];
  csvFileName: string | null;
  /** 줄 번호(uid)를 만들기 위한 순번 */
  counter: number;
}

export const initialState: AppState = {
  tab: "settings",
  selectedKey: null,
  protocols: [],
  directRows: [],
  csvRows: [],
  csvFileName: null,
  counter: 0,
};

export type Action =
  | { type: "setTab"; tab: TabId }
  | { type: "openDetail"; key: string }
  | { type: "addProtocol"; initial?: Partial<ProtocolInput> }
  | { type: "updateProtocol"; uid: string; patch: Partial<ProtocolInput> }
  | { type: "removeProtocol"; uid: string }
  | { type: "addDirectRow" }
  | { type: "updateDirectRow"; uid: string; patch: Partial<Omit<DirectRow, "uid">> }
  | { type: "removeDirectRow"; uid: string }
  | { type: "setCsv"; rows: Measurement[]; fileName: string }
  | { type: "clearCsv" }
  | { type: "loadSample" };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "setTab":
      return { ...state, tab: action.tab };

    case "openDetail":
      return { ...state, selectedKey: action.key, tab: "detail" };

    case "addProtocol": {
      const counter = state.counter + 1;
      const row: ProtocolRow = {
        protocolId: "",
        sem: "",
        swc: "",
        plausibleMin: "",
        plausibleMax: "",
        ...action.initial,
        uid: `p${counter}`,
      };
      return { ...state, counter, protocols: [...state.protocols, row] };
    }
    case "updateProtocol":
      return {
        ...state,
        protocols: state.protocols.map((p) => (p.uid === action.uid ? { ...p, ...action.patch } : p)),
      };
    case "removeProtocol":
      return { ...state, protocols: state.protocols.filter((p) => p.uid !== action.uid) };

    case "addDirectRow": {
      const counter = state.counter + 1;
      const row: DirectRow = {
        uid: `d${counter}`,
        athleteId: "",
        athleteLabel: "",
        protocolId: "",
        session: "BASELINE",
        sessionDate: "",
        value: "",
      };
      return { ...state, counter, directRows: [...state.directRows, row] };
    }
    case "updateDirectRow":
      return {
        ...state,
        directRows: state.directRows.map((r) => (r.uid === action.uid ? { ...r, ...action.patch } : r)),
      };
    case "removeDirectRow":
      return { ...state, directRows: state.directRows.filter((r) => r.uid !== action.uid) };

    // 새 CSV 를 올리면 이전에 올린 CSV 기록만 교체하고, 직접 입력한 행은 그대로 둔다.
    case "setCsv":
      return { ...state, csvRows: action.rows, csvFileName: action.fileName };
    case "clearCsv":
      return { ...state, csvRows: [], csvFileName: null };

    // 예시 데이터: 가상 프로토콜 4개와 측정값 28행으로 입력을 통째로 바꾼다. (기록은 직접 입력 행으로 들어가 고쳐 볼 수 있다.)
    case "loadSample": {
      let counter = state.counter;
      const protocols: ProtocolRow[] = SAMPLE_PROTOCOLS.map((p) => ({ ...p, uid: `p${++counter}` }));
      const directRows: DirectRow[] = SAMPLE_MEASUREMENTS.map((m) => ({
        uid: `d${++counter}`,
        athleteId: m.athleteId,
        athleteLabel: m.athleteLabel ?? "",
        protocolId: m.protocolId,
        session: m.session,
        sessionDate: m.sessionDate ?? "",
        value: m.value,
      }));
      return { ...state, counter, protocols, directRows, csvRows: [], csvFileName: null };
    }
  }
}
