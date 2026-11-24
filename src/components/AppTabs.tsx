"use client";

// 4개 화면의 탭 틀 (PLAN 9번). 화면 ①~④ 는 PLAN 10~13번에서 만들었다.
import { TABS } from "@/state/appState";
import { useAppState } from "@/state/AppStateProvider";
import { AthleteDetail } from "./AthleteDetail";
import { MeasurementInput } from "./MeasurementInput";
import { ProtocolSettings } from "./ProtocolSettings";
import { SimpleCheck } from "./SimpleCheck";
import { TeamResultTable } from "./TeamResultTable";

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
        {active.id === "simple" ? (
          <SimpleCheck />
        ) : active.id === "settings" ? (
          <ProtocolSettings />
        ) : active.id === "input" ? (
          <MeasurementInput />
        ) : active.id === "results" ? (
          <TeamResultTable />
        ) : (
          <AthleteDetail />
        )}
      </section>
    </div>
  );
}
