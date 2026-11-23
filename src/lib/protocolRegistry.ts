// 프로토콜 목록 등록과 설정 오류 검사 (PLAN 7번 단위 검사 U11 에서 필요해 먼저 만든 기능)
// Design Ref: §7 — 이름 빈칸·중복, 허용 범위 오류가 있는 프로토콜은 등록하지 않고 오류로 알려 준다.
//   등록되지 않은 프로토콜의 기록은 판정 단계에서 UNKNOWN_PROTOCOL 이 된다.
import { buildProtocol, ProtocolConfigError } from "./judge";
import type { Protocol, ProtocolInput } from "./types";

export interface ProtocolRegistryError {
  /** 입력 목록에서의 위치(0부터) */
  index: number;
  protocolId: string;
  message: string;
}

export interface ProtocolRegistry {
  protocols: Map<string, Protocol>;
  errors: ProtocolRegistryError[];
}

export function buildRegistry(inputs: ProtocolInput[]): ProtocolRegistry {
  const protocols = new Map<string, Protocol>();
  const errors: ProtocolRegistryError[] = [];
  const firstIndexByName = new Map<string, number>();
  const firstFlagged = new Set<string>();
  const duplicated = new Set<string>();

  inputs.forEach((input, index) => {
    const id = input.protocolId.trim();
    if (!id) {
      errors.push({ index, protocolId: "", message: "프로토콜 이름이 비어 있습니다." });
      return;
    }
    const firstIndex = firstIndexByName.get(id);
    if (firstIndex !== undefined) {
      duplicated.add(id);
      const message = `프로토콜 이름 ${id}이(가) 중복됩니다.`;
      // 중복된 이름은 처음 나온 행과 뒤에 나온 행 모두에 오류를 알린다.
      if (!firstFlagged.has(id)) {
        firstFlagged.add(id);
        errors.push({ index: firstIndex, protocolId: id, message });
      }
      errors.push({ index, protocolId: id, message });
      return;
    }
    firstIndexByName.set(id, index);
    try {
      protocols.set(id, buildProtocol(input));
    } catch (e) {
      if (!(e instanceof ProtocolConfigError)) throw e;
      errors.push({ index, protocolId: id, message: e.message });
    }
  });

  // 중복된 이름은 어느 쪽 설정이 맞는지 알 수 없으므로 모두 사용하지 않는다.
  for (const id of duplicated) protocols.delete(id);
  return { protocols, errors };
}
