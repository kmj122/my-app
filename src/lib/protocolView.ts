// 화면 ①에 보여 줄 값 계산 (PLAN 10번): 입력한 프로토콜 줄마다 MDC95·민감도·안내·경고를 만든다.
// 화면 코드와 분리해 두어 테스트할 수 있다. 판정 규칙은 criteria.ts·judge.ts 를 그대로 쓴다.
import { buildRegistry } from "./protocolRegistry";
import { toFloat } from "./parseNumber";
import type { ProtocolInput, Sensitivity } from "./types";

/** SEM·SWC 입력칸의 상태. EMPTY 등 3가지는 "없는 것으로" 처리되는 사유다. (패키지 3.2절: 비어 있음 / 숫자 형식 아님 / 0 이하) */
export type CriterionStatus = "OK" | "EMPTY" | "NOT_NUMBER" | "NON_POSITIVE";

export const CRITERION_STATUS_KO: Record<Exclude<CriterionStatus, "OK">, string> = {
  EMPTY: "비어 있음",
  NOT_NUMBER: "숫자 형식 아님",
  NON_POSITIVE: "0 이하",
};

export function criterionStatus(text: string | null | undefined): CriterionStatus {
  const s = String(text ?? "").trim();
  if (s === "") return "EMPTY";
  const v = toFloat(s);
  if (v === null) return "NOT_NUMBER";
  if (v <= 0) return "NON_POSITIVE";
  return "OK";
}

export interface ProtocolRowView {
  /** 사용할 수 없는 설정(이름 빈칸·중복, 허용 범위 오류)이면 한글 안내, 아니면 null */
  error: string | null;
  /** 사용할 수 있는 프로토콜일 때만 값이 있다. (사용할 수 없으면 MDC95 도 보여 주지 않는다) */
  mdc: number | null;
  sensitivity: Sensitivity;
  sem: CriterionStatus;
  swc: CriterionStatus;
  /** 값은 있는데 근거 칸이 비어 있으면 경고만 한다. 판정에는 영향이 없다. */
  semSourceMissing: boolean;
  swcBasisMissing: boolean;
}

const blank = (s: string | undefined) => (s ?? "").trim() === "";

/** 입력한 프로토콜 줄과 같은 순서로 화면 표시값을 돌려준다. */
export function buildProtocolViews(inputs: readonly ProtocolInput[]): ProtocolRowView[] {
  const { protocols, errors } = buildRegistry([...inputs]);
  const errorByIndex = new Map<number, string>();
  for (const e of errors) if (!errorByIndex.has(e.index)) errorByIndex.set(e.index, e.message);

  return inputs.map((input, index) => {
    const error = errorByIndex.get(index) ?? null;
    const proto = error === null ? protocols.get(input.protocolId.trim()) : undefined;
    const sem = criterionStatus(input.sem);
    const swc = criterionStatus(input.swc);
    return {
      error,
      mdc: proto ? proto.mdc : null,
      sensitivity: proto ? proto.sensitivity : "NOT_ASSESSED",
      sem,
      swc,
      semSourceMissing: sem !== "EMPTY" && blank(input.semSource),
      swcBasisMissing: swc !== "EMPTY" && blank(input.swcBasis),
    };
  });
}
