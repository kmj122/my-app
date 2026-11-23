"""ATHLETE SIGNAL v1.1 참조 구현 및 자동 검증 스크립트 (스크립트 버전 v1.1-r5).

사용법: python3 -I verify_athlete_signal.py [CSV 폴더 경로]
- protocols.csv, measurements.csv 로 판정을 계산하고
- expected_results.csv 의 기대 결과와 한 칸씩 대조한다.
- v1.1: card_expected_results.csv 로 코치 후속 행동 카드도 대조한다.
- 모두 일치하면 종료 코드 0, 하나라도 다르면 1, 파일 구조 오류는 2.
표준 라이브러리만 사용한다. 데이터는 전부 가상값이다.
"""
import csv
import math
import os
import re
import sys

SCRIPT_VERSION = "v1.1-r5 (기본 화면 짧은 문구 검사 포함)"
EPS = 1e-9
Z95 = 1.96
SQRT2 = math.sqrt(2.0)


def mdc95(sem):
    """MDC95 = 1.96 x SEM x sqrt(2)"""
    return Z95 * sem * SQRT2


# 숫자 형식: 앞뒤 공백 제거 후 이 정규식에 맞을 때만 숫자로 인정한다.
# 지수 표기(4e1), 쉼표(1,000), Infinity, NaN, 밑줄(1_0)은 모두 숫자로 보지 않는다.
NUMBER_RE = re.compile(r"[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)")


def to_float(text):
    """엄격한 숫자 해석. 형식에 맞지 않으면 None."""
    if text is None:
        return None
    s = str(text).strip()
    if not NUMBER_RE.fullmatch(s):
        return None
    return float(s)


def to_positive_float(text):
    """숫자 형식이 아니거나 0 이하이면 None (근거 미확보로 처리)."""
    v = to_float(text)
    if v is None or v <= 0:
        return None
    return v


class FileFormatError(Exception):
    """파일 구조 오류. 개별 선수 판정을 하지 않고 파일 단위로 중단한다."""


REQUIRED = {
    "protocols.csv": ["protocol_id", "sem_cm", "swc_cm", "plausible_min", "plausible_max"],
    "measurements.csv": ["measurement_id", "athlete_id", "protocol_id", "session", "value"],
    "card_expected_results.csv": ["case_id", "athlete_id", "protocol_id", "expected_card", "expected_detail"],
    "expected_results.csv": ["case_id","athlete_id", "protocol_id", "expected_record_status",
                             "expected_reason", "expected_change", "expected_mdc",
                             "expected_mdc_status", "expected_swc_status", "expected_sensitivity"],
}


def load_csv(path):
    name = os.path.basename(path)
    if not os.path.isfile(path):
        raise FileFormatError(f"필수 CSV 파일이 없습니다: {name}")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames or []
        missing = [c for c in REQUIRED.get(name, []) if c not in header]
        if missing:
            raise FileFormatError(f"{name}: 필수 열이 없습니다 {missing}")
        return list(reader)


def load_protocols(rows):
    """protocol_id 빈칸·중복을 파일 오류로 처리하고 프로토콜 속성을 만든다."""
    out = {}
    for p in rows:
        pid = (p.get("protocol_id") or "").strip()
        if not pid:
            raise FileFormatError("protocols.csv: protocol_id가 비어 있는 행이 있습니다")
        if pid in out:
            raise FileFormatError(f"protocols.csv: protocol_id {pid} 가 중복됩니다")
        out[pid] = protocol_info(p)
    return out


