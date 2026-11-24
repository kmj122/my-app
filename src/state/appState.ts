// 화면 상태 규칙 (PLAN 9번): 4개 화면이 함께 쓰는 입력값을 메모리에만 보관한다.
// Plan SC: 선수 기록을 서버·localStorage·IndexedDB에 저장하지 않는다. 새로고침하면 초기화된다.
// 화면 없이 테스트할 수 있도록 상태 변경 규칙은 순수 함수(reducer)로 둔다.
// 판정 결과는 여기에 저장하지 않는다. 입력(프로토콜·기록)이 바뀌면 화면이 그때그때 다시 계산한다.
import { SAMPLE_MEASUREMENTS, SAMPLE_PROTOCOLS } from "@/lib/sampleData";
import { defaultProtocolInput, DEFAULT_PROTOCOL_ID, simpleEntries } from "@/lib/simpleMode";
import type { DirectEntry, Measurement, ProtocolInput } from "@/lib/types";

/** 상단 메뉴는 3개. 선수 상세(detail)는 메뉴가 아니라 팀 결과·기록 입력에서 선수를 골라 여는 화면이다. */
export const TABS = [
  { id: "simple", label: "기록 입력" },
  { id: "results", label: "팀 결과" },
  { id: "settings", label: "분석 설정" },
] as const;
export type TabId = (typeof TABS)[number]["id"] | "detail";

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
  /** 첫 화면(기록 입력)에서 방금 확인한 선수. 없으면 null */
  simpleAthleteId: string | null;
  /** 예시 데이터를 불러온 상태인지. "가상 데이터" 문구는 이때만 보여 준다. */
  sampleLoaded: boolean;
}

export const initialState: AppState = {
  tab: "simple",
  selectedKey: null,
  // 간단 모드가 쓰는 기본 프로토콜 하나. SEM·SWC 는 비어 있고 고급 설정에서 입력한다.
  protocols: [{ ...defaultProtocolInput(), uid: "p0" }],
  directRows: [],
  csvRows: [],
  csvFileName: null,
  counter: 0,
  simpleAthleteId: null,
  sampleLoaded: false,
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
  | { type: "loadSample" }
  | { type: "addSimpleRecord"; name: string; baseline: string; current: string }
  | { type: "resetSimple" };

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
      return { ...state, counter, protocols, directRows, csvRows: [], csvFileName: null, simpleAthleteId: null, sampleLoaded: true };
    }

    // 간단 모드 입력: 기본 프로토콜로 이전(BASELINE)·오늘(CURRENT) 두 줄을 넣는다.
    // 같은 이름의 이전 간단 입력이 있으면 새 입력으로 바꾼다. (여러 날짜 누적은 아직 지원하지 않는다.)
    case "addSimpleRecord": {
      const entries = simpleEntries(action.name, action.baseline, action.current);
      const athleteId = entries[0].athleteId;
      let counter = state.counter;
      const rows: DirectRow[] = entries.map((e) => ({ ...e, uid: `d${++counter}` }));
      const kept = state.directRows.filter((r) => !(r.protocolId === DEFAULT_PROTOCOL_ID && r.athleteId.trim() === athleteId));
      const hasDefault = state.protocols.some((p) => p.protocolId.trim() === DEFAULT_PROTOCOL_ID);
      const protocols = hasDefault ? state.protocols : [...state.protocols, { ...defaultProtocolInput(), uid: `p${++counter}` }];
      return { ...state, counter, protocols, directRows: [...kept, ...rows], simpleAthleteId: athleteId };
    }
    case "resetSimple":
      return { ...state, simpleAthleteId: null };
  }
}
