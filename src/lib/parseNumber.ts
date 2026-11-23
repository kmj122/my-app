// 엄격한 숫자 읽기 (PLAN 4번) — r5 스크립트의 to_float / to_positive_float 과 같은 규칙
// Design Ref: §4.2 — 앞뒤 공백은 제거한 뒤 판단하고, 아래 모양에 정확히 맞을 때만 숫자로 인정한다.
//   인정: 42.00, " 42.00 ", +1.5, -1.8, .5, 5.
//   거부: 45,3 (쉼표), 4e1 (지수 표기), 0.45(m) (단위), Infinity, NaN, 1_0 (밑줄), 빈칸, 공백만 있는 값
const NUMBER_RE = /^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$/;

/** 숫자로 읽을 수 있으면 숫자, 아니면 null */
export function toFloat(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const s = String(text).trim();
  if (!NUMBER_RE.test(s)) return null;
  return Number(s);
}

/** 숫자이면서 0보다 큰 값만 인정한다. 아니면 null (SEM·SWC 근거 미확보로 처리하는 데 쓴다). */
export function toPositiveFloat(text: string | null | undefined): number | null {
  const v = toFloat(text);
  if (v === null || v <= 0) return null;
  return v;
}
