// 판정 기능: MDC95 계산, 측정 민감도, 기록 오류 검사, 변화량·두 기준 판정
// Design Ref: §4.1 — verify_athlete_signal_v1_1_r5.py 의 판정 순서를 그대로 따른다.
// Plan SC: 기존 MDC95·SWC 계산식과 판정 규칙은 바꾸지 않는다.
import { fixed3 } from "./format";
import { toFloat, toPositiveFloat } from "./parseNumber";
import type {
  DataErrorReason,
  JudgeResult,
  JudgeRow,
  Protocol,
  ProtocolInput,
  Sensitivity,
} from "./types";

// 1e-9 는 부동소수점 계산의 미세한 오차를 보정하기 위한 값이다. 임의로 바꾸거나 지우지 않는다.
export const EPS = 1e-9;
const Z95 = 1.96;

/** MDC95 = 1.96 × SEM × √2 */
export function mdc95(sem: number): number {
  return Z95 * sem * Math.SQRT2;
}

/** 소수 셋째 자리 문자열 (계산 중에는 반올림하지 않고 표시할 때만 쓴다. r5 와 같은 반올림) */
export function fmt3(v: number | null): string {
  return v === null ? "" : fixed3(v);
}

export class ProtocolConfigError extends Error {}

/** 프로토콜 한 줄을 계산된 프로토콜로 바꾼다. 허용 범위가 잘못되면 ProtocolConfigError. */
export function buildProtocol(input: ProtocolInput): Protocol {
  const sem = toPositiveFloat(input.sem);
  const swc = toPositiveFloat(input.swc);
  const mdc = sem !== null ? mdc95(sem) : null;

  let sensitivity: Sensitivity;
  if (mdc === null || swc === null) {
    sensitivity = "NOT_ASSESSED";
  } else if (mdc <= swc + EPS) {
    sensitivity = "CAN_DETECT_SWC";
  } else {
    sensitivity = "CANNOT_DETECT_SWC";
  }

  const lo = toFloat(input.plausibleMin);
  const hi = toFloat(input.plausibleMax);
  if (lo === null || hi === null || lo >= hi) {
    throw new ProtocolConfigError(
      `프로토콜 ${input.protocolId || "?"}: 허용 범위(최솟값·최댓값)가 숫자가 아니거나 최솟값이 최댓값보다 작지 않습니다.`,
    );
  }

  return {
    protocolId: input.protocolId.trim(),
    sem,
    swc,
    mdc,
    sensitivity,
    min: lo,
    max: hi,
  };
}

export interface ProtocolRegistryError {
  uid: string;
  protocolId: string;
  message: string;
}

export interface ProtocolRegistry {
  protocols: Map<string, Protocol>;
  errors: ProtocolRegistryError[];
}

/**
 * 프로토콜 목록을 등록한다.
 * 이름 빈칸·중복, 허용 범위 오류가 있는 프로토콜은 등록하지 않고 오류로 알려준다.
 */
export function buildRegistry(inputs: ProtocolInput[]): ProtocolRegistry {
  const protocols = new Map<string, Protocol>();
  const errors: ProtocolRegistryError[] = [];
  const firstByName = new Map<string, ProtocolInput>();
  const firstFlagged = new Set<string>();
  const duplicated = new Set<string>();

  for (const input of inputs) {
    const id = input.protocolId.trim();
    if (!id) {
      errors.push({
        uid: input.uid,
        protocolId: "",
        message: "프로토콜 이름이 비어 있습니다.",
      });
      continue;
    }
    const first = firstByName.get(id);
    if (first) {
      duplicated.add(id);
      const message = `프로토콜 이름 ${id}이(가) 중복됩니다.`;
      // 중복된 이름은 처음 나온 행과 뒤에 나온 행 모두에 오류를 알린다.
      if (!firstFlagged.has(id)) {
        firstFlagged.add(id);
        errors.push({ uid: first.uid, protocolId: id, message });
      }
      errors.push({ uid: input.uid, protocolId: id, message });
      continue;
    }
    firstByName.set(id, input);
    try {
      protocols.set(id, buildProtocol(input));
    } catch (e) {
      if (!(e instanceof ProtocolConfigError)) throw e;
      errors.push({ uid: input.uid, protocolId: id, message: e.message });
    }
  }
  // 중복된 이름은 어느 쪽 설정이 맞는지 알 수 없으므로 모두 사용하지 않는다.
  for (const id of duplicated) protocols.delete(id);
  return { protocols, errors };
}

