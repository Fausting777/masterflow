// lib/pdf/invoice.ts
import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

export type InvoiceData = {
  master: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
    company_name: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    tax_number: string | null;
    vat_id: string | null;
    is_kleinunternehmer: boolean;
    iban: string | null;
    bic: string | null;
    bank_name: string | null;
  };
  client: {
    full_name: string;
    phone: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
  };
  order: {
    id: string;
    invoice_number: string;        // "2026-0001"
    invoice_date: string;          // ISO Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’В°Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В° Р В Р’В Р В РІР‚В Р В Р Р‹Р Р†Р вЂљРІвЂћвЂ“Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’В»Р В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р Р‹Р В Р РЏ Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљР Р‹Р В Р Р‹Р Р†Р вЂљР’ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°
    service_date: string;          // ISO Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ Leistungsdatum
    service_title: string;
    price: number | null;
    correction_of_invoice_number?: string | null;
    description: string | null;
    order_address: string | null;
    payment_method: 'cash' | 'transfer' | 'ec_card' | 'paypal' | null;
    payment_provider?: 'sumup' | null;
    paid_at?: string | null;
    sumup?: {
      receipt_no: string | null;
      transaction_code: string | null;
      transaction_id: string | null;
      amount: number | null;
      currency: string | null;
      paid_at: string | null;
      status: string | null;
      payment_type: string | null;
      entry_mode: string | null;
    } | null;
  };
  signature: Uint8Array | null;
  photosBefore: Uint8Array[];
  photosAfter: Uint8Array[];
};

async function loadFont(filename: string): Promise<Uint8Array> {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', filename);
  const buf = await fs.readFile(fontPath);
  return new Uint8Array(buf);
}

function formatEUR(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('de-DE');
}

function addDays(iso: string, days: number): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function cleanEpcField(value: string | null | undefined, maxLength: number): string {
  return (value ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, maxLength);
}

function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;

  for (const char of rearranged) {
    const value = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of value) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
}

function buildSepaQrPayload(data: InvoiceData): string | null {
  if (data.order.payment_method !== 'transfer' || data.order.price === null || !data.master.iban || !data.master.bic) {
    return null;
  }

  const recipient = cleanEpcField(data.master.company_name || data.master.full_name, 70);
  const iban = data.master.iban.replace(/\s+/g, '').toUpperCase();
  const bic = data.master.bic.replace(/\s+/g, '').toUpperCase();
  if (!recipient || !iban || !bic || !isValidIban(iban)) return null;

  const amount = `EUR${data.order.price.toFixed(2)}`;
  const remittance = cleanEpcField(`Rechnung ${data.order.invoice_number}`, 140);

  return [
    'BCD',
    '001',
    '1',
    'SCT',
    cleanEpcField(bic, 11),
    recipient,
    iban,
    amount,
    '', // Purpose code: unused for normal invoice payments.
    '', // Structured creditor reference: must stay empty when free text is used.
    remittance,
  ].join('\r\n');
}

