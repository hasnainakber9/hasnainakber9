// Shared docx helpers for the production guides. theme = { ACC, INK, MUTE, PAPER, LINE }
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');
const fs = require('fs');

module.exports = function guide(theme) {
  const { ACC, INK, MUTE, PAPER, LINE } = theme;
  const kids = [];
  const P = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, before: o.before ?? 0 }, shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade, color: 'auto' } : undefined,
    border: o.box ? Object.fromEntries(['top', 'bottom', 'left', 'right'].map(k => [k, { style: BorderStyle.SINGLE, size: 6, color: ACC }])) : undefined,
    indent: o.box ? { left: 200, right: 200 } : undefined, numbering: o.bullet ? { reference: 'dots', level: 0 } : undefined,
    children: (Array.isArray(text) ? text : [[text, {}]]).map(([t, r]) => new TextRun({ text: t, bold: r.b || o.b, italics: r.i || o.i, color: r.c || o.c || INK, size: r.s || o.s || 21, font: 'Calibri' })) });
  const cell = (t, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: o.head ? ACC : (o.fill || 'FFFFFF'), color: 'auto' }, margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: (Array.isArray(t) ? t : [t]).map(s => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: s, bold: !!o.head, color: o.head ? 'FFFFFF' : INK, size: o.head ? 19 : 18, font: 'Calibri' })] })) });
  const bd = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const api = {
    kids,
    title(name, sub, spec) { kids.push(P(name, { b: true, s: 56, c: ACC, after: 40 }), P(sub, { s: 26, c: MUTE, after: 60 }), P(spec, { s: 20, c: MUTE, after: 240 })); },
    h1(t) { kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 140 }, children: [new TextRun({ text: t, bold: true, color: ACC, size: 30, font: 'Calibri' })] })); },
    h2(t) { kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: [new TextRun({ text: t, bold: true, color: INK, size: 24, font: 'Calibri' })] })); },
    p(t, o) { kids.push(P(t, o)); },
    box(label, text) { kids.push(P([[label + ' ', { b: true }], [text, {}]], { box: true, shade: PAPER, after: 200 })); },
    bullets(list) { for (const t of list) kids.push(P(t, { bullet: true, after: 60 })); },
    table(widths, head, rows) {
      kids.push(new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
        borders: { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd },
        rows: [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], { head: true })) }),
          ...rows.map((r, k) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], { fill: k % 2 ? PAPER : 'FFFFFF' })) }))] }));
      kids.push(P('', { after: 60 }));
    },
    script(rows) { api.table([700, 700, 1400, 3300, 2500, 1500], ['IN', 'OUT', 'Speaker', 'Line', 'ON SCREEN', 'AFTER'], rows); },
    syncStandard(extra = []) {
      api.bullets([
        'Every line belongs to one on-screen mouth. The speaker is in frame and facing camera enough to read the mouth for the whole line. No line plays over a wide where the mouth is smaller than one-twelfth of frame height.',
        'Voices first. Record or synthesise every line, lock it to the IN and OUT times in the screenplay, then drive each talking shot from its final audio file with audio-driven talking generation. Never generate the face first and fit the voice afterwards.',
        'Pass-fail check on every line: lips closed on every M, B and P; mouth open on A and O vowels; the jaw stops when the audio stops. Drift over two frames is a reject. A line the generator cannot hold is split across two shots, never stretched.',
        'One speaker at a time with at least 0.3 s between lines. The AFTER column is the reaction beat and it is not optional.',
        'Picture before voice: whatever a line refers to is on screen before the line is spoken.',
        'Voice sits where the mouth is: centred, dry and close on close-ups, a little room on mediums. Music and atmosphere duck at least 6 dB under every line.',
        'Delivery proof with every cut: the dialogue sheet with final timecodes; a contact sheet with a frame at the start, middle and end of every line showing the speaker\'s mouth; an SRT within 0.1 s of each mouth opening.',
        'Two tests with someone who has not read this guide. Muted: they can say who is speaking in every scene. Eyes closed: they can count the voices and their order. Both must pass before the cut is sent.',
        ...extra,
      ]);
    },
    save(file) {
      const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
        styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
        sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
      return Packer.toBuffer(doc).then(b => { fs.writeFileSync(file, b); console.log('written', file); });
    },
  };
  return api;
};
