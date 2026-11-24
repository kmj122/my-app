"use client";

// 선수 상세 (PLAN 13번 화면 ④): 상단 메뉴가 아니라 팀 결과·기록 입력에서 선수를 골라 여는 화면이다.
// 위쪽은 이전 → 오늘, 변화량, 비교 그래프, 후속 행동 카드(측정 기준이 있을 때)이고,
// 변화량을 ±MDC95 띠와 ±SWC 점선과 함께 그린 기존 그래프와 두 판정은 「상세 분석 보기」 안에 둔다.
import { cardShort, cardText, FOOTER } from "@/lib/cardText";
import { buildDetailChart, CHART_HEIGHT, CHART_WIDTH } from "@/lib/detailChart";
import {
  format3,
  formatSigned,
  MDC_STATUS_KO,
  reasonKo,
  RECORD_STATUS_KO,
  SENSITIVITY_KO,
  SWC_STATUS_KO,
} from "@/lib/labels";
import { SAMPLE_PROTOCOLS } from "@/lib/sampleData";
import { selectCard } from "@/lib/selectCard";
import { useAppState } from "@/state/AppStateProvider";
import { useAnalysis } from "@/state/useAnalysis";
import { ChangeResult } from "./ChangeResult";
import { SampleNotice } from "./SampleNotice";

const AXIS_Y = 100;

