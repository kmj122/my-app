"use client";

// 코치 후속 행동 카드: 기본 화면은 '분석 결과 한 줄 + 다음 행동 한 줄', 상세는 '자세히 보기'.
import { useState } from "react";
import type { BundleResult } from "@/lib/analyze";
import { format3, formatSigned, labelMdc, labelSensitivity, labelSwc } from "@/lib/labels";

export default function ResultCard({ bundle }: { bundle: BundleResult }) {
  const [open, setOpen] = useState(false);
  const { card, judge: r } = bundle;
  const isError = r.recordStatus === "DATA_ERROR";

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">{card.shortLines[0]}</p>
      <p className="text-sm text-slate-700">→ {card.shortLines[1]}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 rounded px-2 py-1 text-xs text-slate-800 ring-1 ring-slate-300 hover:bg-white"
      >
        {open ? "자세히 보기 닫기" : "자세히 보기"}
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 text-sm">
          <div>
            <p className="font-semibold">{card.title}</p>
            <p className="mt-1 text-slate-700">{card.body}</p>
            <p className="mt-1 text-slate-700">
              <strong>다음 행동:</strong> {card.nextAction}
            </p>
          </div>
          <div>
            <p className="font-semibold">계산 근거</p>
            <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-slate-700">
              <dt>변화량 (현재 − 이전)</dt>
              <dd className="font-mono">{isError ? "계산하지 않음" : `${formatSigned(r.change)} cm`}</dd>
              <dt>MDC95 (1.96 × SEM × √2)</dt>
              <dd className="font-mono">{r.mdc === null ? "SEM 없음" : `${format3(r.mdc)} cm`}</dd>
              <dt>SWC (중요 변화 기준)</dt>
              <dd className="font-mono">{bundle.swc === null ? "SWC 없음" : `${format3(bundle.swc)} cm`}</dd>
              <dt>오차 기준 판정</dt>
              <dd>{labelMdc(r)}</dd>
              <dt>실용 기준 판정</dt>
              <dd>{labelSwc(r)}</dd>
              <dt>측정 민감도</dt>
              <dd>{labelSensitivity(r.sensitivity)}</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