def protocol_info(p):
    """프로토콜 속성: SEM, SWC, MDC, 측정 민감도."""
    sem = to_positive_float(p.get("sem_cm"))
    swc = to_positive_float(p.get("swc_cm"))
    mdc = mdc95(sem) if sem is not None else None
    if mdc is None or swc is None:
        sens = "NOT_ASSESSED"
    elif mdc <= swc + EPS:
        sens = "CAN_DETECT_SWC"
    else:
        sens = "CANNOT_DETECT_SWC"
    lo = to_float(p.get("plausible_min"))
    hi = to_float(p.get("plausible_max"))
    if lo is None or hi is None or lo >= hi:
        raise FileFormatError(
            f"프로토콜 {p.get('protocol_id', '?')}: 허용 범위(plausible_min·plausible_max)가 "
            "숫자가 아니거나 최솟값이 최댓값보다 작지 않습니다"
        )
    return {
        "sem": sem,
        "swc": swc,
        "mdc": mdc,
        "sensitivity": sens,
        "min": lo,
        "max": hi,
    }


def judge(rows, proto):
    """한 선수·한 프로토콜의 기록 묶음을 판정 순서대로 처리한다."""
    res = {
        "record_status": None,
        "reason": "",
        "change": None,
        "mdc": proto["mdc"] if proto else None,
        "mdc_status": "NOT_ASSESSED",
        "swc_status": "NOT_ASSESSED",
        "sensitivity": proto["sensitivity"] if proto else "NOT_ASSESSED",
    }

    def error(reason):
        res["record_status"] = "DATA_ERROR"
        res["reason"] = reason
        return res

    # 1) 프로토콜 존재 여부
    if proto is None:
        return error("UNKNOWN_PROTOCOL")

    # 2) 세션 이름: BASELINE, CURRENT 외의 값(대소문자 다름 포함)이 하나라도 있으면 오류
    if any(r["session"] not in ("BASELINE", "CURRENT") for r in rows):
        return error("INVALID_SESSION")

    # 3) 세션 개수: BASELINE 1건, CURRENT 1건
    base =[r for r in rows if r["session"] == "BASELINE"]
    cur = [r for r in rows if r["session"] == "CURRENT"]
    if len(base) == 0 or len(cur) == 0:
        return error("MISSING_SESSION")
    if len(base) > 1 or len(cur) > 1:
        return error("DUPLICATE_SESSION")

    # 4) 숫자 여부
    b = to_float(base[0]["value"])
    c = to_float(cur[0]["value"])
    if b is None or c is None:
        return error("NON_NUMERIC")

    # 5) 허용 범위
    for v in (b, c):
        if v < proto["min"] or v > proto["max"]:
            return error("OUT_OF_RANGE")

    # 6) 변화량
    delta = c - b
    res["change"] = delta

    # 7) 기준 확보 여부
    missing = []
    if proto["sem"] is None:
        missing.append("SEM")
    if proto["swc"] is None:
        missing.append("SWC")
    if missing:
        res["record_status"] = "CRITERIA_MISSING"
        res["reason"] = "_".join(missing) + "_MISSING"
    else:
        res["record_status"] = "OK"

    # 8) 오차 기준(MDC) 판정: 엄격 비교
    if proto["mdc"] is not None:
        if abs(delta) > proto["mdc"] + EPS:
            res["mdc_status"] = "ABOVE_MDC_INCREASE" if delta > 0 else "ABOVE_MDC_DECREASE"
        else:
            res["mdc_status"] = "WITHIN_MDC"

    # 9) 실용 기준(SWC) 판정: 포함 비교
    if proto["swc"] is not None:
        if abs(delta) >= proto["swc"] - EPS:
            res["swc_status"] = "MEETS_SWC_INCREASE" if delta > 0 else "MEETS_SWC_DECREASE"
        else:
            res["swc_status"] = "BELOW_SWC"

    return res


def fmt3(v):
    return "" if v is None else f"{v:.3f}"


