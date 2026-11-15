const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/d9b33332-8280-4d44-b408-fbf4a02b0b25_3aa5ce62-efa6-48ab-aee5-b23fcc08d529/pptx/scripts/apply_theme.js");
const OUT = process.argv[2];
const THEME = { name: "Thin Evidence", headFontFace: "Cambria", bodyFontFace: "Calibri",
  colors: { dk1: "1F2430", lt1: "FFFFFF", dk2: "4A5260", lt2: "F2F1EF", accent1: "B8433A", accent2: "6B7A8F",
            accent3: "D9A441", accent4: "3F6E73", accent5: "8E6C8A", accent6: "A7AFBA", hlink: "1155CC", folHlink: "6B7A8F" } };
const pres = new pptxgen(); pres.layout = "LAYOUT_16x9";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = "Syed Hasnain Akber"; pres.title = "Confident Where Nobody Looked";
const C = pres.SchemeColor;
const FOOT = "Confident Where Nobody Looked  ·  Apart AI x Epistemics Sprint 2026";

pres.defineSlideMaster({ title: "DARK", background: { color: C.text1 }, objects: [
  { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.3, w: 8.8, h: 1.6, fontSize: 38, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
  { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.05, w: 8.8, h: 1.2, fontSize: 16, color: "D5D8DE", valign: "top", align: "left", margin: 0 }, text: "" } },
]});
pres.defineSlideMaster({ title: "CONTENT", background: { color: C.background1 }, objects: [
  { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9.0, h: 0.75, fontSize: 28, bold: true, color: C.text1, valign: "middle", margin: 0, align: "left" }, text: "" } },
  { text: { text: FOOT, options: { x: 0.5, y: 5.2, w: 7.5, h: 0.3, fontSize: 10, color: C.text2, margin: 0 } } },
], slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" } });

const MODELS = ["Qwen 3.5 397B", "GLM 5.3 Flash", "DeepSeek V4 Flash", "Gemma 4 31B", "Gemma 4 26B"];
const MCOL = ["B8433A", "3F6E73", "D9A441", "6B7A8F", "8E6C8A"];
const axis = { catAxisLabelColor: "4A5260", valAxisLabelColor: "4A5260", catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
  catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, valGridLine: { color: "E3E5E9", size: 0.75 }, catGridLine: { style: "none" },
  dataLabelFontFace: "+mn-lt", dataLabelFontSize: 11, dataLabelColor: "1F2430", titleFontFace: "+mn-lt" };
function txt(slide, text, o) { slide.addText(text, Object.assign({ isTextBox: true, fontSize: 14, color: C.text1, valign: "top", margin: 0 }, o)); }

// 1 Title
pres.addSection({ title: "Opening" });
let s = pres.addSlide({ masterName: "DARK", sectionTitle: "Opening" });
s.addText("Confident Where Nobody Looked", { placeholder: "title" });
s.addText([{ text: "Language models, women's lives and thin evidence", options: { breakLine: true } },
           { text: "Syed Hasnain Akber  ·  Karachi School of Business and Leadership (KSBL)", options: { fontSize: 13, color: "A7AFBA" } }], { placeholder: "body" });
s.addNotes("When a model is asked about women's lives in a region that little research covers, does it know less, and does it say so? We tested five open-weight models on published survey statistics.");

// 2 Setup
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Opening" });
s.addText("What we asked", { placeholder: "title" });
const stats = [["4,253", "regional questions with known answers"], ["61", "countries, 1,119 regions, DHS surveys"], ["5", "open-weight models, 80% intervals"], ["4", "ways of asking, one a placebo"]];
stats.forEach((st, i) => {
  const x = 0.5 + i * 2.3;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.3, w: 2.05, h: 1.75, fill: { color: C.background2 }, line: { type: "none" }, rectRadius: 0.08, objectName: "stat card " + (i + 1) });
  txt(s, st[0], { x: x + 0.2, y: 1.45, w: 1.65, h: 0.8, fontSize: 36, bold: true, color: C.accent1, fontFace: "Cambria" });
  txt(s, st[1], { x: x + 0.2, y: 2.25, w: 1.65, h: 0.7, fontSize: 12, color: C.text2 });
});
txt(s, [{ text: "Example: ", options: { bold: true } },
        { text: "\"According to the 2024 DHS of Nigeria, what share of women aged 20–24 were married by 18 in Kano?\" The model gives a best estimate and an 80% interval. Each region also carries a count of published studies that name it, from 0 to 4,632." }],
    { x: 0.5, y: 3.55, w: 9.0, h: 1.2, fontSize: 16 });
