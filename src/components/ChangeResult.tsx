"use client";

// 선수 한 명의 결과 본문 (기록 입력 화면과 선수 상세가 함께 쓴다)
// 이전 → 오늘, 변화량, 증가·감소, 비교 그래프를 먼저 보이고, 측정 기준이 있을 때만 후속 행동 카드를 보인다.
// 측정 기준이 없으면 의미 있는 변화인지 판단하지 않고 안내만 한다. (이 파일의 변경은 모양에 한정된다.)
import { useState } from "react";
import type { BundleResult } from "@/lib/analyze";
import { describeSimple } from "@/lib/simpleMode";
import { useAppState } from "@/state/AppStateProvider";
import { CompareChart } from "./CompareChart";
import { DIRECTION_STYLE } from "./direction";

export function ChangeResult({ bundle }: { bundle: BundleResult }) {
  const { dispatch } = useAppState();
  const [open, setOpen] = useState(false);
  const view = describeSimple(bundle);

  if (view.kind === "error") {
    return (
      <div data-testid="simple-error" className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        <p className="text-base font-semibold">{view.title}</p>
        <p className="mt-1">사유: {view.reason}</p>
        {view.rangeHint && <p className="mt-1">{view.rangeHint}</p>}
        <p className="mt-1">{view.next}</p>
      </div>
    );
  }

  const dir = DIRECTION_STYLE[view.direction];

  return (
    <>
      <p data-testid="simple-headline" className="mt-2 text-lg font-medium tabular-nums text-slate-600 sm:text-xl">
        {view.headline}
      </p>
      <p
        data-testid="simple-change"
        className={`mt-2 inline-flex items-center gap-3 rounded-2xl px-4 py-2 text-3xl font-extrabold tabular-nums ring-1 sm:text-5xl ${dir.badge}`}
      >
        <span aria-hidden="true" className="text-2xl sm:text-3xl">
          {dir.arrow}
        </span>
        {view.changeLine}
      </p>

      <CompareChart baseline={view.baseline} current={view.current} />

      {view.precise ? (
        <div data-testid="simple-precise" className="mt-5 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
          <p className="text-base text-slate-700">{view.precise.short[0]}</p>
          <p className="mt-1 text-lg font-bold text-navy-900">다음 행동: {view.precise.short[1]}</p>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="mt-3 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            {open ? "접기" : "자세히 보기"}
          </button>
          {open && (
            <div data-testid="simple-detail" className="mt-3 space-y-1.5 border-t border-blue-100 pt-3 text-sm">
              <p className="font-semibold text-navy-900">{view.precise.detail.title}</p>
              <p className="text-slate-700">{view.precise.detail.body}</p>
              <p className="text-slate-700">
                <span className="font-semibold">다음 행동: </span>
                {view.precise.detail.nextAction}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div data-testid="simple-need-criteria" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="text-base font-semibold">{view.needCriteriaNotice}</p>
          <p className="mt-1">변화량만 표시했습니다. 이 변화가 측정 오차를 넘는지는 아직 판단하지 않았습니다.</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-navy-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={() => dispatch({ type: "setTab", tab: "settings" })}
          >
            분석 설정에서 측정 기준 입력
          </button>
        </div>
      )}
    </>
  );
}
