"use client";

// 화면 ① 측정 기준 설정: 프로토콜별 SEM·SWC·허용 범위를 입력받고 MDC95를 자동 표시한다.
import { buildProtocol, ProtocolConfigError } from "@/lib/judge";
import { format3, labelSensitivity } from "@/lib/labels";
import type { Protocol, ProtocolInput } from "@/lib/types";
import { useAppState } from "@/state/AppStateProvider";

const inputClass =
  "w-full min-w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm";

function derive(p: ProtocolInput): Protocol | null {
  try {
    return buildProtocol(p);
  } catch (e) {
    if (e instanceof ProtocolConfigError) return null;
    throw e;
  }
}

export default function ProtocolSettings() {
  const { protocols, addProtocol, updateProtocol, removeProtocol, analysis } = useAppState();
  const errorByUid = new Map(analysis.registryErrors.map((e) => [e.uid, e.message]));

  return (
    <section aria-labelledby="settings-title" className="space-y-4">
      <div>
        <h2 id="settings-title" className="text-lg font-bold">
          측정 기준 설정
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          측정 방식(프로토콜)마다 측정 오차(SEM)와 중요 변화 기준(SWC)을 입력하세요. MDC95는 앱이 자동으로 계산합니다.
        </p>
      </div>

      {protocols.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          아직 등록한 프로토콜이 없습니다. 아래 &quot;프로토콜 추가&quot;를 눌러 시작하세요.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">프로토콜 이름</th>
                <th className="px-3 py-2">SEM (cm)</th>
                <th className="px-3 py-2">SWC (cm)</th>
                <th className="px-3 py-2">허용 최솟값 (cm)</th>
                <th className="px-3 py-2">허용 최댓값 (cm)</th>
                <th className="px-3 py-2">MDC95 (cm)</th>
                <th className="px-3 py-2">측정 민감도</th>
                <th className="px-3 py-2">
                  <span className="sr-only">삭제</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => {
                // 오류가 있는 프로토콜은 MDC95·민감도를 정상 결과처럼 보여주지 않는다.
                const proto = errorByUid.has(p.uid) ? null : derive(p);
                return (
                  <tr key={p.uid} className="border-t border-slate-200 align-top">
                    <td className="px-3 py-2">
                      <input
                        aria-label="프로토콜 이름"
                        className={inputClass}
                        value={p.protocolId}
                        onChange={(e) => updateProtocol(p.uid, { protocolId: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label="SEM (cm)"
                        className={inputClass}
                        inputMode="decimal"
                        value={p.sem}
                        onChange={(e) => updateProtocol(p.uid, { sem: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label="SWC (cm)"
                        className={inputClass}
                        inputMode="decimal"
                        value={p.swc}
                        onChange={(e) => updateProtocol(p.uid, { swc: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label="허용 최솟값 (cm)"
                        className={inputClass}
                        inputMode="decimal"
                        value={p.plausibleMin}
                        onChange={(e) => updateProtocol(p.uid, { plausibleMin: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label="허용 최댓값 (cm)"
                        className={inputClass}
                        inputMode="decimal"
                        value={p.plausibleMax}
                        onChange={(e) => updateProtocol(p.uid, { plausibleMax: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono">{proto ? format3(proto.mdc) : "—"}</td>
                    <td className="px-3 py-2">{proto ? labelSensitivity(proto.sensitivity) : "—"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeProtocol(p.uid)}
                        className="rounded px-2 py-1 text-xs text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {protocols.map((p) => {
        const error = errorByUid.get(p.uid);
        const proto = error ? null : derive(p);
        const notes: string[] = [];
        if (error) notes.push(`${error} 이 프로토콜은 사용할 수 없습니다.`);
        else if (proto) {
          if (proto.sem === null) notes.push("SEM이 비었거나 0 이하이거나 숫자가 아니어서 오차 기준(MDC95) 판정을 보류합니다.");
          if (proto.swc === null) notes.push("SWC가 비었거나 0 이하이거나 숫자가 아니어서 중요 변화 기준 판정을 보류합니다.");
        }
        if (notes.length === 0) return null;
        return (
          <ul
            key={`note-${p.uid}`}
            className={`list-disc space-y-1 rounded-md p-3 pl-7 text-sm ${error ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}
          >
            {notes.map((n) => (
              <li key={n}>
                <strong>{p.protocolId.trim() || "(이름 없음)"}:</strong> {n}
              </li>
            ))}
          </ul>
        );
      })}

      <button
        type="button"
        onClick={addProtocol}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        + 프로토콜 추가
      </button>
    </section>
  );
}