/** 기록 오류 결과: 판정을 중단하고 변화량·오차·실용 판정은 비운다. */
export function dataErrorResult(
  proto: Protocol | undefined,
  reason: DataErrorReason,
): JudgeResult {
  return {
    recordStatus: "DATA_ERROR",
    reason,
    change: null,
    mdc: proto ? proto.mdc : null,
    mdcStatus: "NOT_ASSESSED",
    swcStatus: "NOT_ASSESSED",
    sensitivity: proto ? proto.sensitivity : "NOT_ASSESSED",
  };
}

/** 한 선수·한 프로토콜의 기록 묶음을 판정 순서대로 처리한다. */
export function judge(rows: JudgeRow[], proto: Protocol | undefined): JudgeResult {
  // 1) 프로토콜 존재 여부
  if (!proto) return dataErrorResult(proto, "UNKNOWN_PROTOCOL");

  // 2) 세션 이름: BASELINE, CURRENT 외의 값(대소문자 다름 포함)이 하나라도 있으면 오류
  if (rows.some((r) => r.session !== "BASELINE" && r.session !== "CURRENT")) {
    return dataErrorResult(proto, "INVALID_SESSION");
  }

  // 3) 세션 개수: BASELINE 1건, CURRENT 1건
  const base = rows.filter((r) => r.session === "BASELINE");
  const cur = rows.filter((r) => r.session === "CURRENT");
  if (base.length === 0 || cur.length === 0) {
    return dataErrorResult(proto, "MISSING_SESSION");
  }
  if (base.length > 1 || cur.length > 1) {
    return dataErrorResult(proto, "DUPLICATE_SESSION");
  }

  // 4) 숫자 여부
  const b = toFloat(base[0].value);
  const c = toFloat(cur[0].value);
  if (b === null || c === null) {
    return dataErrorResult(proto, "NON_NUMERIC");
  }

  // 5) 허용 범위
  for (const v of [b, c]) {
    if (v < proto.min || v > proto.max) {
      return dataErrorResult(proto, "OUT_OF_RANGE");
    }
  }

  // 6) 변화량 = 현재 − 이전
  const delta = c - b;
  const res: JudgeResult = {
    recordStatus: "OK",
    reason: "",
    change: delta,
    mdc: proto.mdc,
    mdcStatus: "NOT_ASSESSED",
    swcStatus: "NOT_ASSESSED",
    sensitivity: proto.sensitivity,
  };

  // 7) 기준 확보 여부
  const missing: string[] = [];
  if (proto.sem === null) missing.push("SEM");
  if (proto.swc === null) missing.push("SWC");
  if (missing.length > 0) {
    res.recordStatus = "CRITERIA_MISSING";
    res.reason = `${missing.join("_")}_MISSING` as JudgeResult["reason"];
  }

  // 8) 오차 기준(MDC) 판정: 엄격 비교
  if (proto.mdc !== null) {
    if (Math.abs(delta) > proto.mdc + EPS) {
      res.mdcStatus = delta > 0 ? "ABOVE_MDC_INCREASE" : "ABOVE_MDC_DECREASE";
    } else {
      res.mdcStatus = "WITHIN_MDC";
    }
  }

  // 9) 실용 기준(SWC) 판정: 포함 비교
  if (proto.swc !== null) {
    if (Math.abs(delta) >= proto.swc - EPS) {
      res.swcStatus = delta > 0 ? "MEETS_SWC_INCREASE" : "MEETS_SWC_DECREASE";
    } else {
      res.swcStatus = "BELOW_SWC";
    }
  }

  return res;
}