export function AthleteDetail() {
  const { state, dispatch } = useAppState();
  const { bundles } = useAnalysis();
  const bundle = state.selectedKey === null ? undefined : bundles.find((b) => b.key === state.selectedKey);

  if (!bundle) {
    return (
      <div>
        <h2 className="text-xl font-semibold">선수 상세</h2>
        <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          선수를 선택하지 않았습니다. 「팀 결과」에서 선수를 눌러 주세요.
        </p>
        <button
          type="button"
          className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          onClick={() => dispatch({ type: "setTab", tab: "results" })}
        >
          ← 팀 결과로
        </button>
      </div>
    );
  }

  const j = bundle.judge;
  const chart = buildDetailChart(bundle);
  const { x } = chart;
  const reason = reasonKo(j.reason);
  const sel = selectCard(j);
  const showCriteriaCard = j.recordStatus === "CRITERIA_MISSING";

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        className="rounded-lg px-2 py-1 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        onClick={() => dispatch({ type: "setTab", tab: "results" })}
      >
        ← 팀 결과로
      </button>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-900">선수 상세: {bundle.athleteLabel}</h2>

      <section data-testid="action-card" className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
        <ChangeResult key={bundle.key + bundle.baselineText + bundle.currentText} bundle={bundle} />
      </section>

      <details className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" data-testid="detail-analysis">
        <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-5 py-4 text-sm font-semibold text-navy-900 hover:bg-slate-50">
          상세 분석 보기 (측정 오차 기준·실용 기준 그래프와 판정)
          <span aria-hidden="true" className="text-slate-400">
            ▾
          </span>
        </summary>
        <div className="border-t border-slate-200 p-5">
          {state.sampleLoaded && SAMPLE_PROTOCOLS.some((p) => p.protocolId === bundle.protocolId) && (
            <p data-testid="sample-criteria-note" className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              이 화면의 측정 오차(SEM)와 중요 변화 기준(SWC)은 시연용 가상 예시값입니다. 실제 선수 기록에는 자동으로 적용되지 않습니다.
            </p>
          )}
          <p className="text-sm text-slate-700">
            측정 방식: {bundle.protocolId} · 변화량은 이전 → 오늘{" "}
            <span className="font-semibold tabular-nums">(변화량 {formatSigned(j.change)} cm)</span>
          </p>

          <figure className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="h-auto w-full"
              role="img"
              aria-label={`변화량 ${formatSigned(j.change)}cm, 측정 오차 기준 ±${format3(chart.mdc)}cm, 실용 기준 ±${format3(chart.swc)}cm를 0 중심의 같은 눈금에 나타낸 그래프`}
            >
              {/* ±MDC95 음영 띠 */}
              {chart.mdc !== null && (
                <>
                  <rect
                    data-testid="mdc-band"
                    x={x(-chart.mdc)}
                    y={AXIS_Y - 45}
                    width={x(chart.mdc) - x(-chart.mdc)}
                    height={90}
                    fill="#bfdbfe"
                    fillOpacity={0.7}
                  />
                  <text x={x(chart.mdc)} y={AXIS_Y - 50} textAnchor="middle" fontSize="12" fill="#1d4ed8">
                    +MDC95 {format3(chart.mdc)}
                  </text>
                  <text x={x(-chart.mdc)} y={AXIS_Y - 50} textAnchor="middle" fontSize="12" fill="#1d4ed8">
                    −MDC95 {format3(chart.mdc)}
                  </text>
                </>
              )}

              {/* ±SWC 점선 */}
              {chart.swc !== null &&
                [-chart.swc, chart.swc].map((v) => (
                  <g key={v}>
                    <line
                      data-testid="swc-line"
                      x1={x(v)}
                      x2={x(v)}
                      y1={AXIS_Y - 55}
                      y2={AXIS_Y + 55}
                      stroke="#b45309"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    <text x={x(v)} y={AXIS_Y + 72} textAnchor="middle" fontSize="12" fill="#b45309">
                      {v < 0 ? "−" : "+"}SWC {format3(chart.swc)}
                    </text>
                  </g>
                ))}

              {/* 수평 기준선과 0 */}
              <line x1={x(-chart.limit)} x2={x(chart.limit)} y1={AXIS_Y} y2={AXIS_Y} stroke="#64748b" strokeWidth={1.5} />
              <line x1={x(0)} x2={x(0)} y1={AXIS_Y - 8} y2={AXIS_Y + 8} stroke="#334155" strokeWidth={2} />
              <text x={x(0)} y={AXIS_Y + 24} textAnchor="middle" fontSize="12" fill="#334155">
                0
              </text>

              {/* 변화량 점 */}
              {chart.change !== null && (
                <>
                  <circle data-testid="change-dot" cx={x(chart.change)} cy={AXIS_Y} r={8} fill="#0f172a" />
                  <text x={x(chart.change)} y={AXIS_Y - 16} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0f172a">
                    {formatSigned(chart.change)}
                  </text>
                </>
              )}
            </svg>
            <figcaption className="mt-1 text-xs text-slate-500">
              점은 변화량(오늘 − 이전, cm), 음영 띠는 ±MDC95(측정 오차 기준), 점선은 ±SWC(코치가 정한 실용 기준)입니다.
            </figcaption>
          </figure>

          {chart.omitted.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-amber-700">
              {chart.omitted.map((t) => (
                <li key={t}>⚠ {t}</li>
              ))}
            </ul>
          )}

          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-slate-500">기록 상태</dt>
            <dd>
              {RECORD_STATUS_KO[j.recordStatus]}
              {reason && <span className="text-slate-600"> — {reason}</span>}
            </dd>
            <dt className="text-slate-500">오차 판정</dt>
            <dd>{MDC_STATUS_KO[j.mdcStatus]}</dd>
            <dt className="text-slate-500">실용 판정</dt>
            <dd>{SWC_STATUS_KO[j.swcStatus]}</dd>
            <dt className="text-slate-500">측정 민감도</dt>
            <dd>{SENSITIVITY_KO[j.sensitivity]}</dd>
            <dt className="text-slate-500">MDC95 / SWC</dt>
            <dd className="tabular-nums">
              {format3(j.mdc)} cm / {format3(bundle.swc)} cm
            </dd>
          </dl>

          {showCriteriaCard && (
            <div data-testid="criteria-card" className="mt-4 border-t border-slate-200 pt-3 text-sm">
              <p className="text-slate-500">측정 기준 안내 카드</p>
              <p className="mt-1 font-semibold">{cardText(sel.card, sel.detail).title}</p>
              <p className="text-slate-700">{cardText(sel.card, sel.detail).body}</p>
              <p className="text-slate-700">
                <span className="font-medium">다음 행동: </span>
                {cardText(sel.card, sel.detail).nextAction}
              </p>
              <p className="mt-1 text-xs text-slate-500">{cardShort(sel.card, sel.detail).join(" ")}</p>
            </div>
          )}
        </div>
      </details>

      <p data-testid="card-footer" className="mt-4 text-xs text-slate-600">
        {FOOTER}
      </p>
      {state.sampleLoaded && <SampleNotice className="mt-3" />}
    </div>
  );
}
