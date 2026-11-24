"use client";

// 첫 화면 「기록 입력」 (체력측정): 선수 이름·이전 점프 높이·오늘 점프 높이를 넣고 변화를 바로 확인한다.
// 기존 판정 엔진을 그대로 쓰며, 측정 기준(SEM·SWC)은 고급 설정에서 입력한 경우에만 정밀 분석과 후속 행동 카드를 보여 준다.
import { useMemo, useState, type FormEvent } from "react";
import { MDC_STATUS_KO, SENSITIVITY_KO, SWC_STATUS_KO } from "@/lib/labels";
import {
  buildCompareChart,
  COMPARE_CHART_HEIGHT,
  COMPARE_CHART_WIDTH,
  DEFAULT_PROTOCOL_ID,
  describeSimple,
} from "@/lib/simpleMode";
import { fixed3 } from "@/lib/format";
import { useAppState } from "@/state/AppStateProvider";
import { useAnalysis } from "@/state/useAnalysis";

const INPUT = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base";

export function SimpleCheck() {
  const { state, dispatch } = useAppState();
  const { bundles } = useAnalysis();
  const [name, setName] = useState("");
  const [before, setBefore] = useState("");
  const [today, setToday] = useState("");
  const [hint, setHint] = useState("");
  const [open, setOpen] = useState(false);

  const bundle =
    state.simpleAthleteId === null
      ? undefined
      : bundles.find((b) => b.athleteId === state.simpleAthleteId && b.protocolId === DEFAULT_PROTOCOL_ID);
  const view = useMemo(() => (bundle ? describeSimple(bundle) : null), [bundle]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim() === "") return setHint("선수 이름 또는 번호를 입력해 주세요.");
    if (before.trim() === "" || today.trim() === "") return setHint("이전 점프 높이와 오늘 점프 높이를 모두 입력해 주세요.");
    setHint("");
    setOpen(false);
    dispatch({ type: "addSimpleRecord", name, baseline: before, current: today });
  }

  function another() {
    setName("");
    setBefore("");
    setToday("");
    setHint("");
    setOpen(false);
    dispatch({ type: "resetSimple" });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-xl font-semibold">선수 기록 입력</h2>
      <p className="mt-1 text-sm text-slate-600">
        선수 이름과 이전·오늘 점프 높이를 입력하면 얼마나 변했는지 바로 보여 드립니다.
      </p>

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

      {view === null && (
        <p className="mt-4 text-sm text-slate-500" data-testid="simple-empty">
          선수 한 명의 두 기록을 입력한 뒤 「변화 확인하기」를 누르세요. 여러 명을 한 번에 넣으려면{" "}
          <button type="button" className="underline" onClick={() => dispatch({ type: "setTab", tab: "input" })}>
            CSV 올리기·예시 데이터
          </button>
          를 쓰세요.
        </p>
      )}

      {bundle && view && (
        <section aria-live="polite" data-testid="simple-result" className="mt-6 rounded-md border border-slate-300 bg-white p-5">
          <p className="text-sm text-slate-600">{bundle.athleteLabel}</p>

          {view.kind === "error" ? (
            <div data-testid="simple-error" className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">{view.title}</p>
              <p className="mt-1">사유: {view.reason}</p>
              {view.rangeHint && <p className="mt-1">{view.rangeHint}</p>}
              <p className="mt-1">{view.next}</p>
            </div>
          ) : (
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
                  {open && bundle && (
                    <div data-testid="simple-detail" className="mt-3 space-y-1 text-sm">
                      <p className="font-semibold">{view.precise.detail.title}</p>
                      <p className="text-slate-700">{view.precise.detail.body}</p>
                      <p className="text-slate-700">
                        <span className="font-medium">다음 행동: </span>
                        {view.precise.detail.nextAction}
                      </p>
                      <dl className="mt-3 grid gap-x-4 gap-y-1 text-slate-700 sm:grid-cols-[9rem_1fr]">
                        <dt className="text-slate-500">오차 기준 판정</dt>
                        <dd>{MDC_STATUS_KO[bundle.judge.mdcStatus]}</dd>
                        <dt className="text-slate-500">실용 기준 판정</dt>
                        <dd>{SWC_STATUS_KO[bundle.judge.swcStatus]}</dd>
                        <dt className="text-slate-500">측정 민감도</dt>
                        <dd>{SENSITIVITY_KO[bundle.judge.sensitivity]}</dd>
                      </dl>
                    </div>
                  )}
                  <p data-testid="card-footer" className="mt-4 text-xs text-slate-600">
                    {view.precise.footer}
                  </p>
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
                    고급 설정에서 측정 기준 입력
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
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
              선수 상세 보기
            </button>
          </div>
        </section>
      )}

      {state.sampleLoaded && <p className="mt-4 text-xs text-slate-500">가상 데이터·가상 기준값입니다.</p>}
    </div>
  );
}

/** 이전·오늘 점프 높이 비교 그래프: 두 점과 선. 세로 눈금은 두 값이 잘 보이게 좁혀서 그린다. */
function CompareChart({ baseline, current }: { baseline: number; current: number }) {
  const c = buildCompareChart(baseline, current);
  const xs = [110, 250];
  const vals = [baseline, current];
  return (
    <figure className="mt-4">
      <svg
        data-testid="compare-chart"
        viewBox={`0 0 ${COMPARE_CHART_WIDTH} ${COMPARE_CHART_HEIGHT}`}
        className="h-auto w-full max-w-md"
        role="img"
        aria-label={`이전 점프 높이 ${fixed3(baseline)}cm, 오늘 점프 높이 ${fixed3(current)}cm를 비교한 그래프`}
      >
        <line x1={xs[0]} y1={c.y(baseline)} x2={xs[1]} y2={c.y(current)} stroke="#475569" strokeWidth={2} />
        {vals.map((v, i) => (
          <g key={i}>
            <circle data-testid={i === 0 ? "dot-before" : "dot-today"} cx={xs[i]} cy={c.y(v)} r={8} fill={i === 0 ? "#94a3b8" : "#0f172a"} />
            <text x={xs[i]} y={c.y(v) - 16} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f172a">
              {fixed3(v)}
            </text>
            <text x={xs[i]} y={165} textAnchor="middle" fontSize="14" fill="#334155">
              {i === 0 ? "이전" : "오늘"}
            </text>
          </g>
        ))}
        <line x1={50} y1={150} x2={310} y2={150} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
      <figcaption className="text-xs text-slate-500">두 기록이 잘 보이도록 세로 눈금을 좁혀 그렸습니다. 점 위 숫자가 실제 값(cm)입니다.</figcaption>
    </figure>
  );
}
