"use client";

// 분석 설정 (PLAN 10번 화면 ①): 위쪽에는 SEM·SWC 두 칸만 보이고,
// 프로토콜별 설정·근거·허용 범위·MDC95·측정 민감도·자가 검증은 「상세 설정 펼치기」 안에 있다.
import type { ReactNode } from "react";
import { fmt3 } from "@/lib/format";
import { DEFAULT_PROTOCOL_ID, defaultProtocolInput } from "@/lib/simpleMode";
import { buildProtocolViews, CRITERION_STATUS_KO, type CriterionStatus } from "@/lib/protocolView";
import type { Sensitivity } from "@/lib/types";
import { useAppState } from "@/state/AppStateProvider";
import { SelfCheckPanel } from "./SelfCheckPanel";

// 패키지 3.1절의 화면 문구 (민감도 설명은 글자 그대로 쓴다)
const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  CAN_DETECT_SWC: "SWC 감지 가능",
  CANNOT_DETECT_SWC: "SWC 감지 불가",
  NOT_ASSESSED: "판정 보류",
};
const SENSITIVITY_TEXT: Record<Sensitivity, string> = {
  CAN_DETECT_SWC:
    "설정한 SWC가 MDC₉₅ 이상이므로, 실용적으로 중요한 변화의 크기가 95% 최소 검출 기준에 도달합니다. 단, 모든 개별 측정에서 해당 변화를 반드시 검출한다는 뜻은 아닙니다.",
  CANNOT_DETECT_SWC:
    "설정한 SWC가 현재 MDC₉₅보다 작습니다. 실용 기준 크기의 변화는 측정 오차 범위 안에 들 수 있습니다(측정 방식이 나쁘다는 뜻은 아닙니다).",
  NOT_ASSESSED: "SEM 또는 SWC가 없어 판정 보류",
};
const BADGE_COLOR: Record<Sensitivity, string> = {
  CAN_DETECT_SWC: "bg-emerald-100 text-emerald-800",
  CANNOT_DETECT_SWC: "bg-amber-100 text-amber-800",
  NOT_ASSESSED: "bg-slate-100 text-slate-600",
};

const inputClass = "w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-sm";
const BIG_INPUT = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base";

function criterionNote(label: string, status: CriterionStatus): string | null {
  if (status === "OK") return null;
  return `${label}: ${CRITERION_STATUS_KO[status]} → 없는 것으로 처리됩니다.`;
}

