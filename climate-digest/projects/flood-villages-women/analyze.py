"""What flood-affected villages report about women's sanitation, safety, childbirth and dignity.

Secondary analysis of IOM DTM Pakistan "Community Needs Identification (Flood Response)" village-level data:
  Round 6: Aug 2024, Balochistan + Khyber Pakhtunkhwa (incl. Upper/Lower Chitral)      6,292 villages
  Round 7: Sep-Oct 2025, Punjab (2025 monsoon floods)                                    6,528 villages
Source: https://data.humdata.org/dataset/pakistan-displacement-idps-community-needs-identification-iom-dtm
Unit of analysis: the village (answers come from a group of 4+ key informants per village, not from
individual women). Percentages are shares of villages that answered the question.

Usage: python3 analyze.py <round6.xlsx> <round7.xlsx>     (download both from the HDX page above)
Writes out/indicators.csv, out/men_vs_women.csv, out/by_district.csv, out/summary.json
"""
import json, sys, warnings
import numpy as np, pandas as pd
warnings.filterwarnings("ignore")

MOUNTAIN = {"Chitral - Upper", "Chitral - Lower", "Upper Kohistan", "Lower Kohistan", "Swat", "Dir Upper"}


def load(fn, rnd):
    x = pd.ExcelFile(fn)
    sheet = max(x.sheet_names, key=lambda s: x.parse(s, nrows=5).shape[1])   # the village data sheet is the widest
    d = x.parse(sheet)
    d.columns = [" ".join(str(c).split()) for c in d.columns]
    d = d[~d.iloc[:, 0].astype(str).str.startswith("#")].copy()          # drop HXL tag row
    d = d.loc[:, ~d.columns.duplicated()]
    d = d[~d[[x for x in d.columns if x.startswith("Province")][0]].astype(str).str.startswith("#")].copy()   # HXL tag row
    d["round"] = rnd
    return d


def c(d, key, which=0):
    m = [x for x in d.columns if key in x]
    if not m:
        raise KeyError(key)
    return m[which]


def harmonise(d, rnd):
    o = pd.DataFrame(index=d.index)
    o["round"] = rnd
    o["province"] = d[c(d, "Province")]
    o["district"] = d[c(d, "District")]
    o["pop"] = pd.to_numeric(d[c(d, "estimated total population")], errors="coerce")
    tdp = [x for x in d.columns if x.startswith("Total TDP Individuals")] or [c(d, "C.3 What is the estimated no. of TDPs")]
    o["tdps"] = pd.to_numeric(d[tdp[0]], errors="coerce")
    men, wom = d[c(d, "G.4 Where do most men")], d[c(d, "G.5 Where do most women")]
    o["men_open"] = men.astype(str).str.startswith("Open area").where(men.notna())
    o["women_open"] = wom.astype(str).str.startswith("Open area").where(wom.notna())
    for sex, q in (("men", "G.6 What challenges do men"), ("women", "G.7 What challenges do women")):
        base = d[c(d, q)]                                                   # the combined text answer
        none = pd.to_numeric(d[[x for x in d.columns if q in x and x.endswith("/None")][0]], errors="coerce") == 1
        answered = base.notna() | none                                      # "None" leaves the text answer empty
        for lab, opt in (("unsafe_dark", "/It’s not safe (when it is dark)"), ("unsafe_day", "/It’s not safe (during daylight)"),
                         ("no_privacy", "/Lack of privacy"), ("no_separation", "/Lack of separation between men / women"),
                         ("no_lock", "/No lock on facility"), ("too_far", "/Facilities are too far away"), ("none", "/None")):
            col = [x for x in d.columns if q in x and x.endswith(opt)][0]
            o[f"{sex}_{lab}"] = (pd.to_numeric(d[col], errors="coerce") == 1).where(answered)
    o["dignity_kits_needed"] = (pd.to_numeric(d[[x for x in d.columns if "F.6" in x and "/Dignity kits" in x][0]], errors="coerce") == 1) \
        .where(d[c(d, "F.6 What are the types of NFIs")].notna())
    o["housing_no_privacy"] = (pd.to_numeric(d[[x for x in d.columns if "F.4" in x and x.endswith("/Lack of privacy")][0]], errors="coerce") == 1) \
        .where(d[c(d, "F.4 What are the top three housing")].notna())
    birth = d[c(d, "I.6 Where do women")]
    o["birth_home"] = (birth == "At home").where(birth.notna())
    o["birth_minutes"] = pd.to_numeric(d[c(d, "I.7 How many minutes")], errors="coerce")
    o["boys_school"] = pd.to_numeric(d[c(d, "primary schools (boys)")], errors="coerce")
    o["girls_school"] = pd.to_numeric(d[c(d, "primary schools (girls)")], errors="coerce")
    o["edu_gender_unequal"] = (pd.to_numeric(d[[x for x in d.columns if "J.2" in x and x.endswith("/Unequal access based on gender")][0]], errors="coerce") == 1) \
        .where(d[c(d, "J.2 What are the issues")].notna())
    l1, l2 = d[c(d, "L.1 Do organizations inform")], d[c(d, "L.2 If there is misb")]
    o["told_aid_is_free"] = (l1 == "Yes").where(l1.isin(["Yes", "No"]))
    o["complaint_mechanism"] = (l2 == "Yes").where(l2.isin(["Yes", "No"]))
    o["complaint_unknown"] = (l2 == "Unknown").where(l2.notna())
    o["mountain"] = o.district.isin(MOUNTAIN)
    o["chitral"] = o.district.astype(str).str.startswith("Chitral")
    return o


def pct(s):
    s = s.dropna().astype(float)
    return round(100 * s.mean(), 1) if len(s) else np.nan


