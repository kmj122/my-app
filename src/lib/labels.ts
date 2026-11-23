// 화면에 보여줄 한국어 이름표와 숫자 표시 규칙
import { fixed3 } from "./format";
import type { JudgeResult, Sensitivity } from "./types";

/** 변화량 표시: 부호(+/−)를 붙이고 소수 셋째 자리까지. 0.000 은 부호 없이 표시한다. */
export function formatSigned(v: number | null): string {
  if (v === null) return "—";
  const t = fixed3(Math.abs(v));
  if (t === "0.000") return t;
  return `${v > 0 ? "+" : "−"}${t}`;
}

/** 부호 없는 숫자(MDC95, SWC 등)를 소수 셋째 자리까지 (r5 와 같은 반올림) */
export function format3(v: number | null): string {
  return v === null ? "—" : fixed3(v);
}

export function labelMdc(res: JudgeResult): string {
  switch (res.mdcStatus) {
    case "ABOVE_MDC_INCREASE":
      return "오차 기준 초과 (증가)";
    case "ABOVE_MDC_DECREASE":
      return "오차 기준 초과 (감소)";
    case "WITHIN_MDC":
      return "오차 기준 이내";
    default:
      return res.recordStatus === "DATA_ERROR" ? "판정 안 함" : "보류";
  }
}

export function labelSwc(res: JudgeResult): string {
  switch (res.swcStatus) {
    case "MEETS_SWC_INCREASE":
      return "실용 기준 충족 (증가)";
    case "MEETS_SWC_DECREASE":
      return "실용 기준 충족 (감소)";
    case "BELOW_SWC":
      return "실용 기준 미달";
    default:
      return res.recordStatus === "DATA_ERROR" ? "판정 안 함" : "보류";
  }
}

export function labelSensitivity(s: Sensitivity): string {
  switch (s) {
    case "CAN_DETECT_SWC":
      return "SWC 감지 가능";
    case "CANNOT_DETECT_SWC":
      return "SWC 감지 불가";
    default:
      return "평가 불가";
  }
}

// 기록 오류 사유의 쉬운 말은 카드 문구(cardText.ts)와 같은 표를 쓴다.
export { REASON_KO as REASON_LABEL } from "./cardText";
