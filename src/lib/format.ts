// 소수 셋째 자리 표시 — Python r5 스크립트의 f"{v:.3f}" 와 같은 결과를 내도록 맞춘 것이다.
// 판정 공식·비교 기준과는 무관하고, 화면에 글자로 보여줄 때만 쓴다.
//
// 차이가 나는 경우: 값이 정확히 (홀수 ÷ 16) 이라 셋째 자리 아래가 딱 절반(…5)인 때.
//   Python 은 "가장 가까운 짝수"로 반올림하고(0.0625 → 0.062), JavaScript 의 toFixed 는
//   절댓값이 큰 쪽으로 올린다(0.0625 → 0.063). 이 경우만 Python 방식(짝수로)으로 맞춘다.
//   그 밖의 값은 toFixed(3) 가 Python 과 같은 결과를 낸다.

export function fixed3(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const negative = v < 0 || Object.is(v, -0); // Python 은 -0.0 도 "-0.000" 으로 표시한다
  const a = Math.abs(v);

  let body: string;
  const sixteenths = a * 16; // 2의 거듭제곱 곱셈이라 오차 없음
  if (a < 1e9 && Number.isInteger(sixteenths) && sixteenths % 2 === 1) {
    // 정확히 절반인 경우: 가장 가까운 짝수로 (예: 62.5 → 62, 187.5 → 188)
    const thousandths = a * 1000; // 소수 첫째 자리가 정확히 .5 (오차 없음)
    const lower = Math.floor(thousandths);
    const n = lower % 2 === 0 ? lower : lower + 1;
    body = `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, "0")}`;
  } else {
    body = a.toFixed(3);
  }
  return negative ? `-${body}` : body;
}
