// 엄격한 숫자 읽기 (r5 스크립트의 to_float / to_positive_float 과 같은 규칙)
// 앞뒤 공백은 제거하고, 아래 모양에 정확히 맞을 때만 숫자로 인정한다.
// 지수 표기(4e1), 쉼표(45,3), 단위(0.45(m)), Infinity, NaN, 밑줄(1_0), 빈칸은 숫자가 아니다.
const NUMBER_RE = /^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$/;

export function toFloat(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const s = String(text).trim();
  if (!NUMBER_RE.test(s)) return null;
  return Number(s);
}

// 숫자 형식이 아니거나 0 이하이면 null (SEM·SWC 근거 미확보로 처리)
export function toPositiveFloat(text: string | null | undefined): number | null {
  const v = toFloat(text);
  if (v === null || v <= 0) return null;
  return v;
}
