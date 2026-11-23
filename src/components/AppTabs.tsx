"use client";

import { useAppState, type TabId } from "@/state/AppStateProvider";

const TABS: { id: TabId; label: string }[] = [
  { id: "settings", label: "① 측정 기준 설정" },
  { id: "input", label: "② 측정값 입력" },
  { id: "results", label: "③ 팀 결과표" },
  { id: "detail", label: "④ 선수 상세" },
];

export default function AppTabs() {
  const { tab, setTab } = useAppState();
  return (
    <nav aria-label="화면 선택" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          aria-current={tab === t.id ? "page" : undefined}
          className={
            tab === t.id
              ? "rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              : "rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
          }
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