# ---------------------------------------------------------------------------
# v1.1 코치 후속 행동 카드 (판정 결과 → 카드, 통계 판정은 변경하지 않음)
# ---------------------------------------------------------------------------
REASON_KO = {
    "UNKNOWN_PROTOCOL": "등록되지 않은 측정 방식",
    "INVALID_SESSION": "세션 이름 오류",
    "MISSING_SESSION": "이전 또는 현재 측정값 없음",
    "DUPLICATE_SESSION": "같은 세션의 기록 중복",
    "NON_NUMERIC": "숫자가 아닌 측정값",
    "OUT_OF_RANGE": "허용 범위를 벗어난 측정값",
}
DIR_KO = {"INCREASE": "증가", "DECREASE": "감소"}
FOOTER = "변화의 원인은 앱이 판단하지 않습니다. 이 결과만으로 훈련 효과나 경기력 향상을 확정할 수 없습니다."
FORBIDDEN = ["향상 확정", "향상되었습니다", "입증", "부상", "피로", "처방", "바꾸세요", "효과가 있"]


def direction(res):
    for key in ("mdc_status", "swc_status"):
        v = res[key]
        if v.endswith("_INCREASE"):
            return "INCREASE"
        if v.endswith("_DECREASE"):
            return "DECREASE"
    return ""


def card(res):
    """우선순위 1~7을 위에서부터 확인해 처음 맞는 카드를 반환한다."""
    m, s = res["mdc_status"], res["swc_status"]
    above = m.startswith("ABOVE_MDC")
    meets = s.startswith("MEETS_SWC")
    if res["record_status"] == "DATA_ERROR":                       # 1
        return "CHECK_DATA", res["reason"]
    if res["reason"] in ("SEM_MISSING", "SEM_SWC_MISSING"):        # 2
        return "SECURE_SEM", res["reason"]
    if res["reason"] == "SWC_MISSING":                             # 3
        return "SET_SWC", ""
    if m == "WITHIN_MDC" and meets:                                # 4
        return "REVIEW_PROTOCOL", direction(res)
    if above and meets:                                            # 5
        return "MEANINGFUL_CHANGE", direction(res)
    if above and s == "BELOW_SWC":                                 # 6
        return "SMALL_ABOVE_MDC", direction(res)
    return "WITHIN_NOISE", ""                                      # 7


def card_text(card_id, detail):
    """화면에 표시할 제목·본문·다음 행동. 앱은 이 문구를 그대로 사용한다."""
    d = DIR_KO.get(detail, "")
    if card_id == "CHECK_DATA":
        return ("데이터 확인 필요",
                f"이 선수의 기록은 판정하지 않았습니다(사유: {REASON_KO.get(detail, detail)}).",
                "원자료(측정 장비 기록)를 확인한 뒤 값을 다시 입력하세요.")
    if card_id == "SECURE_SEM":
        if detail == "SEM_SWC_MISSING":
            return ("측정 기준 확보 필요",
                    "이 측정 방식의 측정 오차(SEM)와 실용 기준(SWC)이 모두 없어 두 판정을 모두 보류했습니다.",
                    "같은 장비·절차로 얻은 검사-재검사 신뢰도 자료로 SEM을 입력하고, SWC도 근거를 두고 설정하세요.")
        return ("측정 기준 확보 필요",
                "이 측정 방식의 측정 오차(SEM) 근거가 없어 오차 기준 판정을 보류했습니다.",
                "같은 장비·절차로 얻은 검사-재검사 신뢰도 자료로 SEM을 입력하세요.")
    if card_id == "SET_SWC":
        return ("실용 기준 설정 필요",
                "코치가 정한 실용 기준(SWC)이 없어 실용 기준 판정을 보류했습니다.",
                "종목과 선수 수준을 고려해 근거를 두고 SWC를 설정하세요.")
    if card_id == "REVIEW_PROTOCOL":
        return ("측정 방식 점검 필요",
                f"{d}폭이 코치가 설정한 실용 기준에는 도달했지만, 현재 측정 방식의 오차 기준은 넘지 못했습니다.",
                "동일한 조건에서 재측정하거나 현재 장비와 측정 절차의 신뢰도 자료를 확인하세요. "
                "더 정밀한 측정 방법이 필요한지는 코치가 검토합니다.")
    if card_id == "MEANINGFUL_CHANGE":
        return (f"두 기준을 넘는 {d} 관찰",
                f"설정한 측정 오차 기준과 실용 기준을 모두 넘는 {d}가 관찰되었습니다.",
                "측정 조건이 같았는지 먼저 확인하고, 다른 수행 지표·훈련 기록과 함께 해석하세요. "
                "다음 정기 측정에서 다시 확인하세요.")
    if card_id == "SMALL_ABOVE_MDC":
        return ("오차는 넘었지만 실용 기준 미만",
                f"설정한 측정 오차 기준을 넘는 {d}가 관찰되었으나, 코치가 설정한 실용 기준에는 미치지 못했습니다.",
                "실무적 의미는 크지 않을 수 있습니다. 다음 측정에서 같은 방향의 변화가 이어지는지 관찰하세요.")
    return ("추가 관찰",
            "측정 오차 범위 안의 변화이며 실용 기준에도 미치지 못했습니다.",
            "이 결과 하나만으로 훈련 계획을 바꾸기보다 다른 정보와 함께 검토하세요.")


