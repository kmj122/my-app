"use client";

// 화면 ④ 선수 상세 그래프: BASELINE·CURRENT 비교와 |변화량|·MDC95·SWC 막대 비교.
// 이전 기록 여러 개를 잇는 전체 이력 그래프는 만들지 않는다 (PRD 비범위).
import { FOOTER } from "@/lib/cardText";
import { format3, formatSigned } from "@/lib/labels";
import { useAppState } from "@/state/AppStateProvider";
import ResultCard from "./ResultCard";

export default function AthleteDetail() {
  const { analysis, selectedKey, openDetail, setTab } = useAppState();
  const { bundles } = analysis;
  const selected = bundles.find((b) => b.key === selectedKey) ?? null;

  if (bundles.length === 0) {
    return (
      <section aria-labelledby="detail-title" className="space-y-3">
        <h2 id="detail-title" className="text-lg font-bold">
          선수 상세
        </h2>
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
      </section>
    );
  }

  const r = selected?.judge;
  const bars: { label: string; value: number | null; color: string }[] = [];
  if (selected && r && r.recordStatus !== "DATA_ERROR") {
    bars.push({ label: "|변화량|", value: r.change === null ? null : Math.abs(r.change), color: "bg-slate-800" });
    bars.push({ label: "MDC95 (오차 기준)", value: r.mdc, color: "bg-amber-500" });
    bars.push({ label: "SWC (중요 변화 기준)", value: selected.swc, color: "bg-sky-500" });
  }
  const available = bars.filter((b) => b.value !== null) as { label: string; value: number; color: string }[];
  const max = available.reduce((m, b) => Math.max(m, b.value), 0);

  return (
    <section aria-labelledby="detail-title" className="space-y-4">
      <div>
        <h2 id="detail-title" className="text-lg font-bold">
          선수 상세
        </h2>
        <label className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">선수·프로토콜</span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1"
            value={selected?.key ?? ""}
            onChange={(e) => openDetail(e.target.value)}
          >
            <option value="" disabled>
              선택하세요
            </option>
            {bundles.map((b) => (
              <option key={b.key} value={b.key}>
                {b.athleteLabel} · {b.protocolId}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!selected || !r ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          위에서 선수·프로토콜을 선택하거나, ③ 팀 결과표에서 &quot;상세 보기&quot;를 누르세요.
        </p>
      ) : (
        <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">
            {selected.athleteLabel} · {selected.protocolId}
          </h3>
          <ResultCard bundle={selected} />
          <p className="text-sm">
            이전(BASELINE) <span className="font-mono">{selected.baselineText || "—"}</span> → 현재(CURRENT){" "}
            <span className="font-mono">{selected.currentText || "—"}</span>
            {r.recordStatus !== "DATA_ERROR" && (
              <>
                {" "}
                (변화량 <span className="font-mono">{formatSigned(r.change)}</span> cm)
              </>
            )}
          </p>

          {r.recordStatus === "DATA_ERROR" ? (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              기록 오류로 이 묶음은 판정하지 않았고 그래프를 그리지 않습니다.
            </p>
          ) : (
            <div className="space-y-3" role="img" aria-label="변화량의 절댓값, MDC95, SWC 막대 비교">
              {bars.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{b.label}</span>
                    <span className="font-mono">{b.value === null ? "없음 (보류)" : `${format3(b.value)} cm`}</span>
                  </div>
                  <div className="mt-1 h-4 rounded bg-slate-100">
                    {b.value !== null && max > 0 && (
                      <div
                        className={`h-4 rounded ${b.color}`}
                        style={{ width: `${Math.max((b.value / max) * 100, 1)}%` }}
                      />
                    )}
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                세 막대는 같은 눈금입니다. |변화량| 막대가 MDC95·SWC 막대보다 길면 해당 기준을 넘은 것입니다.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="border-t border-slate-200 pt-3 text-sm text-slate-600">{FOOTER}</p>
    </section>
  );
}
