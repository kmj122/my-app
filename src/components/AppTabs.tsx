"use client";

// 4개 화면의 탭 틀 (PLAN 9번). 화면 내용은 PLAN 10~13번에서 하나씩 채운다.
import { TABS, type TabId } from "@/state/appState";
import { useAppState } from "@/state/AppStateProvider";
import { ProtocolSettings } from "./ProtocolSettings";

const NEXT_TASK: Record<TabId, string> = {
  settings: "PLAN 10번",
  input: "PLAN 11번",
  results: "PLAN 12번",
  detail: "PLAN 13번",
};

export function AppTabs() {
  const { state, dispatch } = useAppState();
  const active = TABS.find((t) => t.id === state.tab) ?? TABS[0];

  return (
    <div>
      <div role="tablist" aria-label="화면 선택" className="flex flex-wrap gap-1 border-b border-slate-300">
        {TABS.map((t) => {
          const selected = t.id === state.tab;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              onClick={() => dispatch({ type: "setTab", tab: t.id })}
              className={
                "-mb-px rounded-t-md border px-4 py-2 text-sm font-medium " +
                (selected
                  ? "border-slate-300 border-b-background bg-background text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <section
        id={`panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${active.id}`}
        className="py-6"
      >
        {active.id === "settings" ? (
          <ProtocolSettings />
        ) : (
          <>
            <h2 className="text-lg font-semibold">{active.label}</h2>
            <p className="mt-2 text-sm text-slate-500">
              이 화면은 {NEXT_TASK[active.id]}에서 만듭니다.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