def completeness_checks(expected, card_rows, groups):
    """검사해야 할 사례가 빠짐없이, 중복 없이 들어 있는지 확인한다. 실패 건수를 반환."""
    problems = []

    def dup(values):
        seen, d = set(), set()
        for v in values:
            (d if v in seen else seen).add(v)
        return sorted(d)

    for label, rows_ in (("expected_results.csv", expected), ("card_expected_results.csv", card_rows)):
        d = dup(r["case_id"] for r in rows_)
        if d:
            problems.append(f"{label}: case_id 중복 {d}")
        d = dup((r["athlete_id"], r["protocol_id"]) for r in rows_)
        if d:
            problems.append(f"{label}: 같은 선수·프로토콜 묶음 중복 {d}")

    exp_map = {r["case_id"]: (r["athlete_id"], r["protocol_id"]) for r in expected}
    card_map = {r["case_id"]: (r["athlete_id"], r["protocol_id"]) for r in card_rows}
    missing = sorted(set(exp_map) - set(card_map))
    extra = sorted(set(card_map) - set(exp_map))
    if missing:
        problems.append(f"card_expected_results.csv: 빠진 사례 {missing}")
    if extra:
        problems.append(f"card_expected_results.csv: expected_results.csv에 없는 사례 {extra}")
    mism = sorted(c for c in set(exp_map) & set(card_map) if exp_map[c] != card_map[c])
    if mism:
        problems.append(f"두 기대 결과 파일의 선수·프로토콜 불일치 {mism}")
    uncovered = sorted(set(groups) - set(exp_map.values()))
    if uncovered:
        problems.append(f"기대 결과가 없는 측정 묶음 {uncovered}")

    print("\n사례 완전성 검사")
    if problems:
        for p in problems:
            print(f"  - 실패: {p}")
    else:
        print(f"  기대 결과 {len(expected)}건·카드 기대 결과 {len(card_rows)}건, 누락·중복·불일치 없음: 통과")
    return len(problems)


def card_short(card_id, detail):
    """기본 화면에 표시할 '분석 결과 한 줄 + 다음 행동 한 줄'. 상세 문구는 card_text(자세히 보기)."""
    d = DIR_KO.get(detail, "변화")
    table = {
        "CHECK_DATA": ("데이터 확인이 필요합니다.", "측정 기록을 다시 확인하세요."),
        "SECURE_SEM": (("측정 오차와 중요 변화 기준 자료가 모두 없습니다." if detail == "SEM_SWC_MISSING"
                        else "측정 오차 자료가 없습니다."), "측정 기준 자료를 확인하세요."),
        "SET_SWC": ("중요 변화 기준이 없습니다.", "중요 변화 기준을 설정하세요."),
        "REVIEW_PROTOCOL": (f"중요한 크기의 {d}이지만 측정 오차와 구별하기 어렵습니다.",
                            "측정 조건 확인 및 재측정을 검토하세요."),
        "MEANINGFUL_CHANGE": (f"두 기준을 모두 넘는 {d}가 관찰되었습니다.", "다른 체력 지표와 함께 확인하세요."),
        "SMALL_ABOVE_MDC": (f"오차 기준은 넘었지만 작은 {d}입니다.", "다음 측정에서 추세를 확인하세요."),
        "WITHIN_NOISE": ("측정 오차 범위 안의 작은 변화입니다.", "변화를 조금 더 관찰하세요."),
    }
    return table[card_id]