export function ProtocolSettings() {
  const { state, dispatch } = useAppState();
  const rows = state.protocols;
  const views = buildProtocolViews(rows);
  // 「기록 입력」 화면이 쓰는 기본 측정 설정 (없으면 아래 상세 설정에서 직접 만든다)
  const defaultIndex = rows.findIndex((r) => r.protocolId.trim() === DEFAULT_PROTOCOL_ID);
  const def = defaultIndex >= 0 ? rows[defaultIndex] : null;
  const defView = defaultIndex >= 0 ? views[defaultIndex] : null;
  const setDef = (patch: Record<string, string>) => def && dispatch({ type: "updateProtocol", uid: def.uid, patch });

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-xl font-semibold">분석 설정</h2>
      <p className="mt-1 text-sm text-slate-600">
        측정 장비·절차의 자료나 코치가 정한 기준이 있을 때만 입력하세요. 모르면 비워 두어도 됩니다. 비워 두면 변화량만 보여 주고,
        변화의 의미는 판단하지 않습니다. 앱이 임의의 값을 넣지 않습니다.
      </p>

      <div className="mt-4 rounded-md border border-slate-300 bg-white p-4" data-testid="basic-criteria">
        {def === null ? (
          <div className="text-sm text-slate-600">
            <p>「기록 입력」에서 쓰는 기본 측정 설정이 없습니다. (예시 데이터를 불러오면 바뀔 수 있습니다.)</p>
            <button
              type="button"
              className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={() => dispatch({ type: "addProtocol", initial: defaultProtocolInput() })}
            >
              기본 측정 설정 추가
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              측정 오차 자료 (SEM, cm)
              <input
                className={BIG_INPUT + " tabular-nums"}
                inputMode="decimal"
                aria-label="측정 오차 자료(SEM)"
                placeholder="예: 0.40"
                value={def.sem}
                onChange={(e) => setDef({ sem: e.target.value })}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">측정 장비·절차의 신뢰도 자료(검사-재검사)가 있을 때 입력</span>
              {defView && defView.sem !== "EMPTY" && criterionNote("측정 오차 자료", defView.sem) && (
                <span className="mt-1 block text-xs font-normal text-amber-700">{criterionNote("측정 오차 자료", defView.sem)}</span>
              )}
            </label>
            <label className="block text-sm font-medium">
              중요하게 볼 변화 크기 (SWC, cm)
              <input
                className={BIG_INPUT + " tabular-nums"}
                inputMode="decimal"
                aria-label="중요하게 볼 변화 크기(SWC)"
                placeholder="예: 1.20"
                value={def.swc}
                onChange={(e) => setDef({ swc: e.target.value })}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">코치가 근거를 바탕으로 정한 값이 있을 때 입력</span>
              {defView && defView.swc !== "EMPTY" && criterionNote("중요 변화 크기", defView.swc) && (
                <span className="mt-1 block text-xs font-normal text-amber-700">{criterionNote("중요 변화 크기", defView.swc)}</span>
              )}
            </label>
            {defView?.error && (
              <p className="text-sm text-red-600 sm:col-span-2">⚠ {defView.error} 상세 설정에서 확인해 주세요.</p>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">두 값이 모두 있으면 「기록 입력」과 「팀 결과」에서 정밀 분석과 다음 행동 카드가 함께 나옵니다.</p>
      </div>

      <details className="mt-6 rounded-md border border-slate-300 bg-white" data-testid="advanced-settings">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">상세 설정 펼치기 (측정 방식별 설정 · 근거 · 허용 범위 · 측정 민감도 · 자가 검증)</summary>
        <div className="border-t border-slate-200 p-4">
      {state.sampleLoaded && (
        <p data-testid="sample-settings-note" className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          예시 데이터의 측정 방식(P-A~P-D)에 들어 있는 SEM·SWC는 시연용 가상 예시값입니다. 「기본 측정」과 실제 선수 기록에는 자동으로 적용되지 않습니다.
        </p>
      )}
      <p className="text-sm text-slate-600">
        측정 방식(프로토콜)마다 측정 오차(SEM)와 중요 변화 기준(SWC)을 입력하세요. MDC95는 SEM으로 자동 계산합니다. (MDC95 = 1.96 × SEM × √2)
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          아직 입력한 프로토콜이 없습니다. 아래 「프로토콜 추가」를 눌러 시작하세요.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-300 bg-white">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">프로토콜</th>
                <th className="px-2 py-2 font-medium">SEM (cm)</th>
                <th className="px-2 py-2 font-medium">SEM 근거</th>
                <th className="px-2 py-2 font-medium">SWC (cm)</th>
                <th className="px-2 py-2 font-medium">SWC 근거</th>
                <th className="px-2 py-2 font-medium">허용 최솟값</th>
                <th className="px-2 py-2 font-medium">허용 최댓값</th>
                <th className="px-2 py-2 font-medium">MDC95 (cm)</th>
                <th className="px-2 py-2 font-medium">측정 민감도</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const v = views[i];
                const notes = [
                  criterionNote("SEM", v.sem),
                  criterionNote("SWC", v.swc),
                  v.semSourceMissing ? "⚠ SEM 근거를 적어 주세요." : null,
                  v.swcBasisMissing ? "⚠ SWC 근거를 적어 주세요." : null,
                ].filter((n): n is string => n !== null);
                const update = (patch: Record<string, string>) =>
                  dispatch({ type: "updateProtocol", uid: row.uid, patch });
                return (
                  <ProtocolRowView
                    key={row.uid}
                    cells={
                      <>
                        <td className="px-2 py-2">
                          <input className={inputClass} aria-label={`${i + 1}번째 프로토콜 이름`} value={row.protocolId} onChange={(e) => update({ protocolId: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className={inputClass} inputMode="decimal" aria-label={`${i + 1}번째 SEM`} value={row.sem} onChange={(e) => update({ sem: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className={inputClass} aria-label={`${i + 1}번째 SEM 근거`} value={row.semSource ?? ""} onChange={(e) => update({ semSource: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className={inputClass} inputMode="decimal" aria-label={`${i + 1}번째 SWC`} value={row.swc} onChange={(e) => update({ swc: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className={inputClass} aria-label={`${i + 1}번째 SWC 근거`} value={row.swcBasis ?? ""} onChange={(e) => update({ swcBasis: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className={inputClass} inputMode="decimal" aria-label={`${i + 1}번째 허용 최솟값`} value={row.plausibleMin} onChange={(e) => update({ plausibleMin: e.target.value })} />
                        </td>
                        <td className="px-2 py-2">
                          <input className={inputClass} inputMode="decimal" aria-label={`${i + 1}번째 허용 최댓값`} value={row.plausibleMax} onChange={(e) => update({ plausibleMax: e.target.value })} />
                        </td>
                        <td className="px-2 py-2 tabular-nums">{v.mdc === null ? "—" : fmt3(v.mdc)}</td>
                        <td className="px-2 py-2">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${BADGE_COLOR[v.sensitivity]}`}>
                            {v.error ? "—" : SENSITIVITY_LABEL[v.sensitivity]}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <button type="button" className="text-xs text-slate-500 hover:text-red-600" onClick={() => dispatch({ type: "removeProtocol", uid: row.uid })}>
                            삭제
                          </button>
                        </td>
                      </>
                    }
                    error={v.error}
                    notes={notes}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        onClick={() => dispatch({ type: "addProtocol" })}
      >
        + 프로토콜 추가
      </button>

      <ul className="mt-4 space-y-1 text-xs text-slate-500">
        <li>※ SEM·SWC가 비었거나 숫자 형식이 아니거나 0 이하이면 &quot;없는 것으로&quot; 처리되고, 그 기준의 판정만 보류됩니다.</li>
        <li>※ 허용 범위는 입력 실수를 걸러내는 값입니다. 허용 범위를 벗어난 측정값은 데이터 확인 필요로 처리됩니다.</li>
        <li>※ 근거 칸은 비어 있어도 판정에는 영향이 없지만, 값의 출처를 남겨 두세요.</li>
      </ul>

      <div className="mt-6 rounded-md border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold">측정 민감도란?</h3>
        <dl className="mt-2 space-y-2 text-xs text-slate-600">
          {(["CAN_DETECT_SWC", "CANNOT_DETECT_SWC", "NOT_ASSESSED"] as const).map((k) => (
            <div key={k}>
              <dt className="font-medium text-slate-800">{SENSITIVITY_LABEL[k]}</dt>
              <dd>{SENSITIVITY_TEXT[k]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <SelfCheckPanel />
        </div>
      </details>
    </div>
  );
}

/** 한 줄 + (안내·오류가 있으면) 그 아래 한 줄 */
function ProtocolRowView({
  cells,
  error,
  notes,
}: {
  cells: ReactNode;
  error: string | null;
  notes: string[];
}) {
  return (
    <>
      <tr className="border-t border-slate-200 align-top">{cells}</tr>
      {(error || notes.length > 0) && (
        <tr>
          <td colSpan={10} className="px-2 pb-2 text-xs">
            {error && <p className="text-red-600">⚠ {error} 이 프로토콜은 사용할 수 없습니다.</p>}
            {notes.map((n) => (
              <p key={n} className="text-amber-700">
                {n}
              </p>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
