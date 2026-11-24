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
      <div
        role="tablist"
        aria-label="화면 선택"
        className="flex w-full gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200 sm:inline-flex sm:w-auto"
      >
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
                "flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:px-7 sm:text-base " +
                (selected
                  ? "bg-navy-900 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy-900")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <section id={`panel-${menuId}`} role="tabpanel" aria-labelledby={`tab-${menuId}`} className="pb-10 pt-6">
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