def card_checks(protocols, groups, rows_):
    """카드 기대 결과 대조 + 카드 전용 단위 검사 + 금지 문구 검사. 실패 건수를 반환."""
    fails = 0
    print("\n[v1.1] 코치 후속 행동 카드")
    for e in rows_:
        got = card(judge(groups.get((e["athlete_id"], e["protocol_id"]), []), protocols.get(e["protocol_id"])))
        ok = got == (e["expected_card"], e["expected_detail"])
        fails += 0 if ok else 1
        print(f"  {e['case_id']:<4} {got[0]:<18}{got[1]:<18}{'통과' if ok else '실패 (기대 ' + e['expected_card'] + ',' + e['expected_detail'] + ')'}")

    def proto(sem="0.40", swc="1.20"):
        return protocol_info({"sem_cm": sem, "swc_cm": swc, "plausible_min": "5", "plausible_max": "100"})

    def rows(b, c):
        return [{"session": "BASELINE", "value": b}, {"session": "CURRENT", "value": c}]

    units = [
        ("C1 6번 카드: P-A 40→41.15 (오차 초과·실용 미달)", card(judge(rows("40", "41.15"), proto())),
         ("SMALL_ABOVE_MDC", "INCREASE")),
        ("C2 SEM·SWC 모두 없음", card(judge(rows("40", "42"), proto("", ""))),
         ("SECURE_SEM", "SEM_SWC_MISSING")),
        ("C3 4번 카드 감소: P-B 40→38", card(judge(rows("40", "38"), proto("1.00", "1.20"))),
         ("REVIEW_PROTOCOL", "DECREASE")),
    ]
    for name, got, want in units:
        ok = got == want
        fails += 0 if ok else 1
        print(f"  {name}: {'통과' if ok else '실패'}")

    # 모든 카드·세부 조합의 문구에 금지 표현이 없는지 검사
    combos = [("CHECK_DATA", r) for r in REASON_KO] + [
        ("SECURE_SEM", "SEM_MISSING"), ("SECURE_SEM", "SEM_SWC_MISSING"), ("SET_SWC", ""),
        ("WITHIN_NOISE", "")] + [(c, d) for c in ("REVIEW_PROTOCOL", "MEANINGFUL_CHANGE", "SMALL_ABOVE_MDC")
                                 for d in ("INCREASE", "DECREASE")]
    bad = [(c, d, w) for c, d in combos for w in FORBIDDEN
           if w in " ".join(card_text(c, d) + card_short(c, d)) + " " + FOOTER]
    long_lines = [(c, d, s) for c, d in combos for s in card_short(c, d) if len(s) > 40]
    ok = not bad and not long_lines
    fails += 0 if ok else 1
    print(f"  C4 카드 문구 {len(combos)}종(기본 화면·자세히 보기) 금지 표현 검사, 기본 화면 한 줄 40자 이하: "
          f"{'통과' if ok else '실패 ' + str(bad + long_lines)}")
    return fails, len(rows_)


