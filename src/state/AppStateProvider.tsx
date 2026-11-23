"use client";

// 화면 상태 보관소: 4개 화면이 함께 쓰는 입력값을 메모리에만 보관한다.
// Plan SC: 선수 기록을 서버·localStorage·IndexedDB에 저장하지 않는다. 새로고침하면 초기화된다.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { analyze, type Analysis } from "@/lib/analyze";
import type { DirectRow, Measurement, ProtocolInput } from "@/lib/types";

export type TabId = "settings" | "input" | "results" | "detail";

interface AppState {
  tab: TabId;
  setTab: (tab: TabId) => void;
  selectedKey: string | null;
  openDetail: (key: string) => void;

  protocols: ProtocolInput[];
  addProtocol: () => void;
  updateProtocol: (uid: string, patch: Partial<ProtocolInput>) => void;
  removeProtocol: (uid: string) => void;

  directRows: DirectRow[];
  addDirectRow: () => void;
  updateDirectRow: (uid: string, patch: Partial<DirectRow>) => void;
  removeDirectRow: (uid: string) => void;

  csvRows: Measurement[];
  csvFileName: string | null;
  setCsv: (rows: Measurement[], fileName: string) => void;
  clearCsv: () => void;

  analysis: Analysis;
}

const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("AppStateProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<TabId>("settings");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [protocols, setProtocols] = useState<ProtocolInput[]>([]);
  const [directRows, setDirectRows] = useState<DirectRow[]>([]);
  const [csvRows, setCsvRows] = useState<Measurement[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const counter = useRef(0);

  const nextUid = useCallback(() => {
    counter.current += 1;
    return `u${counter.current}`;
  }, []);

  const addProtocol = useCallback(() => {
    setProtocols((prev) => [
      ...prev,
      { uid: nextUid(), protocolId: "", sem: "", swc: "", plausibleMin: "", plausibleMax: "" },
    ]);
  }, [nextUid]);
  const updateProtocol = useCallback((uid: string, patch: Partial<ProtocolInput>) => {
    setProtocols((prev) => prev.map((p) => (p.uid === uid ? { ...p, ...patch } : p)));
  }, []);
  const removeProtocol = useCallback((uid: string) => {
    setProtocols((prev) => prev.filter((p) => p.uid !== uid));
  }, []);

  const addDirectRow = useCallback(() => {
    setDirectRows((prev) => [
      ...prev,
      {
        uid: nextUid(),
        athleteId: "",
        athleteLabel: "",
        protocolId: "",
        session: "BASELINE",
        sessionDate: "",
        value: "",
      },
    ]);
  }, [nextUid]);
  const updateDirectRow = useCallback((uid: string, patch: Partial<DirectRow>) => {
    setDirectRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }, []);
  const removeDirectRow = useCallback((uid: string) => {
    setDirectRows((prev) => prev.filter((r) => r.uid !== uid));
  }, []);

  // 새 CSV를 올리면 이전에 올린 CSV 기록만 교체하고, 직접 입력한 행은 그대로 둔다.
  const setCsv = useCallback((rows: Measurement[], fileName: string) => {
    setCsvRows(rows);
    setCsvFileName(fileName);
  }, []);
  const clearCsv = useCallback(() => {
    setCsvRows([]);
    setCsvFileName(null);
  }, []);

  const openDetail = useCallback((key: string) => {
    setSelectedKey(key);
    setTab("detail");
  }, []);

  const analysis = useMemo(
    () => analyze(protocols, directRows, csvRows),
    [protocols, directRows, csvRows],
  );

  const value: AppState = {
    tab,
    setTab,
    selectedKey,
    openDetail,
    protocols,
    addProtocol,
    updateProtocol,
    removeProtocol,
    directRows,
    addDirectRow,
    updateDirectRow,
    removeDirectRow,
    csvRows,
    csvFileName,
    setCsv,
    clearCsv,
    analysis,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
