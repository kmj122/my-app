"use client";

// 상단 메뉴 3개(기록 입력 / 팀 결과 / 분석 설정)로 화면을 바꾼다.
// 선수 상세는 메뉴가 아니라 선수를 골랐을 때 열리는 화면이며, 그 동안 「팀 결과」 메뉴가 선택된 것으로 보인다.
import { TABS } from "@/state/appState";
import { useAppState } from "@/state/AppStateProvider";
import { AthleteDetail } from "./AthleteDetail";
import { ProtocolSettings } from "./ProtocolSettings";
import { SimpleCheck } from "./SimpleCheck";
import { TeamResultTable } from "./TeamResultTable";

export function AppTabs() {
  const { state, dispatch } = useAppState();
  const menuId = state.tab === "detail" ? "results" : state.tab;

  return (
    <div>
      <div role="tablist" aria-label="화면 선택" className="flex flex-wrap gap-1 border-b border-slate-300">
        {TABS.map((t) => {
          const selected = t.id === menuId;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${menuId}`}
              onClick={() => dispatch({ type: "setTab", tab: t.id })}
              className={
                "-mb-px rounded-t-md border px-5 py-2 text-base font-medium " +
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

      <section id={`panel-${menuId}`} role="tabpanel" aria-labelledby={`tab-${menuId}`} className="py-6">
        {state.tab === "simple" ? (
          <SimpleCheck />
        ) : state.tab === "results" ? (
          <TeamResultTable />
        ) : state.tab === "detail" ? (
          <AthleteDetail />
        ) : (
          <ProtocolSettings />
        )}
      </section>
    </div>
  );
}