def unit_checks():
    """CSV 14건이 덮지 못하는 분기를 판정 함수에 직접 넣어 확인한다. 실패 건수를 반환."""
    def proto(sem="0.40", swc="1.20"):
        return protocol_info({"sem_cm": sem, "swc_cm": swc, "plausible_min": "5", "plausible_max": "100"})

    def rows(*pairs):
        return [{"session": s, "value": v} for s, v in pairs]

    sem = 0.40
    mdc = mdc95(sem)
    cases = [
        ("U1 SEM·SWC 모두 없음",
         judge(rows(("BASELINE", "40"), ("CURRENT", "42")), proto("", "")),
         {"record_status": "CRITERIA_MISSING", "reason": "SEM_SWC_MISSING",
          "mdc_status": "NOT_ASSESSED", "swc_status": "NOT_ASSESSED", "sensitivity": "NOT_ASSESSED"}),
        ("U2 SWC = MDC95 (민감도 경계)",
         None, None),
        ("U3 |Δ| = MDC95 (오차 판정 경계)",
         judge(rows(("BASELINE", "40"), ("CURRENT", repr(40 + mdc))), proto()),
         {"record_status": "OK", "mdc_status": "WITHIN_MDC"}),
        ("U4 BASELINE 없음",
         judge(rows(("CURRENT", "42")), proto()),
         {"record_status": "DATA_ERROR", "reason": "MISSING_SESSION"}),
        ("U5 CURRENT 2건",
         judge(rows(("BASELINE", "40"), ("CURRENT", "42"), ("CURRENT", "42")), proto()),
         {"record_status": "DATA_ERROR", "reason": "DUPLICATE_SESSION"}),
        ("U6 최솟값 미만(4.99)",
         judge(rows(("BASELINE", "4.99"), ("CURRENT", "42")), proto()),
         {"record_status": "DATA_ERROR", "reason": "OUT_OF_RANGE"}),
        ("U7 SEM이 숫자 아님(abc, Infinity)",
         None, None),
        ("U8 측정값 지수 표기(4e1)",
         judge(rows(("BASELINE", "4e1"), ("CURRENT", "42")), proto()),
         {"record_status": "DATA_ERROR", "reason": "NON_NUMERIC"}),
    ]
    fails = 0
    print("\n추가 단위 검사")
    for name, got, want in cases:
        if name.startswith("U2"):
            p = protocol_info({"sem_cm": "0.40", "swc_cm": repr(mdc), "plausible_min": "5", "plausible_max": "100"})
            ok = p["sensitivity"] == "CAN_DETECT_SWC"
        elif name.startswith("U7"):
            ok = all(
                judge(rows(("BASELINE", "40"), ("CURRENT", "42")), proto(bad, "1.20"))["reason"] == "SEM_MISSING"
                for bad in ("abc", "Infinity", " ", "0")
            )
        else:
            ok = all(got[k] == v for k, v in want.items())
        fails += 0 if ok else 1
        print(f"  {name}: {'통과' if ok else '실패'}")
    # 공백이 붙은 정상 숫자는 인정해야 한다
    ok = to_float(" 42.00 ") == 42.0
    fails += 0 if ok else 1
    print(f"  U9 앞뒤 공백이 있는 숫자(' 42.00 ') 인정: {'통과' if ok else '실패'}")

    # 예상하지 않은 세션 이름은 조용히 무시하지 않는다
    ok = all(
        judge(r, proto())["reason"] == "INVALID_SESSION"
        for r in (
            rows(("BASELINE", "40"), ("MID", "41"), ("CURRENT", "42")),
            rows(("baseline", "40"), ("CURRENT", "42")),
        )
    )
    fails += 0 if ok else 1
    print(f"  U10 세션 이름 MID·소문자 baseline: {'통과' if ok else '실패'}")

    # 프로토콜 설정 오류는 프로그램 중단이 아니라 파일 오류로 보고한다
    def raises_file_error(rows_):
        try:
            load_protocols(rows_)
        except FileFormatError:
            return True
        return False

    base_p = {"protocol_id": "P-X", "sem_cm": "0.40", "swc_cm": "1.20", "plausible_min": "5", "plausible_max": "100"}
    ok = (
        raises_file_error([dict(base_p, plausible_max="abc")])
        and raises_file_error([dict(base_p, plausible_min="100", plausible_max="5")])
        and raises_file_error([base_p, dict(base_p)])
        and raises_file_error([dict(base_p, protocol_id=" ")])
        and not raises_file_error([base_p])
    )
    fails += 0 if ok else 1
    print(f"  U11 허용 범위 숫자 아님·역전, protocol_id 중복·빈칸 → 파일 오류: {'통과' if ok else '실패'}")
    return fails


