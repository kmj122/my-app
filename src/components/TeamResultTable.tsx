"use client";

// 화면 ③ 팀 결과표: 선수·프로토콜 묶음마다 한 줄로 판정 결과를 보여준다.
import { Fragment } from "react";
import { FOOTER } from "@/lib/cardText";
import { format3, formatSigned, labelMdc, labelSensitivity, labelSwc, REASON_LABEL } from "@/lib/labels";
import { useAppState } from "@/state/AppStateProvider";
import ResultCard from "./ResultCard";

export default function TeamResultTable() {
  const { analysis, openDetail, setTab } = useAppState();
  const { bundles } = analysis;

  return (
    <section aria-labelledby="results-title" className="space-y-4">
      <div>
        <h2 id="results-title" className="text-lg font-bold">
          팀 결과표
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          선수·프로토콜마다 변화량과 두 기준(측정 오차 기준 MDC95, 중요 변화 기준 SWC)의 판정을 각각 보여줍니다.
        </p>
      </div>

      {bundles.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          <p>분석할 기록이 없습니다.</p>
          <button
            type="button"
            onClick={() => setTab("input")}
            className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            ② 측정값 입력으로 이동
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">선수</th>
                <th className="px-3 py-2">프로토콜</th>
                <th className="px-3 py-2">이전 (cm)</th>
                <th className="px-3 py-2">현재 (cm)</th>
                <th className="px-3 py-2">변화량 (cm)</th>
                <th className="px-3 py-2">MDC95 (cm)</th>
                <th className="px-3 py-2">오차 기준 판정</th>
                <th className="px-3 py-2">실용 기준 판정</th>
                <th className="px-3 py-2">측정 민감도</th>
                <th className="px-3 py-2">
                  <span className="sr-only">상세</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {bundles.map((b) => {
                const r = b.judge;
                const isError = r.recordStatus === "DATA_ERROR";
                return (
                  <Fragment key={b.key}>
                  <tr className="border-t border-slate-200 align-top">
                    <td className="px-3 py-2 font-medium">{b.athleteLabel}</td>
                    <td className="px-3 py-2">{b.protocolId}</td>
                    <td className="px-3 py-2 font-mono">{b.baselineText || "—"}</td>
                    <td className="px-3 py-2 font-mono">{b.currentText || "—"}</td>
                    <td className="px-3 py-2 font-mono">{isError ? "—" : formatSigned(r.change)}</td>
                    <td className="px-3 py-2 font-mono">{format3(r.mdc)}</td>
                    <td className="px-3 py-2">{labelMdc(r)}</td>
                    <td className="px-3 py-2">{labelSwc(r)}</td>
                    <td className="px-3 py-2">{labelSensitivity(r.sensitivity)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openDetail(b.key)}
                        className="rounded px-2 py-1 text-xs text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100"
                      >
                        상세 보기
                      </button>
                      {isError && (
                        <p className="mt-1 text-xs text-red-700">
                          {REASON_LABEL[r.reason] ?? r.reason}
                        </p>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={10} className="bg-white px-3 pb-3">
                      <ResultCard bundle={b} />
                    </td>
                  </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">{FOOTER}</p>
    </section>
  );
}
