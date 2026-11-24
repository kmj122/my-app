"use client";

// 화면 ④ 선수 상세 그래프 (PLAN 13번)
// 변화량을 점으로, 0 을 중심으로 한 ±MDC95 띠를 음영으로, ±SWC 를 점선으로 같은 눈금에 그린다.
// 그래프 아래에 코치 후속 행동 카드(한 줄 요약 + '자세히 보기')를 두고, 공통 안내 문구는 맨 아래 한 번만 보인다.
import { useState } from "react";
import { cardShort, cardText, FOOTER } from "@/lib/cardText";
import { buildDetailChart, CHART_HEIGHT, CHART_WIDTH } from "@/lib/detailChart";
import { selectCard } from "@/lib/selectCard";
import {
  format3,
  formatSigned,
  MDC_STATUS_KO,
  reasonKo,
  RECORD_STATUS_KO,
  SENSITIVITY_KO,
  SWC_STATUS_KO,
} from "@/lib/labels";
import { useAppState } from "@/state/AppStateProvider";
import { useAnalysis } from "@/state/useAnalysis";

const AXIS_Y = 100;

export function AthleteDetail() {
  const { state, dispatch } = useAppState();
  const { bundles } = useAnalysis();
  const [open, setOpen] = useState(false);
  const bundle = state.selectedKey === null ? undefined : bundles.find((b) => b.key === state.selectedKey);

  if (!bundle) {
    return (
      <div>
        <h2 className="text-lg font-semibold">④ 선수 상세</h2>
        <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          선수를 선택하지 않았습니다. ③ 팀 결과표에서 선수를 눌러 주세요.
        </p>
        <button
          type="button"
          className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          onClick={() => dispatch({ type: "setTab", tab: "results" })}
        >
          ← 팀 결과표로
        </button>
      </div>
    );
  }

  const j = bundle.judge;
  const chart = buildDetailChart(bundle);
  const { x } = chart;
  const reason = reasonKo(j.reason);
  const sel = selectCard(j);
  const short = cardShort(sel.card, sel.detail);
  const text = cardText(sel.card, sel.detail);

  return (
    <div>
      <button
        type="button"
        className="text-sm text-slate-600 underline-offset-2 hover:underline"
        onClick={() => dispatch({ type: "setTab", tab: "results" })}
      >
        ← 팀 결과표로
      </button>
      <h2 className="mt-2 text-lg font-semibold">
        선수 상세: {bundle.athleteLabel} · {bundle.protocolId}
      </h2>

      <p className="mt-2 text-sm text-slate-700">
        이전 {bundle.baselineText || "—"} → 현재 {bundle.currentText || "—"}{" "}
        <span className="font-semibold tabular-nums">(변화량 {formatSigned(j.change)} cm)</span>
      </p>

      <figure className="mt-4 rounded-md border border-slate-300 bg-white p-3">
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
          점은 변화량(현재 − 이전, cm), 음영 띠는 ±MDC95(측정 오차 기준), 점선은 ±SWC(코치가 정한 실용 기준)입니다.
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

      <section aria-label="코치 후속 행동 카드" data-testid="action-card" className="mt-6 rounded-md border border-slate-400 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-500">코치 후속 행동 카드</h3>
        <p className="mt-2 text-sm text-slate-700">{short[0]}</p>
        <p className="mt-1 font-semibold text-slate-900">{short[1]}</p>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          {open ? "접기" : "자세히 보기"}
        </button>
        {open && (
          <div data-testid="card-detail" className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
            <p className="font-semibold">{text.title}</p>
            <p className="text-slate-700">{text.body}</p>
            <p className="text-slate-700">
              <span className="font-medium">다음 행동: </span>
              {text.nextAction}
            </p>
          </div>
        )}
      </section>

      <p data-testid="card-footer" className="mt-4 text-xs text-slate-600">
        {FOOTER}
      </p>
      <p className="mt-2 text-xs text-slate-500">가상 데이터·가상 기준값입니다.</p>
    </div>
  );
}
