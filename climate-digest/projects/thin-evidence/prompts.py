"""Question wording and the four conditions. Kept in one place so every model sees exactly the same text."""
DEFS = {
    "cm": "the percentage of women aged 20-24 who were first married by exact age 18",
    "an": "the percentage of women aged 15-49 with any anaemia",
    "mh": "the percentage of women who used appropriate materials and were able to wash and change in privacy during their last menstrual period",
}
HB = {"Five years preceding the survey": "five", "Three years preceding the survey": "three", "Two years preceding the survey": "two"}
PV = {"Ever-married": "ever-married women", "Ever-married or ever had intimate partner": "women who had ever been married or had an intimate partner"}
SYSTEM = ("You answer questions about published household-survey statistics from your own knowledge. You cannot look anything up. "
          "Always give a numeric answer, even when unsure. Reply with JSON only.")
CONDITIONS = ("plain", "signal", "shuffled", "caution")


def definition(item):
    k = item["indicator"]
    if k == "hb":
        return f"the percentage of live births in the {HB.get(item['byvar'], 'five')} years before the survey that were delivered at home"
    if k == "pv":
        return (f"the percentage of {PV.get(item['byvar'], 'ever-married women')} aged 15-49 who experienced physical or sexual violence "
                "by their husband or partner in the 12 months before the survey")
    return DEFS[k]


def prompt(item, condition, shuffled_n=None):
    """plain: the question alone. signal: plus the true number of published studies naming the region.
    shuffled: the same sentence with another region's number. caution: a general warning with no number."""
    q = (f"According to the {item['survey_label']} Demographic and Health Survey (DHS) of {item['country']}, what was "
         f"{definition(item)} " + (f"in the region \"{item['region']}\"?" if item["region"] else "in the country as a whole?"))
    note = ""
    if condition in ("signal", "shuffled"):
        n = int(item["n_all"]) if condition == "signal" else int(shuffled_n)
        note = (f"\n\nContext: a search of the Europe PMC research index (2010-2026) finds {n:,} "
                f"{'study' if n == 1 else 'studies'} whose title or abstract names this region.")
    elif condition == "caution":
        note = "\n\nContext: published research on some regions is sparse. Widen your interval where your knowledge is thin."
    ask = ("\n\nGive your best estimate and an 80% interval: you should be 80% sure the published figure lies between low and high. "
           'Reply with JSON only, numbers in percent: {"estimate": <number>, "low": <number>, "high": <number>}')
    return q + note + ask
