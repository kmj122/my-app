"use client";

// 여러 선수 한 번에 입력 (PLAN 11번, 이제 「기록 입력」 화면 안에 들어 있다)
// 표에 직접 입력하거나 CSV 를 올리거나 예시 데이터를 불러온다. 직접 입력과 CSV 기록은 같은 목록에서 보여 준다.
import { useRef, useState } from "react";
import { CsvFileError, parseMeasurementsCsv } from "@/lib/csv";
import { useAppState } from "@/state/AppStateProvider";

const inputClass = "w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-sm";
const buttonClass = "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50";

type Notice = { kind: "ok" | "error"; text: string };

export function MeasurementInput() {
  const { state, dispatch } = useAppState();
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const total = state.csvRows.length + state.directRows.length;

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const rows = parseMeasurementsCsv(await file.arrayBuffer());
      dispatch({ type: "setCsv", rows, fileName: file.name });
      setNotice({ kind: "ok", text: `${file.name}: 기록 ${rows.length}행을 읽었습니다.` });
    } catch (e) {
      // 파일 구조가 잘못되면 행 단위가 아니라 파일 전체를 거부한다. 이미 들어온 기록은 그대로 둔다.
      if (!(e instanceof CsvFileError)) throw e;
      setNotice({
        kind: "error",
        text: `${file.name}을(를) 사용할 수 없습니다. ${e.message} (기존 기록은 바뀌지 않았습니다.)`,
      });
    } finally {
      // 같은 파일을 다시 골라도 읽히도록 선택값을 비운다.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <h3 className="text-base font-semibold">여러 선수 한 번에 입력</h3>
      <p className="mt-1 text-sm text-slate-600">
        선수별 이전(BASELINE)·현재(CURRENT) 점프 높이를 표에 직접 입력하거나 CSV 파일로 올리세요.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className={`${buttonClass} cursor-pointer`}>
          CSV 업로드
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="CSV 파일 선택"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            dispatch({ type: "loadSample" });
            setNotice({
              kind: "ok",
              text: "예시 데이터를 불러왔습니다. (가상 프로토콜 4개, 가상 선수 14명의 기록 28행 — 이미 입력한 프로토콜·기록은 바뀌었습니다.)",
            });
          }}
        >
          예시 데이터 불러오기
        </button>
        {state.csvFileName && (
          <span className="text-sm text-slate-600">
            불러온 CSV: {state.csvFileName} ({state.csvRows.length}행){" "}
            <button
              type="button"
              className="text-xs text-slate-500 underline hover:text-red-600"
              onClick={() => {
                dispatch({ type: "clearCsv" });
                setNotice(null);
              }}
            >
              CSV 기록 지우기
            </button>
          </span>
        )}
      </div>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            notice.kind === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.text}
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        ※ CSV는 UTF-8, 소수점 &apos;.&apos;, 단위 cm입니다. 필수 열: measurement_id, athlete_id, protocol_id, session, value / 선택 열:
        athlete_label, session_date. 형식이 잘못된 파일은 전체를 사용하지 않습니다.
      </p>

      {total === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          아직 입력한 기록이 없습니다. 「+ 행 추가」로 직접 입력하거나, CSV를 올리거나, 예시 데이터를 불러오세요.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-300 bg-white">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-slate-100 text-xs text-slate-600">
              <tr>
                <th className="px-2 py-2 font-medium">구분</th>
                <th className="px-2 py-2 font-medium">선수 ID</th>
                <th className="px-2 py-2 font-medium">표시명 (선택)</th>
                <th className="px-2 py-2 font-medium">프로토콜</th>
                <th className="px-2 py-2 font-medium">세션</th>
                <th className="px-2 py-2 font-medium">측정일 (선택)</th>
                <th className="px-2 py-2 font-medium">값 (cm)</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {state.csvRows.map((r, i) => (
                <tr key={`csv-${i}`} className="border-t border-slate-200 text-slate-700">
                  <td className="px-2 py-2 text-xs text-slate-500">CSV</td>
                  <td className="px-2 py-2">{r.athleteId}</td>
                  <td className="px-2 py-2">{r.athleteLabel}</td>
                  <td className="px-2 py-2">{r.protocolId}</td>
                  <td className="px-2 py-2">{r.session}</td>
                  <td className="px-2 py-2">{r.sessionDate}</td>
                  <td className="px-2 py-2 tabular-nums">{r.value}</td>
                  <td className="px-2 py-2" />
                </tr>
              ))}
              {state.directRows.map((r, i) => {
                const update = (patch: Record<string, string>) =>
                  dispatch({ type: "updateDirectRow", uid: r.uid, patch });
                const n = state.csvRows.length + i + 1;
                return (
                  <tr key={r.uid} className="border-t border-slate-200">
                    <td className="px-2 py-2 text-xs text-slate-500">직접</td>
                    <td className="px-2 py-2">
                      <input className={inputClass} aria-label={`${n}번째 선수 ID`} value={r.athleteId} onChange={(e) => update({ athleteId: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <input className={inputClass} aria-label={`${n}번째 표시명`} value={r.athleteLabel} onChange={(e) => update({ athleteLabel: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <input className={inputClass} aria-label={`${n}번째 프로토콜`} value={r.protocolId} onChange={(e) => update({ protocolId: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <select className={inputClass} aria-label={`${n}번째 세션`} value={r.session} onChange={(e) => update({ session: e.target.value })}>
                        <option value="BASELINE">BASELINE</option>
                        <option value="CURRENT">CURRENT</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input className={inputClass} aria-label={`${n}번째 측정일`} value={r.sessionDate} onChange={(e) => update({ sessionDate: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <input className={inputClass} inputMode="decimal" aria-label={`${n}번째 값`} value={r.value} onChange={(e) => update({ value: e.target.value })} />
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" className="text-xs text-slate-500 hover:text-red-600" onClick={() => dispatch({ type: "removeDirectRow", uid: r.uid })}>
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} onClick={() => dispatch({ type: "addDirectRow" })}>
          + 행 추가
        </button>
        <button
          type="button"
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          onClick={() => dispatch({ type: "setTab", tab: "results" })}
        >
          분석 결과 보기 →
        </button>
        <span className="text-xs text-slate-500">기록 {total}행</span>
      </div>
    </div>
  );
}
