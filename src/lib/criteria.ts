// MDC95·변화량·두 기준 판정·측정 민감도 (PLAN 5번)
// Design Ref: §4.1 — verify_athlete_signal_v1_1_r5.py 의 계산식과 비교 규칙을 그대로 따른다.
// 계산 중에는 반올림하지 않는다. (소수 셋째 자리 표시는 화면 단계에서 한다.)
import type { MdcStatus, Sensitivity, SwcStatus } from "./types";

// 1e-9 는 부동소수점 계산의 미세한 오차를 보정하기 위한 값이다. 임의로 바꾸거나 지우지 않는다.
export const EPS = 1e-9;
const Z95 = 1.96;

/** MDC95 = 1.96 × SEM × √2 */
export function mdc95(sem: number): number {
  return Z95 * sem * Math.SQRT2;
}

/** 변화량 = 현재(CURRENT) − 이전(BASELINE). 증가는 +, 감소는 − */
export function change(baseline: number, current: number): number {
  return current - baseline;
}

/** 측정 오차 기준 판정: |변화량| 이 MDC95 보다 "커야" 오차 초과 (같으면 오차 이내) */
export function judgeMdc(delta: number, mdc: number): MdcStatus {
  if (Math.abs(delta) > mdc + EPS) {
    return delta > 0 ? "ABOVE_MDC_INCREASE" : "ABOVE_MDC_DECREASE";
  }
  return "WITHIN_MDC";
}

/** 중요 변화 기준 판정: |변화량| 이 SWC 와 "같거나 크면" 충족 */
export function judgeSwc(delta: number, swc: number): SwcStatus {
  if (Math.abs(delta) >= swc - EPS) {
    return delta > 0 ? "MEETS_SWC_INCREASE" : "MEETS_SWC_DECREASE";
  }
  return "BELOW_SWC";
}

/** 측정 민감도: MDC95 가 SWC 이하(같으면 포함)이면 SWC 크기의 변화를 감지할 수 있다. 하나라도 없으면 판단하지 않는다. */
export function sensitivity(mdc: number | null, swc: number | null): Sensitivity {
  if (mdc === null || swc === null) return "NOT_ASSESSED";
  return mdc <= swc + EPS ? "CAN_DETECT_SWC" : "CANNOT_DETECT_SWC";
}
