import { contractMeta, type AgreementType } from '@/lib/legal/contracts';

type RGB = [number, number, number];

type PageState = {
  commands: string[];
  y: number;
  pageNumber: number;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 38;
const TOP_START_Y = 772;
const BOTTOM_LIMIT = 72;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const COLORS = {
  ink: [19 / 255, 32 / 255, 51 / 255] as RGB,
  muted: [94 / 255, 104 / 255, 121 / 255] as RGB,
  green: [15 / 255, 138 / 255, 67 / 255] as RGB,
  red: [155 / 255, 28 / 255, 28 / 255] as RGB,
  paper: [247 / 255, 241 / 255, 230 / 255] as RGB,
  panel: [1, 253 / 255, 248 / 255] as RGB,
  border: [215 / 255, 208 / 255, 195 / 255] as RGB,
  watermark: [223 / 255, 216 / 255, 203 / 255] as RGB,
  black: [11 / 255, 16 / 255, 24 / 255] as RGB,
  white: [1, 1, 1] as RGB,
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function rgb([r, g, b]: RGB) {
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function wrapText(text: string, maxChars: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function rect(cmds: string[], x: number, y: number, w: number, h: number, fill?: RGB, stroke?: RGB, lineWidth = 1) {
  cmds.push('q');
  if (fill) cmds.push(`${rgb(fill)} rg`);
  if (stroke) {
    cmds.push(`${rgb(stroke)} RG`);
    cmds.push(`${lineWidth} w`);
  }
  cmds.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
  cmds.push(fill && stroke ? 'B' : fill ? 'f' : 'S');
  cmds.push('Q');
}

function line(cmds: string[], x1: number, y1: number, x2: number, y2: number, stroke: RGB, lineWidth = 1) {
  cmds.push('q');
  cmds.push(`${rgb(stroke)} RG`);
  cmds.push(`${lineWidth} w`);
  cmds.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  cmds.push('Q');
}

function textBlock(cmds: string[], x: number, y: number, lines: string[], options: { size?: number; leading?: number; color?: RGB; font?: 'F1' | 'F2' } = {}) {
  const size = options.size ?? 11;
  const leading = options.leading ?? size * 1.45;
  const color = options.color ?? COLORS.ink;
  const font = options.font ?? 'F1';
  cmds.push('BT');
  cmds.push(`/${font} ${size} Tf`);
  cmds.push(`${rgb(color)} rg`);
  cmds.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
  cmds.push(`${leading.toFixed(2)} TL`);
  lines.forEach((entry, index) => {
    const safe = escapePdfText(entry || ' ');
    cmds.push(index === 0 ? `(${safe}) Tj` : `T* (${safe}) Tj`);
  });
  cmds.push('ET');
}

function drawAffiliaMark(cmds: string[], x: number, y: number, size: number) {
  rect(cmds, x, y, size, size, COLORS.black, undefined, 0);
  rect(cmds, x + size * 0.18, y + size * 0.60, size * 0.64, size * 0.12, COLORS.red, undefined, 0);
  rect(cmds, x + size * 0.18, y + size * 0.28, size * 0.64, size * 0.12, COLORS.green, undefined, 0);
  cmds.push('q');
  cmds.push(`${rgb(COLORS.white)} rg`);
  cmds.push(`${(x + size * 0.18).toFixed(2)} ${(y + size * 0.16).toFixed(2)} m ${(x + size * 0.42).toFixed(2)} ${(y + size * 0.82).toFixed(2)} l ${(x + size * 0.56).toFixed(2)} ${(y + size * 0.82).toFixed(2)} l ${(x + size * 0.32).toFixed(2)} ${(y + size * 0.16).toFixed(2)} l f`);
  cmds.push(`${(x + size * 0.48).toFixed(2)} ${(y + size * 0.16).toFixed(2)} m ${(x + size * 0.62).toFixed(2)} ${(y + size * 0.56).toFixed(2)} l ${(x + size * 0.78).toFixed(2)} ${(y + size * 0.16).toFixed(2)} l ${(x + size * 0.66).toFixed(2)} ${(y + size * 0.16).toFixed(2)} l ${(x + size * 0.58).toFixed(2)} ${(y + size * 0.38).toFixed(2)} l ${(x + size * 0.50).toFixed(2)} ${(y + size * 0.16).toFixed(2)} l f`);
  cmds.push('Q');
}

function drawHeader(page: PageState, title: string, blurb: string, agreementType: AgreementType) {
  rect(page.commands, 0, PAGE_HEIGHT - 10, PAGE_WIDTH * 0.3, 10, COLORS.black, undefined, 0);
  rect(page.commands, PAGE_WIDTH * 0.3, PAGE_HEIGHT - 10, PAGE_WIDTH * 0.2, 10, COLORS.red, undefined, 0);
  rect(page.commands, PAGE_WIDTH * 0.5, PAGE_HEIGHT - 10, PAGE_WIDTH * 0.1, 10, COLORS.white, undefined, 0);
  rect(page.commands, PAGE_WIDTH * 0.6, PAGE_HEIGHT - 10, PAGE_WIDTH * 0.4, 10, COLORS.green, undefined, 0);

  textBlock(page.commands, 140, 430, ['AFFILIA'], { size: 64, leading: 66, color: COLORS.watermark, font: 'F2' });
  textBlock(page.commands, 132, 392, [agreementType === 'merchant' ? 'MERCHANT AGREEMENT' : 'AFFILIATE AGREEMENT'], { size: 18, leading: 20, color: COLORS.watermark, font: 'F2' });

  drawAffiliaMark(page.commands, MARGIN_X, 760, 28);
  textBlock(page.commands, 74, 781, ['AFFILIA LEGAL AGREEMENT'], { size: 10, leading: 12, color: COLORS.red, font: 'F2' });
  textBlock(page.commands, MARGIN_X, 744, [title], { size: 24, leading: 26, color: COLORS.ink, font: 'F2' });
  textBlock(page.commands, MARGIN_X, 724, wrapText(blurb, 86), { size: 10, leading: 14, color: COLORS.muted });
  line(page.commands, MARGIN_X, 706, PAGE_WIDTH - MARGIN_X, 706, COLORS.border, 1);
  page.y = 688;
}

function drawFooter(page: PageState) {
  line(page.commands, MARGIN_X, 44, PAGE_WIDTH - MARGIN_X, 44, COLORS.border, 1);
  textBlock(page.commands, MARGIN_X, 30, ['Bridge. Earn. Grow.'], { size: 8, leading: 10, color: COLORS.muted, font: 'F2' });
  textBlock(page.commands, PAGE_WIDTH - 232, 30, ['affilia-support@gmail.com · +254742972001'], { size: 8, leading: 10, color: COLORS.muted });
  textBlock(page.commands, PAGE_WIDTH - 86, 30, [`Page ${page.pageNumber}`], { size: 8, leading: 10, color: COLORS.muted, font: 'F2' });
}

function panelHeight(lineCount: number, heading = false) {
  return 20 + lineCount * 13 + (heading ? 14 : 0);
}

function newPage(pageNumber: number, title: string, blurb: string, agreementType: AgreementType) {
  const page: PageState = { commands: [], y: TOP_START_Y, pageNumber };
  rect(page.commands, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.paper, undefined, 0);
  drawHeader(page, title, blurb, agreementType);
  drawFooter(page);
  return page;
}

function ensureSpace(pages: PageState[], needed: number, title: string, blurb: string, agreementType: AgreementType) {
  let current = pages[pages.length - 1];
  if (current.y - needed < BOTTOM_LIMIT) {
    current = newPage(pages.length + 1, title, blurb, agreementType);
    pages.push(current);
  }
  return current;
}

function addSectionTitle(pages: PageState[], titleText: string, title: string, blurb: string, agreementType: AgreementType) {
  const current = ensureSpace(pages, 28, title, blurb, agreementType);
  textBlock(current.commands, MARGIN_X, current.y, [titleText.toUpperCase()], { size: 12, leading: 14, color: COLORS.green, font: 'F2' });
  current.y -= 24;
}

function addPanel(pages: PageState[], heading: string | null, bodyLines: string[], title: string, blurb: string, agreementType: AgreementType) {
  const height = panelHeight(bodyLines.length, !!heading);
  const current = ensureSpace(pages, height + 10, title, blurb, agreementType);
  const yBottom = current.y - height + 6;
  rect(current.commands, MARGIN_X, yBottom, CONTENT_WIDTH, height, COLORS.panel, COLORS.border, 1);
  let cursorY = current.y - 18;
  if (heading) {
    textBlock(current.commands, MARGIN_X + 14, cursorY, [heading], { size: 11, leading: 13, color: COLORS.ink, font: 'F2' });
    cursorY -= 18;
  }
  textBlock(current.commands, MARGIN_X + 14, cursorY, bodyLines, { size: 10, leading: 13, color: COLORS.ink });
  current.y = yBottom - 12;
}

function addChecklistItem(pages: PageState[], label: string, title: string, blurb: string, agreementType: AgreementType) {
  const current = ensureSpace(pages, 34, title, blurb, agreementType);
  const yBottom = current.y - 26;
  rect(current.commands, MARGIN_X, yBottom, CONTENT_WIDTH, 26, COLORS.panel, COLORS.border, 1);
  rect(current.commands, MARGIN_X + 12, yBottom + 8, 10, 10, undefined, COLORS.muted, 1);
  textBlock(current.commands, MARGIN_X + 30, yBottom + 10, wrapText(label, 84), { size: 10, leading: 12, color: COLORS.ink });
  current.y = yBottom - 10;
}

function addPartySection(pages: PageState[], agreementType: AgreementType, title: string, blurb: string) {
  addSectionTitle(pages, 'Party Details', title, blurb, agreementType);
  const current = ensureSpace(pages, 144, title, blurb, agreementType);
  const height = 132;
  const yBottom = current.y - height + 8;
  rect(current.commands, MARGIN_X, yBottom, CONTENT_WIDTH, height, COLORS.panel, COLORS.border, 1);
  const rows = [
    'Full legal name: _________________________________________________',
    agreementType === 'merchant'
      ? 'Business / store name: _________________________________________'
      : 'Primary phone number: __________________________________________',
    agreementType === 'merchant'
      ? 'Primary phone number: __________________________________________'
      : 'Payout phone number: ___________________________________________',
    'Signature name: _________________________________________________',
    'Signature: ______________________________________________________',
    'Date: __________________________    Place: _______________________',
  ];
  textBlock(current.commands, MARGIN_X + 14, current.y - 18, rows, { size: 10, leading: 18, color: COLORS.ink });
  current.y = yBottom - 12;
}

function buildStructuredContractPdf(agreementType: AgreementType) {
  const meta = contractMeta[agreementType];
  const title = agreementType === 'merchant' ? 'Affilia Merchant Agreement' : 'Affilia Affiliate Agreement';
  const pages = [newPage(1, title, meta.blurb, agreementType)];

  addSectionTitle(pages, 'Agreement Summary', title, meta.blurb, agreementType);
  meta.summary.forEach((item) => addPanel(pages, null, wrapText(item, 86), title, meta.blurb, agreementType));

  addSectionTitle(pages, 'Core Clauses', title, meta.blurb, agreementType);
  meta.clauses.forEach((clause) => addPanel(pages, clause.heading, wrapText(clause.detail, 82), title, meta.blurb, agreementType));

  addSectionTitle(pages, 'Required Acknowledgements', title, meta.blurb, agreementType);
  meta.acknowledgements.forEach((item) => addChecklistItem(pages, item.label, title, meta.blurb, agreementType));

  addPartySection(pages, agreementType, title, meta.blurb);

  addSectionTitle(pages, 'Affilia Notice', title, meta.blurb, agreementType);
  addPanel(
    pages,
    null,
    wrapText('This fallback PDF is generated automatically when the primary renderer is unavailable. The agreement terms, acknowledgements, and signing fields remain valid for review and formal submission inside Affilia.', 88),
    title,
    meta.blurb,
    agreementType,
  );

  return pages;
}

function assemblePdf(pages: PageState[]) {
  const objects: string[] = [];
  const pageObjectNumbers: number[] = [];
  const streamObjectNumbers: number[] = [];

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('2 0 obj\n<< /Type /Pages /Count PLACEHOLDER /Kids PLACEHOLDER >>\nendobj');

  for (const page of pages) {
    const stream = page.commands.join('\n');
    const streamObjNumber = objects.length + 1;
    streamObjectNumbers.push(streamObjNumber);
    objects.push(`${streamObjNumber} 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`);

    const pageObjNumber = objects.length + 1;
    pageObjectNumbers.push(pageObjNumber);
    objects.push(
      `${pageObjNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${streamObjNumber} 0 R /Resources << /Font << /F1 ${pageObjectNumbers.length + streamObjectNumbers.length + 2} 0 R /F2 ${pageObjectNumbers.length + streamObjectNumbers.length + 3} 0 R >> >> >>\nendobj`,
    );
  }

  const helveticaObj = objects.length + 1;
  objects.push(`${helveticaObj} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  const helveticaBoldObj = objects.length + 1;
  objects.push(`${helveticaBoldObj} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);

  objects[1] = `2 0 obj\n<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] >>\nendobj`;
  objects.splice(2, pages.length * 2, ...pages.flatMap((page, index) => {
    const stream = page.commands.join('\n');
    const streamObjNumber = 3 + index * 2;
    const pageObjNumber = 4 + index * 2;
    return [
      `${streamObjNumber} 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`,
      `${pageObjNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${streamObjNumber} 0 R /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R /F2 ${4 + pages.length * 2} 0 R >> >> >>\nendobj`,
    ];
  }));

  const finalObjects = [
    objects[0],
    objects[1],
    ...pages.flatMap((page, index) => {
      const stream = page.commands.join('\n');
      const streamObjNumber = 3 + index * 2;
      const pageObjNumber = 4 + index * 2;
      return [
        `${streamObjNumber} 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`,
        `${pageObjNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${streamObjNumber} 0 R /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R /F2 ${4 + pages.length * 2} 0 R >> >> >>\nendobj`,
      ];
    }),
    `${3 + pages.length * 2} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
    `${4 + pages.length * 2} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of finalObjects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${finalObjects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${finalObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export function buildSimpleContractPdfString(agreementType: AgreementType) {
  return assemblePdf(buildStructuredContractPdf(agreementType));
}

export function buildSimpleContractPdfBlob(agreementType: AgreementType) {
  return new Blob([buildSimpleContractPdfString(agreementType)], { type: 'application/pdf' });
}

export function buildSimpleContractPdfBuffer(agreementType: AgreementType) {
  return Buffer.from(buildSimpleContractPdfString(agreementType), 'utf-8');
}