def main():
    print(f"ATHLETE SIGNAL 검증 스크립트 {SCRIPT_VERSION}")
    folder = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
    try:
        protocols = load_protocols(load_csv(os.path.join(folder, "protocols.csv")))
        measurements = load_csv(os.path.join(folder, "measurements.csv"))
        expected = load_csv(os.path.join(folder, "expected_results.csv"))
        card_rows = load_csv(os.path.join(folder, "card_expected_results.csv"))
    except FileFormatError as e:
        print(f"파일 오류로 판정을 중단합니다: {e}")
        return 2

    # 공식 자체 점검
    assert abs(mdc95(0.40) - 1.10874) < 1e-4
    assert abs(mdc95(1.00) - 2.77186) < 1e-4

    groups = {}
    for r in measurements:
        groups.setdefault((r["athlete_id"], r["protocol_id"]), []).append(r)

    covered = set()
    failures = 0
    print(f"{'사례':<5}{'선수':<5}{'프로토콜':<7}{'기록상태':<17}{'사유':<18}{'변화량':>8}{'MDC':>8}  {'오차판정':<20}{'실용판정':<20}{'민감도':<18}결과")
    for e in expected:
        key = (e["athlete_id"], e["protocol_id"])
        covered.add(key)
        rows = groups.get(key, [])
        got = judge(rows, protocols.get(e["protocol_id"]))
        pairs = [
            ("record_status", got["record_status"], e["expected_record_status"]),
            ("reason", got["reason"], e["expected_reason"]),
            ("change", fmt3(got["change"]), e["expected_change"]),
            ("mdc", fmt3(got["mdc"]), e["expected_mdc"]),
            ("mdc_status", got["mdc_status"], e["expected_mdc_status"]),
            ("swc_status", got["swc_status"], e["expected_swc_status"]),
            ("sensitivity", got["sensitivity"], e["expected_sensitivity"]),
        ]
        bad = [(n, g, x) for n, g, x in pairs if g != x]
        mark = "통과" if not bad else "실패"
        print(f"{e['case_id']:<5}{e['athlete_id']:<5}{e['protocol_id']:<7}{got['record_status']:<17}{got['reason']:<18}"
              f"{fmt3(got['change']):>8}{fmt3(got['mdc']):>8}  {got['mdc_status']:<20}{got['swc_status']:<20}{got['sensitivity']:<18}{mark}")
        for n, g, x in bad:
            failures += 1
            print(f"      - {n}: 계산값={g!r}, 기대값={x!r}")

    uncovered = set(groups) - covered
    if uncovered:
        failures += 1
        print("기대 결과가 없는 측정 묶음:", sorted(uncovered))

    total = len(expected)
    if failures == 0:
        print(f"\n기대 결과 {total}개 사례 모두 통과 (불일치 0건)")
    else:
        print(f"\n기대 결과 불일치 {failures}건 발견")

    unit_fails = unit_checks()

    card_fails, _ = card_checks(protocols, groups, card_rows)
    comp_fails = completeness_checks(expected, card_rows, groups)

    if failures == 0 and unit_fails == 0 and card_fails == 0 and comp_fails == 0:
        print("\n최종: 모든 검사 통과")
        return 0
    print(f"\n최종: 실패 (기대 결과 불일치 {failures}건, 단위 검사 실패 {unit_fails}건, "
          f"카드 검사 실패 {card_fails}건, 완전성 검사 실패 {comp_fails}건)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
