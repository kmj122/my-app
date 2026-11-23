// CSV 읽기 (라이브러리 없이 직접 구현)
// Design Ref: §3.2, §7 — UTF-8로 읽을 수 없거나 필수 열이 없으면 파일 전체를 거부한다.
import type { Measurement } from "./types";

/** 파일 구조 자체가 잘못된 경우: 행 단위가 아니라 파일 전체를 거부한다. */
export class CsvFileError extends Error {}

export const MEASUREMENT_REQUIRED_COLUMNS = [
  "measurement_id",
  "athlete_id",
  "protocol_id",
  "session",
  "value",
] as const;

/** UTF-8 로만 읽는다. 읽을 수 없는 글자가 있으면 CsvFileError. (맨 앞 BOM은 자동으로 제거) */
export function decodeUtf8(bytes: ArrayBuffer | Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CsvFileError(
      "UTF-8로 읽을 수 없는 파일입니다. 파일을 UTF-8로 저장한 뒤 다시 올려 주세요.",
    );
  }
}

/** 따옴표("), 쉼표, 줄바꿈(\n, \r\n)을 처리해 줄과 칸으로 나눈다. 완전히 빈 줄은 건너뛴다. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;

  const endField = () => {
    row.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRow = () => {
    endField();
    // 완전히 빈 줄(칸이 하나이고 비어 있음)은 건너뛴다.
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\n") {
      endRow();
    } else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += ch;
      fieldStarted = true;
    }
  }
  if (inQuotes) {
    throw new CsvFileError("따옴표(\")가 닫히지 않은 줄이 있어 파일을 읽을 수 없습니다.");
  }
  if (fieldStarted || field !== "" || row.length > 0) endRow();
  return rows;
}

/** 첫 줄을 열 이름으로 보고, 필수 열이 모두 있는지 검사한 뒤 줄마다 {열 이름: 값}으로 돌려준다. */
export function readCsvRecords(
  text: string,
  requiredColumns: readonly string[],
  fileLabel = "CSV 파일",
): Record<string, string>[] {
  const table = parseCsvText(text);
  if (table.length === 0) {
    throw new CsvFileError(`${fileLabel}: 열 이름이 있는 첫 줄이 없습니다.`);
  }
  const header = table[0];
  const missing = requiredColumns.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    throw new CsvFileError(
      `${fileLabel}: 필수 열이 없거나 열 이름이 다릅니다 (${missing.join(", ")}).`,
    );
  }
  return table.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    header.forEach((name, i) => {
      rec[name] = cells[i] ?? "";
    });
    return rec;
  });
}

/** 측정 기록 CSV(UTF-8)를 읽어 측정 기록 목록으로 바꾼다. 파일 구조 오류는 CsvFileError. */
export function parseMeasurementsCsv(bytes: ArrayBuffer | Uint8Array): Measurement[] {
  const records = readCsvRecords(
    decodeUtf8(bytes),
    MEASUREMENT_REQUIRED_COLUMNS,
    "측정값 CSV",
  );
  return records.map((r) => ({
    measurementId: r["measurement_id"],
    athleteId: r["athlete_id"],
    athleteLabel: r["athlete_label"] ?? "",
    protocolId: r["protocol_id"],
    session: r["session"],
    sessionDate: r["session_date"] ?? "",
    value: r["value"],
    source: "csv" as const,
  }));
}
