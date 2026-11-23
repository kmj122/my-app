"use client";

// 화면 ③ 팀 결과표 (PLAN 12번)
// 선수·프로토콜 묶음마다 1행: 변화량, MDC95, 두 판정(따로), 측정 민감도, 기록 상태·사유.
// 코치 후속 행동 카드와 카드 공통 안내 문구는 PLAN 14~16번에서 연결한다.
import { useMemo, useState } from "react";
import {
  format3,
  formatSigned,
  MDC_STATUS_KO,
  reasonKo,
  RECORD_STATUS_KO,
  SENSITIVITY_KO,
  SWC_STATUS_KO,
} from "@/lib/labels";
import { RECORD_STATUSES, type RecordStatus } from "@/lib/types";
import { useAppState } from "@/state/AppStateProvider";
import { useAnalysis } from "@/state/useAnalysis";

type Filter = "ALL" | RecordStatus;

const STATUS_COLOR: Record<RecordStatus, string> = {
  OK: "bg-emerald-100 text-emerald-800",
  DATA_ERROR: "bg-red-100 text-red-800",
  CRITERIA_MISSING: "bg-amber-100 text-amber-800",
};

export function TeamResultTable() {
  const { dispatch } = useAppState();
  const [filter, setFilter] = useState<Filter>("ALL");
  const { bundles, registryErrors } = useAnalysis();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: bundles.length, OK: 0, DATA_ERROR: 0, CRITERIA_MISSING: 0 };
    for (const b of bundles) c[b.judge.recordStatus] += 1;
    return c;
  }, [bundles]);

  const shown = filter === "ALL" ? bundles : bundles.filter((b) => b.judge.recordStatus === filter);

  return (
    <div>
      <h2 className="text-lg font-semibold">③ 팀 결과표</h2>
      <p className="mt-1 text-sm text-slate-600">
        선수·프로토콜마다 변화량(현재 − 이전)과 두 기준의 판정을 따로 보여 줍니다. 두 판정을 하나의 점수로 합치지 않습니다.
      </p>

      {registryErrors.length > 0 && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          ① 측정 기준 설정에 사용할 수 없는 프로토콜 {registryErrors.length}개가 있습니다. 그 프로토콜의 기록은 &quot;등록되지
          않은 측정 방식&quot;으로 표시됩니다.
        </p>
      )}

      {bundles.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          분석할 기록이 없습니다. ② 측정값 입력에서 기록을 입력하거나 예시 데이터를 불러오세요.
        </p>
      ) : (
        <>
          <div role="group" aria-label="상태별 보기" className="mt-4 flex flex-wrap gap-2">
            {(["ALL", ...RECORD_STATUSES] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-full border px-3 py-1 text-sm " +
                  (filter === f
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
                }
              >
                {f === "ALL" ? "전체" : RECORD_STATUS_KO[f]} {counts[f]}
              </button>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto rounded-md border border-slate-300 bg-white">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-600">
                <tr>
                  <th className="px-2 py-2 font-medium">선수</th>
                  <th className="px-2 py-2 font-medium">프로토콜</th>
                  <th className="px-2 py-2 font-medium">이전</th>
                  <th className="px-2 py-2 font-medium">현재</th>
                  <th className="px-2 py-2 font-medium">변화량 (cm)</th>
                  <th className="px-2 py-2 font-medium">MDC95 (cm)</th>
                  <th className="px-2 py-2 font-medium">오차 판정</th>
                  <th className="px-2 py-2 font-medium">실용 판정</th>
                  <th className="px-2 py-2 font-medium">측정 민감도</th>
                  <th className="px-2 py-2 font-medium">기록 상태</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-2 py-4 text-center text-slate-500">
                      이 상태의 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  shown.map((b) => {
                    const j = b.judge;
                    const reason = reasonKo(j.reason);
                    return (
                      <tr
                        key={b.key}
                        className="cursor-pointer border-t border-slate-200 align-top hover:bg-slate-50"
                        onClick={() => dispatch({ type: "openDetail", key: b.key })}
                      >
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            className="text-left font-medium text-slate-900 underline-offset-2 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch({ type: "openDetail", key: b.key });
                            }}
                          >
                            {b.athleteLabel}
                          </button>
                        </td>
                        <td className="px-2 py-2">{b.protocolId}</td>
                        <td className="px-2 py-2 tabular-nums">{b.baselineText || "—"}</td>
                        <td className="px-2 py-2 tabular-nums">{b.currentText || "—"}</td>
                        <td className="px-2 py-2 tabular-nums">{formatSigned(j.change)}</td>
                        <td className="px-2 py-2 tabular-nums">{format3(j.mdc)}</td>
                        <td className="px-2 py-2">{MDC_STATUS_KO[j.mdcStatus]}</td>
                        <td className="px-2 py-2">{SWC_STATUS_KO[j.swcStatus]}</td>
                        <td className="px-2 py-2">{SENSITIVITY_KO[j.sensitivity]}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[j.recordStatus]}`}>
                            {RECORD_STATUS_KO[j.recordStatus]}
                          </span>
                          {reason && <div className="mt-1 text-xs text-slate-600">{reason}</div>}
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

      <p className="mt-4 text-xs text-slate-500">가상 데이터·가상 기준값입니다.</p>
    </div>
  );
}
