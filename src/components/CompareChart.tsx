// 이전·오늘 점프 높이 비교 그래프: 두 점과 선. 세로 눈금은 두 값이 잘 보이게 좁혀서 그린다.
import { fixed3 } from "@/lib/format";
import { buildCompareChart, COMPARE_CHART_HEIGHT, COMPARE_CHART_WIDTH } from "@/lib/simpleMode";

export function CompareChart({ baseline, current }: { baseline: number; current: number }) {
  const c = buildCompareChart(baseline, current);
  const xs = [110, 250];
  const vals = [baseline, current];
  return (
    <figure className="mt-4">
      <svg
        data-testid="compare-chart"
        viewBox={`0 0 ${COMPARE_CHART_WIDTH} ${COMPARE_CHART_HEIGHT}`}
        className="h-auto w-full max-w-md"
        role="img"
        aria-label={`이전 점프 높이 ${fixed3(baseline)}cm, 오늘 점프 높이 ${fixed3(current)}cm를 비교한 그래프`}
      >
        <line x1={xs[0]} y1={c.y(baseline)} x2={xs[1]} y2={c.y(current)} stroke="#475569" strokeWidth={2} />
        {vals.map((v, i) => (
          <g key={i}>
            <circle data-testid={i === 0 ? "dot-before" : "dot-today"} cx={xs[i]} cy={c.y(v)} r={8} fill={i === 0 ? "#94a3b8" : "#0f172a"} />
            <text x={xs[i]} y={c.y(v) - 16} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#0f172a">
              {fixed3(v)}
            </text>
            <text x={xs[i]} y={165} textAnchor="middle" fontSize="14" fill="#334155">
              {i === 0 ? "이전" : "오늘"}
            </text>
          </g>
        ))}
        <line x1={50} y1={150} x2={310} y2={150} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
      <figcaption className="text-xs text-slate-500">두 기록이 잘 보이도록 세로 눈금을 좁혀 그렸습니다. 점 위 숫자가 실제 값(cm)입니다.</figcaption>
    </figure>
  );
}
