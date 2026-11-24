"use client";

// 「자가 검증 실행」 (PLAN 16번): 내장 원본 사본으로 판정·카드를 기대 결과와 대조한다.
// 화면에서 입력한 SEM·SWC 는 쓰지 않는다. 결과는 눌렀을 때만 계산하고 어디에도 저장하지 않는다.
import { useState } from "react";
import { runSelfCheck, type SelfCheckReport } from "@/lib/selfCheck";

export function SelfCheckPanel() {
  const [report, setReport] = useState<SelfCheckReport | null>(null);

  const lines = report
    ? [
        ["기대 결과", report.expected.passed, report.expected.total],
        ["추가 검사", report.units.passed, report.units.total],
        ["카드", report.cards.passed, report.cards.total],
        ["카드 검사", report.cardUnits.passed, report.cardUnits.total],
      ]
    : [];

  return (
    <section className="mt-8 rounded-md border border-slate-300 bg-white p-4">
      <h3 className="text-sm font-semibold">자가 검증</h3>
      <p className="mt-1 text-sm text-slate-500">
        내장된 원본 사본으로 판정과 카드가 기대 결과와 같은지 확인합니다. 위에서 입력한 SEM·SWC에는 영향을 받지 않습니다.
      </p>
      <button
        type="button"
        onClick={() => setReport(runSelfCheck())}
        className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        자가 검증 실행
      </button>

      {report && (
        <div role="status" data-testid="self-check-result" className="mt-3 text-sm">
          <p className={report.allPassed ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
            {report.allPassed ? "모두 통과했습니다." : "통과하지 못한 검사가 있습니다."}
          </p>
          <p className="mt-1 tabular-nums">{lines.map(([n, p, t]) => `${n} ${p}/${t}`).join(", ")}</p>
          {report.completeness.length === 0 ? (
            <p className="mt-1 text-slate-600">두 기대 결과 파일의 누락·중복·불일치 없음</p>
          ) : (
            <ul className="mt-1 list-disc pl-5 text-red-700">
              {report.completeness.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {[...report.expected.mismatches.map((m) => `${m.caseId} ${m.item}: ${m.got} (기대 ${m.want})`),
            ...report.cards.mismatches.map((m) => `${m.caseId} 카드: ${m.got} (기대 ${m.want})`),
            ...[...report.units.checks, ...report.cardUnits.checks].filter((c) => !c.ok).map((c) => `${c.id} ${c.name}: 실패`),
          ].map((t) => (
            <p key={t} className="mt-1 text-red-700">
              {t}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
