"use client";

// 선수 한 명의 결과 본문 (기록 입력 화면과 선수 상세가 함께 쓴다)
// 이전 → 오늘, 변화량, 증가·감소, 비교 그래프를 먼저 보이고, 측정 기준이 있을 때만 후속 행동 카드를 보인다.
// 측정 기준이 없으면 의미 있는 변화인지 판단하지 않고 안내만 한다.
import { useState } from "react";
import type { BundleResult } from "@/lib/analyze";
import { describeSimple } from "@/lib/simpleMode";
import { useAppState } from "@/state/AppStateProvider";
import { CompareChart } from "./CompareChart";

export function ChangeResult({ bundle }: { bundle: BundleResult }) {
  const { dispatch } = useAppState();
  const [open, setOpen] = useState(false);
  const view = describeSimple(bundle);

  if (view.kind === "error") {
    return (
      <div data-testid="simple-error" className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">{view.title}</p>
        <p className="mt-1">사유: {view.reason}</p>
        {view.rangeHint && <p className="mt-1">{view.rangeHint}</p>}
        <p className="mt-1">{view.next}</p>
      </div>
    );
  }

  return (
    <>
      <p data-testid="simple-headline" className="mt-1 text-3xl font-bold tabular-nums">
        {view.headline}
      </p>
      <p data-testid="simple-change" className="mt-1 text-2xl font-semibold tabular-nums">
        {view.changeLine}
      </p>

      <CompareChart baseline={view.baseline} current={view.current} />

      {view.precise ? (
        <div data-testid="simple-precise" className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-base">{view.precise.short[0]}</p>
          <p className="mt-1 text-base font-semibold">다음 행동: {view.precise.short[1]}</p>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {open ? "접기" : "자세히 보기"}
          </button>
          {open && (
            <div data-testid="simple-detail" className="mt-3 space-y-1 text-sm">
              <p className="font-semibold">{view.precise.detail.title}</p>
              <p className="text-slate-700">{view.precise.detail.body}</p>
              <p className="text-slate-700">
                <span className="font-medium">다음 행동: </span>
                {view.precise.detail.nextAction}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div data-testid="simple-need-criteria" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">{view.needCriteriaNotice}</p>
          <p className="mt-1">변화량만 표시했습니다. 이 변화가 측정 오차를 넘는지는 아직 판단하지 않았습니다.</p>
          <button
            type="button"
            className="mt-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm text-slate-900 hover:bg-amber-100"
            onClick={() => dispatch({ type: "setTab", tab: "settings" })}
          >
            분석 설정에서 측정 기준 입력
          </button>
        </div>
      )}
    </>
  );
}