async function createQrPngBytes(payload: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    type: 'image/png',
    width: 256,
  });
  const base64 = dataUrl.split(',')[1] ?? '';
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function detectImageType(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (bytes.length < 4) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  return null;
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const regular = await doc.embedFont(await loadFont('Roboto-Regular.ttf'));
  const bold = await doc.embedFont(await loadFont('Roboto-Bold.ttf'));

  const COLORS = {
    text: rgb(0.09, 0.09, 0.09),
    muted: rgb(0.45, 0.45, 0.45),
    line: rgb(0.9, 0.9, 0.9),
    accent: rgb(0.15, 0.39, 0.92),
    tableHeader: rgb(0.97, 0.97, 0.97),
    correctionBg: rgb(1, 0.97, 0.91),
    correctionText: rgb(0.72, 0.37, 0.04),
  };
  const isCorrectionDocument =
    data.order.service_title.startsWith('Korrektur:') ||
    data.order.description?.includes('Korrektur zu Rechnung') === true;

  let page = doc.addPage([595, 842]); // A4
  const W = 595;
  const H = 842;
  const margin = 50;
  let y = H - margin;

  function newPage() {
    page = doc.addPage([595, 842]);
    y = H - margin;
  }

  function ensureSpace(needed: number) {
    if (y - needed < margin + 40) newPage();
  }

  function drawRight(text: string, rightX: number, font: PDFFont, size: number, color = COLORS.text) {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: rightX - w, y, font, size, color });
  }

  function drawText(
    text: string,
    x: number,
    font: PDFFont = regular,
    size = 10,
    color = COLORS.text
  ) {
    page.drawText(text, { x, y, font, size, color });
  }

  function drawWrapped(text: string, x: number, maxWidth: number, font: PDFFont, size: number, color = COLORS.text, lineHeight = 1.3) {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      const w = font.widthOfTextAtSize(test, size);
      if (w > maxWidth && line) {
        page.drawText(line, { x, y, font, size, color });
        y -= size * lineHeight;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x, y, font, size, color });
      y -= size * lineHeight;
    }
  }

  // ===================== Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В Р В Р’В Р СћРЎвЂ™ Р В Р’В Р В Р вЂ№Р В Р’В Р РЋРЎвЂєР В Р’В Р вЂ™Р’В Р В Р’В Р РЋРІР‚в„ўР В Р’В Р РЋРЎС™Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В¦Р В Р’В Р вЂ™Р’В«: Р В Р’В Р РЋРІР‚С”Р В Р’В Р РЋРЎвЂєР В Р’В Р РЋРЎСџР В Р’В Р вЂ™Р’В Р В Р’В Р РЋРІР‚в„ўР В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р вЂ™Р’ВР В Р’В Р РЋРЎвЂєР В Р’В Р Р†Р вЂљРЎС›Р В Р’В Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’В¬ + Р В Р’В Р РЋРІвЂћСћР В Р’В Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’ВР В Р’В Р Р†Р вЂљРЎС›Р В Р’В Р РЋРЎС™Р В Р’В Р РЋРЎвЂє =====================

  // Р В Р’В Р РЋРЎв„ўР В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚ВР В Р’В Р РЋР’В Р В Р Р‹Р Р†РІР‚С™Р’В¬Р В Р Р‹Р В РІР‚С™Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎвЂєР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚СћР В Р’В Р РЋР’В "Р В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚вЂќР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р вЂ°" Р В Р’В Р В РІР‚В¦Р В Р’В Р вЂ™Р’В°Р В Р’В Р СћРІР‚В Р В Р’В Р вЂ™Р’В°Р В Р’В Р СћРІР‚ВР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚СћР В Р’В Р РЋР’В Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В¦Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В° (Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В°Р В Р’В Р РЋРІР‚Сњ Р В Р’В Р В РІР‚В  DIN 5008)
  const senderLine = [
    data.master.company_name ?? data.master.full_name ?? '',
    data.master.address ?? '',
    [data.master.postal_code, data.master.city].filter(Boolean).join(' '),
  ].filter(Boolean).join(' В· ');

  if (senderLine) {
    drawText(senderLine, margin, regular, 8, COLORS.muted);
    y -= 10;
    page.drawLine({
      start: { x: margin, y: y + 2 },
      end: { x: margin + 250, y: y + 2 },
      thickness: 0.3,
      color: COLORS.line,
    });
    y -= 10;
  }

 // Р В Р’В Р РЋРІР‚в„ўР В Р’В Р СћРІР‚ВР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РЎвЂњ Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В¦Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В° Р В Р вЂ Р В РІР‚С™Р Р†Р вЂљРЎСљ Р В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’В»Р В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’В° Р В Р’В Р В РІР‚В  "Р В Р’В Р РЋРІР‚СћР В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚СћР В Р Р‹Р Р†РІР‚С™Р’В¬Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’Вµ Р В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В¦Р В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°" (Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’В°Р В Р Р‹Р В РІР‚С™Р В Р Р‹Р Р†Р вЂљРЎв„ў DIN 5008)