def main():
    r6, r7 = load(sys.argv[1], 6), load(sys.argv[2], 7)
    d = pd.concat([harmonise(r6, "R6 Aug 2024 (Balochistan, KP)"), harmonise(r7, "R7 Sep-Oct 2025 (Punjab)")], ignore_index=True)
    groups = {"All villages": d, "R6 Aug 2024 (Balochistan, KP)": d[d["round"].str.startswith("R6")],
              "R7 Sep-Oct 2025 (Punjab)": d[d["round"].str.startswith("R7")],
              "Mountain districts (R6)": d[d.mountain], "Chitral (R6)": d[d.chitral],
              "Lowland Balochistan + KP (R6)": d[d["round"].str.startswith("R6") & ~d.mountain]}
    binary = ["women_open", "men_open", "women_unsafe_dark", "men_unsafe_dark", "women_unsafe_day", "men_unsafe_day",
              "women_no_privacy", "men_no_privacy", "women_no_separation", "women_no_lock", "women_none", "men_none",
              "dignity_kits_needed", "housing_no_privacy", "birth_home", "edu_gender_unequal", "told_aid_is_free",
              "complaint_mechanism", "complaint_unknown"]
    rows = []
    for g, x in groups.items():
        rec = {"group": g, "villages": len(x), "population": int(x["pop"].sum())}
        for b in binary:
            rec[b + "_pct"] = pct(x[b]); rec[b + "_n"] = int(x[b].notna().sum())
        bm = x.birth_minutes[(x.birth_minutes > 0) & (x.birth_minutes < 1440)]
        rec["birth_minutes_median"] = float(bm.median()); rec["birth_over_60min_pct"] = pct(bm >= 60)
        rec["birth_over_120min_pct"] = pct(bm >= 120)
        s = x[["boys_school", "girls_school"]].dropna()
        s = s[(s.boys_school <= 100) & (s.girls_school <= 100)]
        rec["boys_school_mean"] = round(s.boys_school.mean(), 1); rec["girls_school_mean"] = round(s.girls_school.mean(), 1)
        rec["girls_below_boys_pct"] = pct(s.girls_school < s.boys_school)
        wo = x[x.women_open == True]
        rec["pop_in_villages_women_open"] = int(wo["pop"].sum())
        rec["pop_in_villages_women_unsafe_dark"] = int(x[x.women_unsafe_dark == True]["pop"].sum())
        rows.append(rec)
    ind = pd.DataFrame(rows)
    ind.to_csv("out/indicators.csv", index=False)

    # paired men vs women within the same village
    pr = []
    for g, x in groups.items():
        for lab in ("open", "unsafe_dark", "unsafe_day", "no_privacy"):
            p = x[[f"women_{lab}", f"men_{lab}"]].dropna().astype(bool)
            w_only = int((p.iloc[:, 0] & ~p.iloc[:, 1]).sum()); m_only = int((~p.iloc[:, 0] & p.iloc[:, 1]).sum())
            pr.append({"group": g, "indicator": lab, "n": len(p), "women_pct": round(100 * p.iloc[:, 0].mean(), 1),
                       "men_pct": round(100 * p.iloc[:, 1].mean(), 1),
                       "gap_points": round(100 * (p.iloc[:, 0].mean() - p.iloc[:, 1].mean()), 1),
                       "women_only_villages": w_only, "men_only_villages": m_only})
    pd.DataFrame(pr).to_csv("out/men_vs_women.csv", index=False)

    # link: where women use open areas, is "unsafe after dark" reported more often?
    a = d[["women_open", "women_unsafe_dark", "women_no_privacy"]].dropna().astype(bool)
    link = {"unsafe_dark_if_open_pct": round(100 * a[a.women_open].women_unsafe_dark.mean(), 1),
            "unsafe_dark_if_latrine_pct": round(100 * a[~a.women_open].women_unsafe_dark.mean(), 1),
            "no_privacy_if_open_pct": round(100 * a[a.women_open].women_no_privacy.mean(), 1),
            "no_privacy_if_latrine_pct": round(100 * a[~a.women_open].women_no_privacy.mean(), 1), "n": len(a)}

    # which sensitive topics does the questionnaire ask about at all?
    import re
    audit = {}
    for rnd, raw in (("R6", r6), ("R7", r7)):
        text = " | ".join(raw.columns)
        audit[rnd] = {"questions_and_options": len(raw.columns),
                      **{k: len(re.findall(k, text, re.I)) for k in ["menstr", "violence", "GBV", "marriage", "pregnan",
                                                                     "disab", "transgender", "harass", "exploit", "dignity kit"]}}

    bd = d.groupby(["round", "district"]).apply(lambda x: pd.Series({
        "villages": len(x), "women_open_pct": pct(x.women_open), "men_open_pct": pct(x.men_open),
        "women_unsafe_dark_pct": pct(x.women_unsafe_dark), "men_unsafe_dark_pct": pct(x.men_unsafe_dark),
        "women_no_privacy_pct": pct(x.women_no_privacy), "dignity_kits_needed_pct": pct(x.dignity_kits_needed),
        "birth_home_pct": pct(x.birth_home), "complaint_mechanism_pct": pct(x.complaint_mechanism)})).reset_index()
    bd.to_csv("out/by_district.csv", index=False)
    json.dump({"link_open_defecation_safety": link, "rounds": d["round"].value_counts().to_dict(),
               "districts": int(d.district.nunique()), "instrument_audit": audit}, open("out/summary.json", "w"), indent=1)
    pd.set_option("display.width", 250); pd.set_option("display.max_columns", 60)
    print(ind.set_index("group").T.to_string()); print(pd.DataFrame(pr).to_string()); print(link)


if __name__ == "__main__":
    main()