s.addNotes("Five indicators: child marriage, home births, anaemia, partner violence, menstrual hygiene. Baseline for every question: the same survey's national figure.");

// 3 Overconfident
pres.addSection({ title: "Findings" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Findings" });
s.addText("Every model is overconfident", { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Truth inside 80% interval", labels: MODELS, values: [25, 51, 41, 30, 16] }],
  Object.assign({ x: 0.5, y: 1.15, w: 5.6, h: 3.85, barDir: "bar", chartColors: ["B8433A"], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0\"%\"",
    valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20, catAxisOrientation: "maxMin", showLegend: false,
    showTitle: true, title: "Truth inside the stated 80% interval (%)", titleFontSize: 12, titleColor: "4A5260" }, axis));
txt(s, "80%", { x: 6.5, y: 1.3, w: 3.0, h: 0.8, fontSize: 40, bold: true, color: C.text1, fontFace: "Cambria" });
txt(s, "is what a calibrated model would score. These models score 16% to 51%.", { x: 6.5, y: 2.1, w: 3.0, h: 0.8, fontSize: 14, color: C.text2 });
txt(s, "1.9× to 7×", { x: 6.5, y: 3.05, w: 3.0, h: 0.6, fontSize: 28, bold: true, color: C.accent1, fontFace: "Cambria" });
txt(s, "wider intervals needed to reach 80%.", { x: 6.5, y: 3.65, w: 3.0, h: 0.6, fontSize: 14, color: C.text2 });
s.addNotes("Plain condition, 1,200 questions per model. Intervals with 95% bootstrap ranges are in Table 1 of the report.");

// 4 National figure
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Findings" });
s.addText("No model beats quoting the national figure", { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Model error", labels: MODELS.concat(["National figure"]), values: [13.2, 11.3, 14.6, 15.1, 15.8, 6.8] }],
  Object.assign({ x: 0.5, y: 1.15, w: 5.6, h: 3.85, barDir: "bar", chartColors: ["6B7A8F", "6B7A8F", "6B7A8F", "6B7A8F", "6B7A8F", "B8433A"], invertedColors: ["6B7A8F"],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", valAxisMinVal: 0, valAxisMaxVal: 18, valAxisMajorUnit: 3,
    catAxisOrientation: "maxMin", showLegend: false, showTitle: true, title: "Mean absolute error (percentage points)", titleFontSize: 12, titleColor: "4A5260" }, axis));
txt(s, [{ text: "Most of what a model says about a region is its belief about the country.", options: { bold: true, breakLine: true } },
        { text: " ", options: { breakLine: true, fontSize: 8 } },
        { text: "Its regional answer improves on its own whole-country answer by at most 1.4 points." }],
    { x: 6.5, y: 1.3, w: 3.0, h: 2.0, fontSize: 15 });
txt(s, [{ text: "Menstrual hygiene: ", options: { bold: true, color: "B8433A" } },
        { text: "surveys report 91% on average; models say 48% to 65%." }], { x: 6.5, y: 3.5, w: 3.0, h: 1.0, fontSize: 14, color: C.text2 });
s.addNotes("National figure error is 6.8 points. Without menstrual hygiene, model error is 8.8 to 14.0 against 7.0; still no model beats the baseline overall.");

// 5 Thin evidence
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Findings" });
s.addText("Thin evidence: answers stop following the region", { placeholder: "title" });
const BINS = ["0–9", "10–99", "100–999", "1,000+"];
const slopes = [[0.16, 0.39, 0.58, 0.70], [0.29, 0.32, 0.59, 0.69], [0.45, 0.44, 0.71, 0.62], [0.24, 0.35, 0.57, 0.41], [0.25, 0.15, 0.27, 0.37]];
s.addChart(pres.charts.LINE, MODELS.map((m, i) => ({ name: m, labels: BINS, values: slopes[i] })),
  Object.assign({ x: 0.5, y: 1.15, w: 5.8, h: 3.85, chartColors: MCOL, lineSize: 2.5, lineDataSymbol: "circle", lineDataSymbolSize: 7,
    valAxisMinVal: 0, valAxisMaxVal: 1, valAxisMajorUnit: 0.25, valAxisLabelFormatCode: "0.00", showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt", legendColor: "4A5260",
    showTitle: true, title: "Tracking slope by published studies naming the region", titleFontSize: 12, titleColor: "4A5260" }, axis));
txt(s, [{ text: "Tracking slope: ", options: { bold: true } }, { text: "how far an answer moves when a region really differs from its country. 1 is full, 0 is none." }],
    { x: 6.6, y: 1.3, w: 2.9, h: 1.3, fontSize: 14 });
txt(s, "Stated confidence barely changes: coverage is the same for a region with 3 studies or 3,000.", { x: 6.6, y: 2.75, w: 2.9, h: 1.0, fontSize: 14, color: C.text2 });
txt(s, "Significant in 4 of 5 models; not significant on large-sample survey figures. Supported, not settled.", { x: 6.6, y: 3.9, w: 2.9, h: 1.0, fontSize: 12, italic: true, color: C.text2 });
s.addNotes("Interaction of true deviation with log study count: p < 0.001 for Qwen and GLM, 0.01 and 0.04 for DeepSeek and Gemma 31B, 0.23 for Gemma 26B. On denominators of 400+ it stays positive in all five but significant in none.");

// 6 Placebo
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Findings" });
s.addText("A true study count works no better than a fake one", { placeholder: "title" });
const CONDS = ["True study count", "Another region's count", "General caution"];
const dw = [[1.0, 0.9, 6.8], [1.3, 1.0, 5.6], [-1.3, -1.2, 5.4], [2.3, 2.2, 3.3], [0.0, 0.0, 1.9]];
s.addChart(pres.charts.BAR, MODELS.map((m, i) => ({ name: m, labels: CONDS, values: dw[i] })),
  Object.assign({ x: 0.5, y: 1.15, w: 5.8, h: 3.85, barDir: "col", barGrouping: "clustered", chartColors: MCOL, valAxisMinVal: -2, valAxisMaxVal: 8, valAxisMajorUnit: 2,
    showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt", legendColor: "4A5260",
    showTitle: true, title: "Change in interval width vs the plain question (points)", titleFontSize: 12, titleColor: "4A5260" }, axis));
txt(s, [{ text: "True vs fake count: ", options: { bold: true } }, { text: "differences of −0.1 to +0.3 points, none distinguishable from zero." }],
    { x: 6.6, y: 1.3, w: 2.9, h: 1.1, fontSize: 14 });
txt(s, [{ text: "One vague sentence ", options: { bold: true } }, { text: "widens intervals 1.9 to 6.8 points; coverage still stays below 80%." }],
    { x: 6.6, y: 2.55, w: 2.9, h: 1.1, fontSize: 14 });
txt(s, [{ text: "Accuracy: ", options: { bold: true, color: "B8433A" } }, { text: "no condition improves it (−0.5 to +0.8 points)." }],
    { x: 6.6, y: 3.8, w: 2.9, h: 0.9, fontSize: 14 });
s.addNotes("This answers the Track 2 question in the brief: given a reliability signal, does accuracy improve? Here it does not.");

// 7 Takeaways
pres.addSection({ title: "Close" });
s = pres.addSlide({ masterName: "DARK", sectionTitle: "Close" });
s.addText("What this means", { placeholder: "title" });
const tk = [["For users", "For a regional figure, read the survey report. Treat a model's interval as far too narrow."],
            ["For builders", "Test any reliability signal against a placebo before claiming the model uses it."],
            ["What helps", "Intervals are ranked sensibly, so recalibration after the fact should beat prompting."]];
tk.forEach((t, i) => {
  const x = 0.6 + i * 3.0;
  txt(s, t[0], { x, y: 3.1, w: 2.7, h: 0.4, fontSize: 16, bold: true, color: "E8B4AE" });
  txt(s, t[1], { x, y: 3.5, w: 2.7, h: 1.3, fontSize: 13, color: "D5D8DE" });
});
txt(s, "Code, questions and every model answer: github.com/hasnainakber9/hasnainakber9 (branch claude/amazing-shannon-x2h4mr)", { x: 0.6, y: 5.05, w: 8.8, h: 0.3, fontSize: 10, color: "A7AFBA" });
s.addNotes("Limits: one index as a proxy for research coverage, survey sampling error, one English prompt format, five open-weight models from one provider.");

(async () => { await pres.writeFile({ fileName: OUT }); await applyTheme(OUT, THEME); console.log("wrote", OUT); })();
