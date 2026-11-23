"use client";

// 화면 상태 보관소 (PLAN 9번): 4개 화면이 같은 입력값을 보도록 한 곳에서 들고 있는다.
// 저장하지 않는다: useReducer 로 메모리에만 두므로 새로고침하면 사라진다.
import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { initialState, reducer, type Action, type AppState } from "./appState";

interface AppStore {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const AppStateContext = createContext<AppStore | null>(null);

export function useAppState(): AppStore {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("AppStateProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const store = useMemo(() => ({ state, dispatch }), [state]);
  return <AppStateContext.Provider value={store}>{children}</AppStateContext.Provider>;
}
