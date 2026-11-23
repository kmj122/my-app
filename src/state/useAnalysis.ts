"use client";

// 입력(프로토콜·직접 입력·CSV)이 바뀔 때마다 판정을 다시 계산한다. 판정 결과는 저장하지 않는다.
import { useMemo } from "react";
import { analyze, type Analysis } from "@/lib/analyze";
import { useAppState } from "./AppStateProvider";

export function useAnalysis(): Analysis {
  const { state } = useAppState();
  return useMemo(
    () => analyze(state.protocols, state.directRows, state.csvRows),
    [state.protocols, state.directRows, state.csvRows],
  );
}
