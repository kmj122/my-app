// PLAN 15번 확인: 카드 문구가 r5 스크립트 원문과 글자 하나까지 같은지
// 정답은 r5 스크립트를 실행해 뽑은 tests/fixtures/r5-card-texts.json 이다. (손으로 고치지 않는다)
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cardShort, cardText, DIR_KO, FOOTER, FORBIDDEN } from "@/lib/cardText";
import { REASON_KO } from "@/lib/labels";
import { CARD_IDS } from "@/lib/types";

interface Fixture {
  version: string;
  REASON_KO: Record<string, string>;
  DIR_KO: Record<string, string>;
  FOOTER: string;
  FORBIDDEN: string[];
  cards: { card: string; detail: string; text: [string, string, string]; short: [string, string] }[];
}
const fx: Fixture = JSON.parse(readFileSync(path.join(process.cwd(), "tests/fixtures/r5-card-texts.json"), "utf8"));

describe("정답 파일", () => {
  it("r5 에서 뽑은 것이다 (v1.1-r5)", () => expect(fx.version).toMatch(/^v1\.1-r5/));
  it("카드 7종이 모두 들어 있다", () => {
    expect(new Set(fx.cards.map((c) => c.card))).toEqual(new Set(CARD_IDS));
  });
});

describe("상수: r5 와 같다", () => {
  it("DIR_KO", () => expect(DIR_KO).toEqual(fx.DIR_KO));
  it("FOOTER (카드 공통 안내 문구)", () => expect(FOOTER).toBe(fx.FOOTER));
  it("FORBIDDEN (금지 표현) 8개, 순서까지 같다", () => {
    expect([...FORBIDDEN]).toEqual(fx.FORBIDDEN);
    expect(FORBIDDEN).toHaveLength(8);
  });
  it("REASON_KO: r5 의 6개 사유는 글자 그대로", () => {
    for (const [code, ko] of Object.entries(fx.REASON_KO)) expect(REASON_KO[code as keyof typeof REASON_KO]).toBe(ko);
  });
  it("REASON_KO: r5 에 없는 것은 측정 번호 중복 1개뿐", () => {
    const extra = Object.keys(REASON_KO).filter((k) => !(k in fx.REASON_KO));
    expect(extra).toEqual(["DUPLICATE_MEASUREMENT_ID"]);
  });
});

describe("자세히 보기 문구 (card_text) = r5", () => {
  for (const c of fx.cards) {
    it(`${c.card} ${c.detail || "(세부값 없음)"}`, () => {
      const t = cardText(c.card, c.detail);
      expect([t.title, t.body, t.nextAction]).toEqual(c.text);
    });
  }
});

describe("기본 화면 한 줄 (card_short) = r5", () => {
  for (const c of fx.cards) {
    it(`${c.card} ${c.detail || "(세부값 없음)"}`, () => {
      expect(cardShort(c.card, c.detail)).toEqual(c.short);
    });
  }
});

describe("음성 대조: 한 글자만 달라도 비교가 잡아낸다 (원본은 건드리지 않고 정답을 메모리에서만 바꾼다)", () => {
  it("자세히 보기 문구가 한 글자 다르면 불일치", () => {
    const c = fx.cards.find((x) => x.card === "SET_SWC")!;
    const t = cardText(c.card, c.detail);
    const tampered = [t.title, t.body, t.nextAction.replace("설정하세요", "설정해요")];
    expect(() => expect(tampered).toEqual(c.text)).toThrow();
  });
  it("기본 화면 한 줄이 한 글자 다르면 불일치", () => {
    const c = fx.cards.find((x) => x.card === "WITHIN_NOISE")!;
    const [a, b] = cardShort(c.card, c.detail);
    expect(() => expect([a, b.replace("관찰하세요", "관찰해요")]).toEqual(c.short)).toThrow();
  });
  it("공통 안내 문구가 한 글자 다르면 불일치", () => {
    expect(FOOTER.replace("없습니다", "없어요")).not.toBe(fx.FOOTER);
  });
});

describe("그 밖의 규칙", () => {
  it("기록 오류 카드는 사유를 한글로 보여 준다", () => {
    expect(cardText("CHECK_DATA", "OUT_OF_RANGE").body).toBe("이 선수의 기록은 판정하지 않았습니다(사유: 허용 범위를 벗어난 측정값).");
  });
  it("측정 번호 중복도 한글 사유로 (r5 에는 없는 PRD 확정 항목)", () => {
    expect(cardText("CHECK_DATA", "DUPLICATE_MEASUREMENT_ID").body).toBe(
      "이 선수의 기록은 판정하지 않았습니다(사유: 같은 측정 번호(measurement_id)가 중복됨).",
    );
  });
  it("모르는 사유 코드는 코드 그대로 (r5 의 REASON_KO.get(detail, detail) 과 같다)", () => {
    expect(cardText("CHECK_DATA", "SOMETHING").body).toContain("사유: SOMETHING)");
  });
  it("방향이 없으면 자세히 보기는 빈 글자, 기본 화면은 '변화'로 (r5 와 같다)", () => {
    expect(cardText("REVIEW_PROTOCOL", "").body.startsWith("폭이")).toBe(true);
    expect(cardShort("REVIEW_PROTOCOL", "")[0]).toBe("중요한 크기의 변화이지만 측정 오차와 구별하기 어렵습니다.");
  });
  it("모르는 카드는 새 문구를 만들지 않고 오류", () => {
    expect(() => cardShort("NOPE", "")).toThrow(/알 수 없는 카드/);
  });
});

describe("금지 표현·글자 수 (카드 전용 검사 C4 의 바탕, 정식 채점은 PLAN 16번)", () => {
  const combos = fx.cards.filter((c) => c.card !== "CHECK_DATA" || c.detail !== "");
  it("모든 카드 문구(기본 화면·자세히 보기)에 금지 표현이 없다", () => {
    for (const c of combos) {
      const t = cardText(c.card, c.detail);
      const lines = [...cardShort(c.card, c.detail), t.title, t.body, t.nextAction];
      for (const line of lines) for (const w of FORBIDDEN) expect(line.includes(w)).toBe(false);
    }
  });
  it("공통 안내 문구에도 금지 표현이 없다", () => {
    for (const w of FORBIDDEN) expect(FOOTER.includes(w)).toBe(false);
  });
  it("기본 화면 한 줄은 모두 40자 이하", () => {
    for (const c of combos) for (const line of cardShort(c.card, c.detail)) expect([...line].length).toBeLessThanOrEqual(40);
  });
});
