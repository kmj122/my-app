// 「자가 검증 실행」 버튼 자리 (PLAN 10번). 실제 연결과 카드 검사는 PLAN 16번에서 한다.
export function SelfCheckPanel() {
  return (
    <section className="mt-8 rounded-md border border-slate-300 bg-white p-4">
      <h3 className="text-sm font-semibold">자가 검증</h3>
      <p className="mt-1 text-sm text-slate-500">
        내장된 원본 사본으로 판정이 기대 결과와 같은지 확인합니다. 위에서 입력한 SEM·SWC에는 영향을 받지 않습니다.
      </p>
      <button
        type="button"
        disabled
        className="mt-3 cursor-not-allowed rounded-md border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-400"
      >
        자가 검증 실행
      </button>
      <span className="ml-3 text-xs text-slate-400">PLAN 16번에서 연결합니다.</span>
    </section>
  );
}
