"use client";

// 「기록 입력」 화면 (체력측정): 선수 이름·이전 점프 높이·오늘 점프 높이를 넣고 변화를 바로 확인한다.
// 여러 선수를 한 번에 넣는 표 입력·CSV 올리기·예시 데이터는 아래 「여러 선수 한 번에 입력」 안에 있다.
import { useState, type FormEvent } from "react";
import { FOOTER } from "@/lib/cardText";
import { DEFAULT_PROTOCOL_ID } from "@/lib/simpleMode";
import { useAppState } from "@/state/AppStateProvider";
import { useAnalysis } from "@/state/useAnalysis";
import { ChangeResult } from "./ChangeResult";
import { MeasurementInput } from "./MeasurementInput";

const INPUT = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base";

export function SimpleCheck() {
  const { state, dispatch } = useAppState();
  const { bundles } = useAnalysis();
  const [name, setName] = useState("");
  const [before, setBefore] = useState("");
  const [today, setToday] = useState("");
  const [hint, setHint] = useState("");

  const bundle =
    state.simpleAthleteId === null
      ? undefined
      : bundles.find((b) => b.athleteId === state.simpleAthleteId && b.protocolId === DEFAULT_PROTOCOL_ID);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim() === "") return setHint("선수 이름 또는 번호를 입력해 주세요.");
    if (before.trim() === "" || today.trim() === "") return setHint("이전 점프 높이와 오늘 점프 높이를 모두 입력해 주세요.");
    setHint("");
    dispatch({ type: "addSimpleRecord", name, baseline: before, current: today });
  }

  function another() {
    setName("");
    setBefore("");
    setToday("");
    setHint("");
    dispatch({ type: "resetSimple" });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-xl font-semibold">기록 입력</h2>
      <p className="mt-1 text-sm text-slate-600">선수의 이전 기록과 오늘 기록을 비교합니다.</p>

      <form onSubmit={submit} className="mt-4 rounded-md border border-slate-300 bg-white p-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            선수 이름 또는 번호
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김선수, 07" autoComplete="off" />
          </label>
          <label className="block text-sm font-medium">
            이전 점프 높이 (cm)
            <input className={INPUT + " tabular-nums"} value={before} onChange={(e) => setBefore(e.target.value)} placeholder="예: 40.00" inputMode="decimal" autoComplete="off" />
          </label>
          <label className="block text-sm font-medium">
            오늘 점프 높이 (cm)
            <input className={INPUT + " tabular-nums"} value={today} onChange={(e) => setToday(e.target.value)} placeholder="예: 42.00" inputMode="decimal" autoComplete="off" />
          </label>
        </div>
        {hint && (
          <p role="status" data-testid="simple-hint" className="mt-3 text-sm text-slate-700">
            {hint}
          </p>
        )}
        <button type="submit" className="mt-4 rounded-md bg-slate-900 px-5 py-2.5 text-base font-medium text-white hover:bg-slate-700">
          변화 확인하기
        </button>
      </form>

      {bundle === undefined && (
        <p className="mt-4 text-sm text-slate-500" data-testid="simple-empty">
          선수 한 명의 두 기록을 입력한 뒤 「변화 확인하기」를 누르세요.
        </p>
      )}

      {bundle && (
        <section aria-live="polite" data-testid="simple-result" className="mt-6 rounded-md border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-600">{bundle.athleteLabel}</p>
          <ChangeResult key={bundle.key + bundle.baselineText + bundle.currentText} bundle={bundle} />

          <p data-testid="card-footer" className="mt-4 text-xs text-slate-600">
            {FOOTER}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={another} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
              다른 선수 입력
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "setTab", tab: "results" })}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              팀 결과 보기 ({bundles.length}명)
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "openDetail", key: bundle.key })}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              그래프 보기
            </button>
          </div>
        </section>
      )}

      <details className="mt-8 rounded-md border border-slate-300 bg-white" data-testid="bulk-input">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">여러 선수 한 번에 입력 (표 입력 · CSV 올리기 · 예시 데이터)</summary>
        <div className="border-t border-slate-200 p-4">
          <MeasurementInput />
        </div>
      </details>

      {state.sampleLoaded && <p className="mt-4 text-xs text-slate-500">가상 데이터·가상 기준값입니다.</p>}
    </div>
  );
}
