"use client";

// 화면 ② 측정값 입력: BASELINE·CURRENT 기록을 직접 입력하거나 CSV 파일로 올린다.
import { useState, type ChangeEvent } from "react";
import { CsvFileError, parseMeasurementsCsv } from "@/lib/csv";
import { useAppState } from "@/state/AppStateProvider";

const inputClass = "w-full min-w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm";

export default function MeasurementInput() {
  const {
    directRows,
    addDirectRow,
    updateDirectRow,
    removeDirectRow,
    csvRows,
    csvFileName,
    setCsv,
    clearCsv,
    setTab,
  } = useAppState();
  const [csvError, setCsvError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const rows = parseMeasurementsCsv(await file.arrayBuffer());
      setCsv(rows, file.name);
      setCsvError(null);
    } catch (err) {
      // 파일 구조 오류는 업로드 전체를 거부한다. 이전에 올린 CSV 기록은 그대로 둔다.
      setCsvError(
        err instanceof CsvFileError
          ? err.message
          : "파일을 읽는 중 문제가 생겼습니다. 다시 시도해 주세요.",
      );
    }
    input.value = ""; // 같은 파일을 다시 올릴 수 있게 비운다
  }

  return (
    <section aria-labelledby="input-title" className="space-y-6">
      <div>
        <h2 id="input-title" className="text-lg font-bold">
          측정값 입력
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          선수·프로토콜마다 BASELINE(이전) 기록 1건과 CURRENT(현재) 기록 1건을 입력하세요. 직접 입력하거나 CSV 파일을 올릴 수 있습니다.
        </p>
      </div>

      <div className="space-y-3 rounded-md border border-slate-200 bg-white p-4">
        <h3 className="font-semibold">CSV 업로드</h3>
        <p className="text-sm text-slate-600">
          형식: UTF-8, 소수점 <code>.</code>, 단위 cm. 필수 열은 <code>measurement_id</code>, <code>athlete_id</code>, <code>protocol_id</code>, <code>session</code>, <code>value</code>이고
          <code> athlete_label</code>, <code>session_date</code>는 선택입니다. 새 파일을 올리면 이전에 올린 CSV 기록만 바뀌고 직접 입력한 행은 그대로 남습니다.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            CSV 파일 선택
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
          </label>
          {csvFileName && (
            <>
              <span className="text-sm text-slate-700">
                {csvFileName} ({csvRows.length}건)
              </span>
              <button
                type="button"
                onClick={() => {
                  clearCsv();
                  setCsvError(null);
                }}
                className="rounded px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
              >
                CSV 기록 비우기
              </button>
            </>
          )}
        </div>
        {csvError && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            업로드를 거부했습니다. {csvError}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">직접 입력</h3>
        {directRows.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-600">
            직접 입력한 기록이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2">선수 ID</th>
                  <th className="px-3 py-2">표시명 (선택)</th>
                  <th className="px-3 py-2">프로토콜</th>
                  <th className="px-3 py-2">세션</th>
                  <th className="px-3 py-2">측정일 (선택)</th>
                  <th className="px-3 py-2">값 (cm)</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {directRows.map((r) => (
                  <tr key={r.uid} className="border-t border-slate-200">
                    <td className="px-3 py-2">
                      <input
                        aria-label="선수 ID"
                        className={inputClass}
                        value={r.athleteId}
                        onChange={(e) => updateDirectRow(r.uid, { athleteId: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label="표시명"
                        className={inputClass}
                        value={r.athleteLabel}
                        onChange={(e) => updateDirectRow(r.uid, { athleteLabel: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label="프로토콜"
                        className={inputClass}
                        value={r.protocolId}
                        onChange={(e) => updateDirectRow(r.uid, { protocolId: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        aria-label="세션"
                        className={inputClass}
                        value={r.session}
                        onChange={(e) => updateDirectRow(r.uid, { session: e.target.value })}
                      >
                        <option value="BASELINE">BASELINE (이전)</option>
                        <option value="CURRENT">CURRENT (현재)</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label="측정일"
                        className={inputClass}
                        placeholder="2026-11-01"
                        value={r.sessionDate}
                        onChange={(e) => updateDirectRow(r.uid, { sessionDate: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        aria-label="값 (cm)"
                        className={inputClass}
                        inputMode="decimal"
                        value={r.value}
                        onChange={(e) => updateDirectRow(r.uid, { value: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeDirectRow(r.uid)}
                        className="rounded px-2 py-1 text-xs text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={addDirectRow}
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100"
        >
          + 행 추가
        </button>
      </div>

      {csvRows.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">CSV에서 읽은 기록 ({csvRows.length}건)</h3>
          <div className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2">측정 번호</th>
                  <th className="px-3 py-2">선수 ID</th>
                  <th className="px-3 py-2">표시명</th>
                  <th className="px-3 py-2">프로토콜</th>
                  <th className="px-3 py-2">세션</th>
                  <th className="px-3 py-2">측정일</th>
                  <th className="px-3 py-2">값</th>
                </tr>
              </thead>
              <tbody>
                {csvRows.map((r, i) => (
                  <tr key={`${r.measurementId}-${i}`} className="border-t border-slate-200">
                    <td className="px-3 py-1 font-mono">{r.measurementId}</td>
                    <td className="px-3 py-1">{r.athleteId}</td>
                    <td className="px-3 py-1">{r.athleteLabel}</td>
                    <td className="px-3 py-1">{r.protocolId}</td>
                    <td className="px-3 py-1">{r.session}</td>
                    <td className="px-3 py-1">{r.sessionDate}</td>
                    <td className="px-3 py-1 font-mono">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setTab("results")}
          className="rounded-md bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          분석 결과 보기 →
        </button>
      </div>
    </section>
  );
}