const clientTop = y;
drawText(data.client.full_name, margin, bold, 11);
y -= 14;
if (data.order.order_address ?? data.client.address) {
  const addr = data.order.order_address ?? data.client.address ?? '';
  drawText(addr, margin, regular, 10);
  y -= 12;
}
if (data.client.phone) {
  drawText(`Tel.: ${data.client.phone}`, margin, regular, 9, COLORS.muted);
  y -= 11;
}

  // Р В Р’В Р вЂ™Р’В Р В Р’В Р вЂ™Р’ВµР В Р’В Р РЋРІР‚СњР В Р’В Р В РІР‚В Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’В·Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р Р†Р вЂљРІвЂћвЂ“ Р В Р Р‹Р В РЎвЂњР В Р’В Р РЋРІР‚вЂќР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’В°: Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’В°Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°, Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚СћР В Р’В Р РЋР’ВР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™ Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљР Р‹Р В Р Р‹Р Р†Р вЂљР’ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°
  const rightY = clientTop;
  const rightX = W - margin;
  const savedY = y;
  const metaLabelX = rightX - 110;

  y = rightY;
  drawRight('Rechnungsnummer:', metaLabelX, regular, 9, COLORS.muted);
  drawRight(data.order.invoice_number, rightX, bold, 10);
  y -= 14;
  drawRight('Rechnungsdatum:', metaLabelX, regular, 9, COLORS.muted);
  drawRight(formatDate(data.order.invoice_date), rightX, regular, 10);
  y -= 14;
  drawRight('Leistungsdatum:', metaLabelX, regular, 9, COLORS.muted);
  drawRight(formatDate(data.order.service_date), rightX, regular, 10);
  if (data.order.correction_of_invoice_number) {
    y -= 14;
    drawRight('Bezug auf Rechnung:', metaLabelX, regular, 9, COLORS.muted);
    drawRight(data.order.correction_of_invoice_number, rightX, bold, 10, COLORS.correctionText);
  }

  // Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В·Р В Р’В Р В РІР‚В Р В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р Р‹Р Р†Р вЂљР’В°Р В Р’В Р вЂ™Р’В°Р В Р’В Р вЂ™Р’ВµР В Р’В Р РЋР’ВР В Р Р‹Р В РЎвЂњР В Р Р‹Р В Р РЏ Р В Р’В Р РЋРІР‚Сњ Р В Р’В Р вЂ™Р’В»Р В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В Р В Р’В Р РЋРІР‚СћР В Р’В Р Р†РІР‚С›РІР‚вЂњ Р В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’Вµ
  y = Math.min(savedY, y) - 26;

  // ===================== Р В Р’В Р Р†Р вЂљРІР‚СњР В Р’В Р РЋРІР‚в„ўР В Р’В Р Р†Р вЂљРЎС™Р В Р’В Р РЋРІР‚С”Р В Р’В Р Р†Р вЂљРЎвЂќР В Р’В Р РЋРІР‚С”Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р РЋРІР‚С”Р В Р’В Р РЋРІвЂћСћ =====================
  if (isCorrectionDocument) {
    page.drawRectangle({
      x: margin,
      y: y - 28,
      width: 215,
      height: 28,
      color: COLORS.correctionBg,
    });
    y -= 18;
    drawText('Rechnungskorrektur', margin + 12, bold, 13, COLORS.correctionText);
    y -= 20;
  }

  drawText(isCorrectionDocument ? 'Korrigierte Rechnung' : 'Rechnung', margin, bold, 22, COLORS.text);
  y -= 26;

  // ===================== Р В Р’В Р РЋРЎвЂєР В Р’В Р РЋРІР‚в„ўР В Р’В Р Р†Р вЂљР’ВР В Р’В Р Р†Р вЂљРЎвЂќР В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В¦Р В Р’В Р РЋРІР‚в„ў Р В Р’В Р В РІвЂљВ¬Р В Р’В Р В Р вЂ№Р В Р’В Р Р†Р вЂљРЎвЂќР В Р’В Р В РІвЂљВ¬Р В Р’В Р Р†Р вЂљРЎС™ =====================
  const tableTop = y;
  page.drawRectangle({
    x: margin,
    y: tableTop - 22,
    width: W - 2 * margin,
    height: 22,
    color: COLORS.tableHeader,
  });

  // Р В Р’В Р РЋРІвЂћСћР В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚В: Pos | Leistung | Betrag
  const colPos = margin + 8;
  const colLeistung = margin + 40;
  const colTotals = margin + 350;
  const colBetragRight = W - margin - 8;

  drawText('Pos.', colPos, bold, 9, COLORS.text);
  y -= 15; // Р В Р’В Р В РІР‚В Р В Р’В Р В РІР‚В¦Р В Р Р‹Р РЋРІР‚СљР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р В РІР‚С™Р В Р’В Р РЋРІР‚В Р В Р Р‹Р Р†РІР‚С™Р’В¬Р В Р’В Р вЂ™Р’В°Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚В
  // Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р В РІР‚В¦Р В Р Р‹Р Р†Р вЂљР’ВР В Р’В Р РЋР’ВР В Р Р‹Р В РЎвЂњР В Р Р‹Р В Р РЏ Р В Р’В Р В РІР‚В¦Р В Р’В Р вЂ™Р’В° Р В Р Р‹Р Р†РІР‚С™Р’В¬Р В Р’В Р вЂ™Р’В°Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚СњР В Р Р‹Р РЋРІР‚Сљ Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р РЏ Р В Р’В Р В РІР‚В Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚СћР В Р Р‹Р В РІР‚С™Р В Р’В Р РЋРІР‚СћР В Р’В Р РЋРІР‚вЂњР В Р’В Р РЋРІР‚Сћ Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В»Р В Р’В Р вЂ™Р’В±Р В Р Р‹Р Р†Р вЂљР’В Р В Р’В Р вЂ™Р’В°
  y = tableTop - 15;
  drawText('Leistung', colLeistung, bold, 9, COLORS.text);
  drawRight('Betrag', colBetragRight, bold, 9, COLORS.text);

  y = tableTop - 35;

  // Р В Р’В Р В Р вЂ№Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р В РІР‚С™Р В Р’В Р РЋРІР‚СћР В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В° 1
  drawText('1', colPos, regular, 10);
  drawText(data.order.service_title, colLeistung, regular, 10);
  drawRight(formatEUR(data.order.price), colBetragRight, regular, 10);
  y -= 14;

  // Р В Р’В Р РЋРІР‚С”Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚ВР В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’Вµ Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚СћР В Р’В Р СћРІР‚В Р В Р Р‹Р РЋРІР‚СљР В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’В»Р В Р Р‹Р РЋРІР‚СљР В Р’В Р РЋРІР‚вЂњР В Р’В Р РЋРІР‚СћР В Р’В Р Р†РІР‚С›РІР‚вЂњ
  if (data.order.description) {
    const lines = data.order.description.split('\n');
    for (const line of lines) {
      drawWrapped(line, colLeistung, W - colLeistung - margin - 80, regular, 9, COLORS.muted);
    }
    y -= 5;
  }

  // Р В Р’В Р вЂ™Р’В Р В Р’В Р вЂ™Р’В°Р В Р’В Р вЂ™Р’В·Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р вЂ°
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: COLORS.line,
  });
  y -= 18;

  // ===================== Р В Р’В Р вЂ™Р’ВР В Р’В Р РЋРЎвЂєР В Р’В Р РЋРІР‚С”Р В Р’В Р Р†Р вЂљРЎС™Р В Р’В Р РЋРІР‚С” =====================
  // Netto = Brutto Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р РЏ Kleinunternehmer (Р В Р’В Р вЂ™Р’В±Р В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В· Р В Р’В Р РЋРЎС™Р В Р’В Р Р†Р вЂљРЎСљР В Р’В Р В Р вЂ№)
  if (data.master.is_kleinunternehmer) {
    page.drawRectangle({
      x: margin + 250,
      y: y - 20,
      width: W - margin - (margin + 250),
      height: 24,
      color: rgb(0.98, 0.99, 1),
    });
    y -= 16;
    drawText('Gesamtbetrag', colTotals, bold, 12, COLORS.text);
    drawRight(formatEUR(data.order.price), colBetragRight, bold, 13, COLORS.accent);
    y -= 24;

    // Р В Р’В Р РЋРІР‚С”Р В Р’В Р вЂ™Р’В±Р В Р Р‹Р В Р РЏР В Р’В Р вЂ™Р’В·Р В Р’В Р вЂ™Р’В°Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В»Р В Р Р‹Р В Р вЂ°Р В Р’В Р В РІР‚В¦Р В Р’В Р вЂ™Р’В°Р В Р Р‹Р В Р РЏ Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚СћР В Р’В Р РЋР’ВР В Р’В Р вЂ™Р’ВµР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В° Р В РІР‚в„ўР вЂ™Р’В§19 UStG
    page.drawRectangle({
      x: margin,
      y: y - 32,
      width: W - 2 * margin,
      height: 32,
      color: rgb(0.98, 0.98, 1),
    });
    y -= 12;
    drawText(
      'Gemaess Paragraf 19 UStG wird keine Umsatzsteuer berechnet.',
      margin + 10,
      regular,
      9,
      COLORS.text
    );
    y -= 10;
    drawText(
      'Kleinunternehmer-Regelung nach Paragraf 19 Abs. 1 UStG.',
      margin + 10,
      regular,
      8,
      COLORS.muted
    );
    y -= 20;
  } else {
    // Р В Р’В Р РЋРЎС™Р В Р’В Р вЂ™Р’В° Р В Р’В Р В РІР‚В Р В Р Р‹Р В РЎвЂњР В Р Р‹Р В Р РЏР В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚ВР В Р’В Р Р†РІР‚С›РІР‚вЂњ Р В Р Р‹Р В РЎвЂњР В Р’В Р вЂ™Р’В»Р В Р Р‹Р РЋРІР‚СљР В Р Р‹Р Р†Р вЂљР Р‹Р В Р’В Р вЂ™Р’В°Р В Р’В Р Р†РІР‚С›РІР‚вЂњ: Р В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљР Р‹Р В Р Р‹Р Р†Р вЂљР’ВР В Р Р‹Р Р†Р вЂљРЎв„ў Р В Р’В Р РЋРЎС™Р В Р’В Р Р†Р вЂљРЎСљР В Р’В Р В Р вЂ№ 19%
    const brutto = data.order.price ?? 0;
    const vatRate = 0.19;
    const netto = brutto / (1 + vatRate);
    const vat = brutto - netto;

    drawText('Nettobetrag', colTotals, regular, 10, COLORS.muted);
    drawRight(formatEUR(netto), colBetragRight, regular, 10);
    y -= 14;
    drawText('MwSt. 19 %', colTotals, regular, 10, COLORS.muted);
    drawRight(formatEUR(vat), colBetragRight, regular, 10);
    y -= 16;
    page.drawLine({
      start: { x: colTotals, y },
      end: { x: W - margin, y },
      thickness: 0.5,
      color: COLORS.line,
    });
    y -= 14;
    drawText('Gesamtbetrag (brutto)', colTotals, bold, 12);
    drawRight(formatEUR(brutto), colBetragRight, bold, 13, COLORS.accent);
    y -= 25;
  }

  // ===================== ZAHLUNG =====================
