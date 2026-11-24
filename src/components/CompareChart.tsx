// 이전·오늘 점프 높이 비교 그래프: 두 점과 선. 세로 눈금은 두 값이 잘 보이게 좁혀서 그린다. (값·좌표 계산은 그대로, 모양만 정돈)
import { fixed3 } from "@/lib/format";
import { buildCompareChart, COMPARE_CHART_HEIGHT, COMPARE_CHART_WIDTH } from "@/lib/simpleMode";
import { DIRECTION_STYLE } from "./direction";

export function CompareChart({ baseline, current }: { baseline: number; current: number }) {
  const c = buildCompareChart(baseline, current);
  const xs = [110, 250];
  const vals = [baseline, current];
  const dir = DIRECTION_STYLE[current > baseline ? "INCREASE" : current < baseline ? "DECREASE" : "NONE"];
  return (
    <figure className="mt-5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <svg
        data-testid="compare-chart"
        viewBox={`0 0 ${COMPARE_CHART_WIDTH} ${COMPARE_CHART_HEIGHT}`}
        className="mx-auto h-auto w-full max-w-md"
        role="img"
        aria-label={`이전 점프 높이 ${fixed3(baseline)}cm, 오늘 점프 높이 ${fixed3(current)}cm를 비교한 그래프`}
      >
        {/* 두 값의 눈금 보조선 */}
        {vals.map((v, i) => (
          <line key={`g${i}`} x1={40} y1={c.y(v)} x2={320} y2={c.y(v)} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
        ))}
        <line x1={xs[0]} y1={c.y(baseline)} x2={xs[1]} y2={c.y(current)} stroke={dir.line} strokeWidth={4} strokeLinecap="round" />
        {vals.map((v, i) => (
          <g key={i}>
            <circle
              data-testid={i === 0 ? "dot-before" : "dot-today"}
              cx={xs[i]}
              cy={c.y(v)}
              r={9}
              fill={i === 0 ? "#94a3b8" : "#0f2747"}
              stroke="#ffffff"
              strokeWidth={3}
            />
            <text x={xs[i]} y={c.y(v) - 18} textAnchor="middle" fontSize="15" fontWeight="700" fill="#0f2747">
              {fixed3(v)}
            </text>
            <text x={xs[i]} y={168} textAnchor="middle" fontSize="13" fontWeight="600" fill="#475569">
              {i === 0 ? "이전" : "오늘"}
            </text>
          </g>
        ))}
        <line x1={40} y1={150} x2={320} y2={150} stroke="#94a3b8" strokeWidth={1.5} />
      </svg>
      <figcaption className="mt-1 text-xs text-slate-500">두 기록이 잘 보이도록 세로 눈금을 좁혀 그렸습니다. 점 위 숫자가 실제 값(cm)입니다.</figcaption>
    </figure>
  );
}
