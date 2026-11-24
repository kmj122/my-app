// 예시(가상) 데이터를 불러왔을 때만 보이는 표시. 문구는 그대로이고 모양만 눈에 띄게 한다.
export function SampleNotice({ className = "" }: { className?: string }) {
  return (
    <p
      data-testid="sample-badge"
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ${className}`}
    >
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
      가상 데이터·가상 기준값입니다.
    </p>
  );
}