if (data.order.payment_method || data.order.paid_at || data.order.sumup) {
  const paymentLabels: Record<string, string> = {
    cash: 'Barzahlung',
    transfer: 'Ueberweisung',
    ec_card: 'EC-Karte',
    paypal: 'PayPal',
  };
  const label = data.order.payment_method
    ? paymentLabels[data.order.payment_method] ?? data.order.payment_method
    : 'Unbekannt';
  const providerLabel = data.order.payment_provider === 'sumup' || data.order.sumup ? 'SumUp' : null;
  const isOpenTransferInvoice = data.order.payment_method === 'transfer' && !data.order.paid_at;
  const dueDate = isOpenTransferInvoice ? addDays(data.order.invoice_date, 14) : null;
  const sepaQrPayload = buildSepaQrPayload(data);
  const sepaQrPng = sepaQrPayload ? await createQrPngBytes(sepaQrPayload) : null;

  ensureSpace(isOpenTransferInvoice ? (sepaQrPng ? 290 : 160) : data.order.sumup ? 142 : 72);
  drawText('Zahlung', margin, bold, 10);
  y -= 14;
  if (isOpenTransferInvoice) {
    drawText('Status: offen', margin, regular, 10, COLORS.text);
    y -= 14;
  } else if (data.order.paid_at) {
    drawText('Status: bezahlt', margin, regular, 10, COLORS.text);
    y -= 14;
  }
  if (data.order.payment_method) {
    drawText(`Zahlungsart: ${label}`, margin, regular, 10, COLORS.text);
    y -= 14;
  }
  if (providerLabel) {
    drawText(`Zahlungsanbieter: ${providerLabel}`, margin, regular, 10, COLORS.text);
    y -= 14;
  }
  if (data.order.paid_at) {
    drawText(`Bezahlt am: ${formatDate(data.order.paid_at)}`, margin, regular, 10, COLORS.text);
    y -= 14;
  }
  if (isOpenTransferInvoice) {
    drawText(
      `Zahlbar innerhalb von 14 Tagen${dueDate ? `, spaetestens bis ${formatDate(dueDate)}` : ''}.`,
      margin,
      regular,
      10,
      COLORS.text
    );
    y -= 14;
    drawWrapped(
      'Hinweis: Es gelten die gesetzlichen Verzugsregeln nach Paragraph 286 BGB. Gegenueber Verbrauchern tritt automatischer Verzug 30 Tage nach Faelligkeit und Zugang dieser Rechnung nur ein, wenn dieser Hinweis in der Rechnung enthalten ist.',
      margin,
      W - 2 * margin,
      regular,
      9,
      COLORS.muted
    );
    y -= 4;
    if (sepaQrPng) {
      const qrImage = await doc.embedPng(sepaQrPng);
      const qrSize = 104;
      const qrTop = y - 8;
      const qrY = qrTop - qrSize;
      const detailsX = margin + qrSize + 18;

      drawText('QR-Code fuer Banking-App:', margin, bold, 10, COLORS.text);
      y -= 14;
      page.drawImage(qrImage, { x: margin, y: qrY, width: qrSize, height: qrSize });

      let detailsY = qrTop - 18;
      const paymentDetails = [
        `Empfaenger: ${data.master.company_name || data.master.full_name || '-'}`,
        `IBAN: ${data.master.iban}`,
        data.master.bic ? `BIC: ${data.master.bic}` : null,
        `Betrag: ${formatEUR(data.order.price)}`,
        `Verwendungszweck: Rechnung ${data.order.invoice_number}`,
      ].filter(Boolean);

      for (const line of paymentDetails) {
        page.drawText(String(line), {
          x: detailsX,
          y: detailsY,
          font: regular,
          size: 9,
          color: COLORS.text,
        });
        detailsY -= 12;
      }

      y = qrY - 14;
    } else if (data.master.iban) {
      drawText(`IBAN: ${data.master.iban}`, margin, regular, 10, COLORS.text);
      y -= 14;
      if (data.master.bic) {
        drawText(`BIC: ${data.master.bic}`, margin, regular, 10, COLORS.text);
        y -= 14;
      }
    }
  }
  if (data.order.sumup) {
    const sumup = data.order.sumup;
    if (sumup.receipt_no) {
      drawText(`SumUp Beleg-Nr.: ${sumup.receipt_no}`, margin, regular, 10, COLORS.text);
      y -= 14;
    }
    if (sumup.transaction_code) {
      drawText(`SumUp Transaktionscode: ${sumup.transaction_code}`, margin, regular, 10, COLORS.text);
      y -= 14;
    }
    if (sumup.transaction_id) {
      drawText(`SumUp Transaktions-ID: ${sumup.transaction_id}`, margin, regular, 9, COLORS.muted);
      y -= 13;
    }
    if (sumup.amount !== null) {
      const currency = sumup.currency ?? 'EUR';
      drawText(`SumUp Betrag: ${formatEUR(sumup.amount)} ${currency === 'EUR' ? '' : currency}`.trim(), margin, regular, 10, COLORS.text);
      y -= 14;
    }
    if (sumup.status) {
      drawText(`SumUp Status: ${sumup.status}`, margin, regular, 9, COLORS.muted);
      y -= 13;
    }
  }
  y -= 6;
}


  // ===================== Р В Р’В Р РЋРЎСџР В Р’В Р РЋРІР‚С”Р В Р’В Р Р†Р вЂљРЎСљР В Р’В Р РЋРЎСџР В Р’В Р вЂ™Р’ВР В Р’В Р В Р вЂ№Р В Р’В Р вЂ™Р’В¬ =====================
  if (data.signature) {
  ensureSpace(180);

  // Р В Р’В Р РЋРЎвЂєР В Р’В Р вЂ™Р’ВµР В Р’В Р РЋРІР‚СњР В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ў Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚СћР В Р’В Р СћРІР‚ВР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р В РІР‚В Р В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В¶Р В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р Р‹Р В Р РЏ (Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В°Р В Р’В Р РЋРІР‚Сњ Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚ВР В Р’В Р вЂ™Р’ВµР В Р’В Р В РІР‚В¦Р В Р Р‹Р Р†Р вЂљРЎв„ў Р В Р’В Р В РІР‚В Р В Р’В Р РЋРІР‚ВР В Р’В Р СћРІР‚ВР В Р’В Р вЂ™Р’ВµР В Р’В Р вЂ™Р’В» Р В Р’В Р РЋРІР‚вЂќР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’ВµР В Р’В Р СћРІР‚В Р В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚СћР В Р’В Р СћРІР‚ВР В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚ВР В Р Р‹Р В РЎвЂњР В Р Р‹Р В Р вЂ°Р В Р Р‹Р В РІР‚в„–)
  drawText('Auftragsbestaetigung / Leistungsbestaetigung', margin, bold, 9, COLORS.text);
  y -= 12;

  drawWrapped(
    'Mit meiner Unterschrift bestaetige ich, dass die oben genannten Leistungen fachgerecht und zu meiner Zufriedenheit erbracht wurden.',
    margin,
    W - 2 * margin,
    regular,
    8,
    COLORS.muted,
    1.4
  );

  drawWrapped(
    'Ich erkenne den Rechnungsbetrag an und verpflichte mich zur Zahlung gemaess der vereinbarten Zahlungsart.',
    margin,
    W - 2 * margin,
    regular,
    8,
    COLORS.muted,
    1.4
  );

  y -= 4;

  // Р В Р’В Р РЋРЎСџР В Р’В Р РЋРІР‚СћР В Р’В Р СћРІР‚ВР В Р’В Р РЋРІР‚вЂќР В Р’В Р РЋРІР‚ВР В Р Р‹Р В РЎвЂњР В Р Р‹Р В Р вЂ°
  drawText('Unterschrift des Kunden', margin, bold, 9, COLORS.muted);
  y -= 8;

  try {
    const sig = await doc.embedPng(data.signature);
    const maxW = 180, maxH = 70;
    const scale = Math.min(maxW / sig.width, maxH / sig.height);
    const w = sig.width * scale, h = sig.height * scale;
    y -= h;
    page.drawImage(sig, { x: margin, y, width: w, height: h });
    y -= 4;
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + 180, y },
      thickness: 0.5,
      color: COLORS.line,
    });
    y -= 11;
    drawText(data.client.full_name, margin, regular, 8, COLORS.muted);
    y -= 20;
  } catch {
    y -= 10;
  }
}

  // ===================== Р В Р’В Р вЂ™Р’В¤Р В Р’В Р РЋРІР‚С”Р В Р’В Р РЋРЎвЂєР В Р’В Р РЋРІР‚С” =====================
  async function drawPhotoGrid(title: string, photos: Uint8Array[]) {
    if (photos.length === 0) return;
    ensureSpace(140);
    drawText(title, margin, bold, 10, COLORS.muted);
    y -= 12;

    const cols = 3;
    const gap = 8;
    const cellW = (W - 2 * margin - gap * (cols - 1)) / cols;
    const cellH = cellW * 0.75;
    let col = 0;

    for (const bytes of photos) {
      const type = detectImageType(bytes);
      if (!type) continue;

      try {
        const img = type === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        if (col === 0) ensureSpace(cellH + 8);

        const scale = Math.min(cellW / img.width, cellH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const cellX = margin + col * (cellW + gap);
        const cellY = y - cellH;
        const imgX = cellX + (cellW - w) / 2;
        const imgY = cellY + (cellH - h) / 2;

        page.drawImage(img, { x: imgX, y: imgY, width: w, height: h });

        col++;
        if (col >= cols) {
          col = 0;
          y -= cellH + gap;
        }
      } catch { /* skip */ }
    }
    if (col > 0) y -= cellH + gap;
    y -= 10;
  }

  await drawPhotoGrid('Fotos vor der Arbeit', data.photosBefore);
  await drawPhotoGrid('Fotos nach der Arbeit', data.photosAfter);

  // ===================== Р В Р’В Р вЂ™Р’В¤Р В Р’В Р В РІвЂљВ¬Р В Р’В Р РЋРЎвЂєР В Р’В Р Р†Р вЂљРЎС›Р В Р’В Р вЂ™Р’В  Р В Р’В Р РЋРЎС™Р В Р’В Р РЋРІР‚в„ў Р В Р’В Р Р†Р вЂљРІвЂћСћР В Р’В Р В Р вЂ№Р В Р’В Р Р†Р вЂљРЎС›Р В Р’В Р СћРЎвЂ™ Р В Р’В Р В Р вЂ№Р В Р’В Р РЋРЎвЂєР В Р’В Р вЂ™Р’В Р В Р’В Р РЋРІР‚в„ўР В Р’В Р РЋРЎС™Р В Р’В Р вЂ™Р’ВР В Р’В Р вЂ™Р’В¦Р В Р’В Р РЋРІР‚в„ўР В Р’В Р СћРЎвЂ™ =====================
  const pages = doc.getPages();
  pages.forEach((p, idx) => {
    const footerY = 40;

    // Р В Р’В Р Р†Р вЂљРЎвЂќР В Р’В Р РЋРІР‚ВР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р Р‹Р В Р РЏ
    p.drawLine({
      start: { x: margin, y: footerY + 45 },
      end: { x: W - margin, y: footerY + 45 },
      thickness: 0.3,
      color: COLORS.line,
    });

    // 3 Р В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚СњР В Р’В Р РЋРІР‚В Р В Р Р‹Р Р†Р вЂљРЎвЂєР В Р Р‹Р РЋРІР‚СљР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°
    const colW = (W - 2 * margin) / 3;

    // Р В Р’В Р РЋРІвЂћСћР В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В° 1: Р В Р’В Р РЋРІвЂћСћР В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В¦Р В Р Р‹Р Р†Р вЂљРЎв„ўР В Р’В Р вЂ™Р’В°Р В Р’В Р РЋРІР‚СњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р Р†Р вЂљРІвЂћвЂ“
    const left = [
      data.master.company_name,
      data.master.full_name,
      data.master.address,
      [data.master.postal_code, data.master.city].filter(Boolean).join(' '),
      data.master.phone ? `Tel: ${data.master.phone}` : null,
      data.master.email,
    ].filter(Boolean);

    p.drawText('Kontakt', { x: margin, y: footerY + 36, font: bold, size: 7, color: COLORS.text });
    let ly = footerY + 26;
    for (const line of left) {
      p.drawText(String(line), { x: margin, y: ly, font: regular, size: 7, color: COLORS.muted });
      ly -= 9;
    }

    // Р В Р’В Р РЋРІвЂћСћР В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В° 2: Р В Р’В Р РЋРЎС™Р В Р’В Р вЂ™Р’В°Р В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р’В Р РЋРІР‚вЂњР В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В Р В Р Р‹Р Р†Р вЂљРІвЂћвЂ“Р В Р’В Р вЂ™Р’Вµ
    const middle = [
      data.master.tax_number ? `Steuernummer: ${data.master.tax_number}` : null,
      data.master.vat_id ? `USt-IdNr.: ${data.master.vat_id}` : null,
      data.master.is_kleinunternehmer ? 'Kleinunternehmer (Paragraf 19 UStG)' : null,
    ].filter(Boolean);

    p.drawText('Steuer', { x: margin + colW, y: footerY + 36, font: bold, size: 7, color: COLORS.text });
    let my = footerY + 26;
    for (const line of middle) {
      p.drawText(String(line), { x: margin + colW, y: my, font: regular, size: 7, color: COLORS.muted });
      my -= 9;
    }

    // Р В Р’В Р РЋРІвЂћСћР В Р’В Р РЋРІР‚СћР В Р’В Р вЂ™Р’В»Р В Р’В Р РЋРІР‚СћР В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚СњР В Р’В Р вЂ™Р’В° 3: Р В Р’В Р Р†Р вЂљР’ВР В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚Сњ
    const right = [
      data.master.bank_name ? `Bank: ${data.master.bank_name}` : null,
      data.master.iban ? `IBAN: ${data.master.iban}` : null,
      data.master.bic ? `BIC: ${data.master.bic}` : null,
    ].filter(Boolean);

    p.drawText('Bankverbindung', { x: margin + colW * 2, y: footerY + 36, font: bold, size: 7, color: COLORS.text });
    let ry = footerY + 26;
    for (const line of right) {
      p.drawText(String(line), { x: margin + colW * 2, y: ry, font: regular, size: 7, color: COLORS.muted });
      ry -= 9;
    }

    // Р В Р’В Р РЋРЎС™Р В Р’В Р РЋРІР‚СћР В Р’В Р РЋР’ВР В Р’В Р вЂ™Р’ВµР В Р Р‹Р В РІР‚С™ Р В Р Р‹Р В РЎвЂњР В Р Р‹Р Р†Р вЂљРЎв„ўР В Р Р‹Р В РІР‚С™Р В Р’В Р вЂ™Р’В°Р В Р’В Р В РІР‚В¦Р В Р’В Р РЋРІР‚ВР В Р Р‹Р Р†Р вЂљР’В Р В Р Р‹Р Р†Р вЂљРІвЂћвЂ“
    const pageLabel = `Seite ${idx + 1} / ${pages.length}`;
    const pw = regular.widthOfTextAtSize(pageLabel, 7);
    p.drawText(pageLabel, {
      x: W - margin - pw,
      y: footerY - 5,
      font: regular,
      size: 7,
      color: COLORS.muted,
    });
  });

  return await doc.save();
}
