// 테스트 도우미: 프로젝트 폴더의 검증 자료(CSV)를 읽는다. 검증 자료는 수정하지 않는다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { decodeUtf8, readCsvRecords } from "@/lib/csv";
import { buildProtocol } from "@/lib/judge";
import type { JudgeRow, Protocol, ProtocolInput } from "@/lib/types";

export function loadRecords(fileName: string, required: string[]) {
  const bytes = readFileSync(path.join(process.cwd(), fileName));
  return readCsvRecords(decodeUtf8(bytes), required, fileName);
}

export function protocolInput(
  p: Partial<ProtocolInput> & { protocolId: string },
): ProtocolInput {
  return {
    uid: "t",
    sem: "0.40",
    swc: "1.20",
    plausibleMin: "5",
    plausibleMax: "100",
    ...p,
  };
}

/** protocols.csv 한 줄 → 입력 형식 */
export function protocolInputFromCsv(r: Record<string, string>): ProtocolInput {
  return {
    uid: r["protocol_id"],
    protocolId: r["protocol_id"],
    sem: r["sem_cm"],
    swc: r["swc_cm"],
    plausibleMin: r["plausible_min"],
    plausibleMax: r["plausible_max"],
  };
}

/** 단위 검사용 프로토콜 (r5 스크립트의 proto() 와 같은 기본값) */
export function unitProto(sem = "0.40", swc = "1.20"): Protocol {
  return buildProtocol(protocolInput({ protocolId: "P-U", sem, swc }));
}

export function rows(...pairs: [string, string][]): JudgeRow[] {
  return pairs.map(([session, value]) => ({ session, value }));
}
