"use client";

// 「기록 입력」 화면 (체력측정): 선수 이름·이전 점프 높이·오늘 점프 높이를 넣고 변화를 바로 확인한다.
// 여러 선수를 한 번에 넣는 표 입력·CSV 올리기·예시 데이터는 아래 「여러 선수 한 번에 입력」 안에 있다.
import { useState, type FormEvent } from "react";
import { FOOTER } from "@/lib/cardText";
import { DEFAULT_PROTOCOL_ID } from "@/lib/simpleMode";
import { useAppState } from "@/state/AppStateProvider";
import { useAnalysis } from "@/state/useAnalysis";
import { ChangeResult } from "./ChangeResult";
import { CARD } from "./direction";
import { MeasurementInput } from "./MeasurementInput";
import { SampleNotice } from "./SampleNotice";

const INPUT =
  "mt-1.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-navy-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100";
const LABEL = "block text-sm font-semibold text-slate-700";
const GHOST = "rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 hover:bg-slate-50";

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
    <div className="mx-auto max-w-3xl">
      <h2 className="text-2xl font-bold tracking-tight text-navy-900">기록 입력</h2>
      <p className="mt-1 text-sm text-slate-600">선수의 이전 기록과 오늘 기록을 비교합니다.</p>

      <form onSubmit={submit} className={`${CARD} mt-5`} noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className={LABEL}>
            선수 이름 또는 번호
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김선수, 07" autoComplete="off" />
          </label>
          <label className={LABEL}>
            이전 점프 높이 (cm)
            <input className={INPUT + " tabular-nums"} value={before} onChange={(e) => setBefore(e.target.value)} placeholder="예: 40.00" inputMode="decimal" autoComplete="off" />
          </label>
          <label className={LABEL}>
            오늘 점프 높이 (cm)
            <input className={INPUT + " tabular-nums"} value={today} onChange={(e) => setToday(e.target.value)} placeholder="예: 42.00" inputMode="decimal" autoComplete="off" />
          </label>
        </div>
        {hint && (
          <p role="status" data-testid="simple-hint" className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {hint}
          </p>
        )}
        <button
          type="submit"
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-navy-900 px-8 text-base font-bold text-white shadow-md transition-colors hover:bg-blue-700 sm:w-auto"
        >
          변화 확인하기
        </button>
      </form>

      {bundle === undefined && (
        <p className="mt-4 text-sm text-slate-500" data-testid="simple-empty">
          선수 한 명의 두 기록을 입력한 뒤 「변화 확인하기」를 누르세요.
        </p>
      )}

      {bundle && (
        <section aria-live="polite" data-testid="simple-result" className={`${CARD} mt-6`}>
          <p className="text-sm font-semibold text-slate-500">{bundle.athleteLabel}</p>
          <ChangeResult key={bundle.key + bundle.baselineText + bundle.currentText} bundle={bundle} />

          <p data-testid="card-footer" className="mt-5 text-xs text-slate-500">
            {FOOTER}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={another} className={GHOST}>
              다른 선수 입력
            </button>
            <button type="button" onClick={() => dispatch({ type: "setTab", tab: "results" })} className={GHOST}>
              팀 결과 보기 ({bundles.length}명)
            </button>
            <button type="button" onClick={() => dispatch({ type: "openDetail", key: bundle.key })} className={GHOST}>
              그래프 보기
            </button>
          </div>
        </section>
      )}

      <details className="mt-8 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" data-testid="bulk-input">
        <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-5 py-4 text-sm font-semibold text-navy-900 hover:bg-slate-50">
          여러 선수 한 번에 입력 (표 입력 · CSV 올리기 · 예시 데이터)
          <span aria-hidden="true" className="text-slate-400">
            ▾
          </span>
        </summary>
        <div className="border-t border-slate-200 p-5">
          <MeasurementInput />
        </div>
      </details>

      {state.sampleLoaded && <SampleNotice className="mt-4" />}
    </div>
  );
}
