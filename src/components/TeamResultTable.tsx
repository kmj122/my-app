"use client";

// 팀 결과: 누가 얼마나 변했는지를 먼저 보여 준다. (PLAN 12번 화면 ③ 을 단순화)
// 기본 열은 선수·이전·오늘·변화·결과 한 줄이고, 프로토콜·MDC95·두 판정·측정 민감도는 「상세 분석 열 보기」 안에 둔다.
import { useMemo, useState } from "react";
import { FOOTER } from "@/lib/cardText";
import {
  format3,
  MDC_STATUS_KO,
  reasonKo,
  RECORD_STATUS_KO,
  SENSITIVITY_KO,
  SWC_STATUS_KO,
} from "@/lib/labels";
import { describeSimple } from "@/lib/simpleMode";
import { RECORD_STATUSES, type RecordStatus } from "@/lib/types";
import { useAppState } from "@/state/AppStateProvider";
import { DIRECTION_STYLE } from "./direction";
import { useAnalysis } from "@/state/useAnalysis";

type Filter = "ALL" | RecordStatus;

export function TeamResultTable() {
  const { state, dispatch } = useAppState();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [detailCols, setDetailCols] = useState(false);
  const { bundles, registryErrors } = useAnalysis();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: bundles.length, OK: 0, DATA_ERROR: 0, CRITERIA_MISSING: 0 };
    for (const b of bundles) c[b.judge.recordStatus] += 1;
    return c;
  }, [bundles]);

  const shown = filter === "ALL" ? bundles : bundles.filter((b) => b.judge.recordStatus === filter);
  const cols = detailCols ? 12 : 6;

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-navy-900">팀 결과</h2>
      <p className="mt-1 text-sm text-slate-600">
        선수별 이전·오늘 점프 높이와 변화량입니다. 선수 이름이나 「그래프 보기」를 누르면 상세 그래프가 열립니다.
      </p>

      {registryErrors.length > 0 && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          분석 설정에 사용할 수 없는 측정 방식 설정이 {registryErrors.length}개 있습니다. 그 설정의 기록은 &quot;등록되지 않은 측정
          방식&quot;으로 표시됩니다.
        </p>
      )}

      {bundles.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          아직 입력한 기록이 없습니다. 「기록 입력」에서 선수 기록을 넣으면 여기에 쌓입니다.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div role="group" aria-label="상태별 보기" className="flex flex-wrap gap-2">
              {(["ALL", ...RECORD_STATUSES] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={
                    "rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition-colors " +
                    (filter === f
                      ? "bg-navy-900 text-white ring-navy-900"
                      : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50")
                  }
                >
                  {f === "ALL" ? "전체" : RECORD_STATUS_KO[f]} {counts[f]}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={detailCols}
              onClick={() => setDetailCols((v) => !v)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-navy-900 hover:bg-slate-50 sm:ml-auto"
            >
              {detailCols ? "상세 분석 열 숨기기" : "상세 분석 열 보기"}
            </button>
          </div>

          <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 font-medium">선수</th>
                  <th className="px-4 py-3.5 font-medium">이전 (cm)</th>
                  <th className="px-4 py-3.5 font-medium">오늘 (cm)</th>
                  <th className="px-4 py-3.5 font-medium">변화</th>
                  <th className="px-4 py-3.5 font-medium">결과와 다음 행동</th>
                  {detailCols && (
                    <>
                      <th className="px-4 py-3.5 font-medium">프로토콜</th>
                      <th className="px-4 py-3.5 font-medium">MDC95 (cm)</th>
                      <th className="px-4 py-3.5 font-medium">오차 판정</th>
                      <th className="px-4 py-3.5 font-medium">실용 판정</th>
                      <th className="px-4 py-3.5 font-medium">측정 민감도</th>
                      <th className="px-4 py-3.5 font-medium">기록 상태</th>
                    </>
                  )}
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={cols} className="px-2 py-4 text-center text-slate-500">
                      이 상태의 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  shown.map((b) => {
                    const j = b.judge;
                    const v = describeSimple(b);
                    return (
                      <tr
                        key={b.key}
                        className="cursor-pointer border-t border-slate-100 align-middle transition-colors hover:bg-blue-50/60"
                        onClick={() => dispatch({ type: "openDetail", key: b.key })}
                      >
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            className="text-left text-base font-bold text-navy-900 hover:text-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: "openDetail", key: b.key });
                            }}
                          >
                            {b.athleteLabel}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 tabular-nums">{v.kind === "change" ? format3(v.baseline) : b.baselineText || "—"}</td>
                        <td className="px-4 py-3.5 tabular-nums">{v.kind === "change" ? format3(v.current) : b.currentText || "—"}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap" data-testid="team-change">
                          {v.kind === "change" ? (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums ring-1 ${DIRECTION_STYLE[v.direction].badge}`}
                            >
                              <span aria-hidden="true" className="text-xs">
                                {DIRECTION_STYLE[v.direction].arrow}
                              </span>
                              {v.changeLine}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3.5" data-testid="team-result">
                          {v.kind === "error" ? (
                            <>
                              <div className="inline-block rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200">{v.title}</div>
                              <div className="text-xs text-slate-600">사유: {v.reason}</div>
                            </>
                          ) : v.precise ? (
                            <>
                              <div className="text-xs text-slate-600">{v.precise.short[0]}</div>
                              <div className="font-semibold text-navy-900">{v.precise.short[1]}</div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-600">측정 기준이 없어 변화량만 표시했습니다.</div>
                          )}
                        </td>
                        {detailCols && (
                          <>
                            <td className="px-4 py-3.5">{b.protocolId}</td>
                            <td className="px-4 py-3.5 tabular-nums">{format3(j.mdc)}</td>
                            <td className="px-4 py-3.5">{MDC_STATUS_KO[j.mdcStatus]}</td>
                            <td className="px-4 py-3.5">{SWC_STATUS_KO[j.swcStatus]}</td>
                            <td className="px-4 py-3.5">{SENSITIVITY_KO[j.sensitivity]}</td>
                            <td className="px-4 py-3.5">
                              {RECORD_STATUS_KO[j.recordStatus]}
                              {reasonKo(j.reason) && <div className="mt-1 text-xs text-slate-600">{reasonKo(j.reason)}</div>}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: "openDetail", key: b.key });
                            }}
                          >
                            그래프 보기
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {bundles.length > 0 && (
        <p data-testid="card-footer" className="mt-4 text-xs text-slate-600">
          {FOOTER}
        </p>
      )}
      {state.sampleLoaded && <p className="mt-2 text-xs text-slate-500">가상 데이터·가상 기준값입니다.</p>}
    </div>
  );
}
