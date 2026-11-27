// Renders the three application documents to A4 PDFs and reports page counts.
// Usage: node src/build.js   (run from the asia-house-fellowship-2027 folder)
//
// The contact line (email, phone) is not stored in the tracked sources. It is read
// from src/private.json ({"email": "...", "phone": "..."}) and left out if that file
// is missing.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docs = [
  ['cv.html', 'Syed_Hasnain_Akber_CV.pdf'],
  ['personal-statement.html', 'Syed_Hasnain_Akber_Personal_Statement.pdf'],
  ['research-outline.html', 'Syed_Hasnain_Akber_Research_Project_Outline.pdf'],
];

function contactLine() {
  const file = path.join(__dirname, 'private.json');
  if (!fs.existsSync(file)) return '';
  const { email, phone } = JSON.parse(fs.readFileSync(file, 'utf8'));
  return [email, phone].filter(Boolean).map((v) => ` · ${v}`).join('');
}

(async () => {
  const contact = contactLine();
  if (!contact) console.log('src/private.json not found: building without email and phone.');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [src, out] of docs) {
    const html = fs.readFileSync(path.join(__dirname, src), 'utf8').replaceAll('{{CONTACT}}', contact);
    // Written next to the source so the relative stylesheet link resolves.
    const tmp = path.join(__dirname, `.build-${src}`);
    fs.writeFileSync(tmp, html);
    try {
      await page.goto('file://' + tmp, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const outPath = path.join(__dirname, '..', out);
      await page.pdf({ path: outPath, format: 'A4', printBackground: true, preferCSSPageSize: true });
      const pages = execSync(`pdfinfo "${outPath}" | grep Pages`).toString().trim();
      console.log(`${out}: ${pages}`);
    } finally {
      fs.unlinkSync(tmp);
    }
  }
  await browser.close();
})();
