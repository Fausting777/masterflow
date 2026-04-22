// lib/pdf/invoice.ts
import { PDFDocument, rgb, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
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
  };
  order: {
    id: string;
    invoice_number: string;        // "2026-0001"
    invoice_date: string;          // ISO вЂ” РґР°С‚Р° РІС‹СЃС‚Р°РІР»РµРЅРёСЏ СЃС‡С‘С‚Р°
    service_date: string;          // ISO вЂ” Leistungsdatum
    service_title: string;
    price: number | null;
    correction_of_invoice_number?: string | null;
    description: string | null;
    order_address: string | null;
    payment_method: 'cash' | 'transfer' | 'ec_card' | 'paypal' | null;
    payment_provider?: 'sumup' | null;
    paid_at?: string | null;
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
  if (value === null || value === undefined) return 'вЂ”';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return 'вЂ”';
  return new Date(iso).toLocaleDateString('de-DE');
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

  // ===================== Р’Р•Р РҐ РЎРўР РђРќРР¦Р«: РћРўРџР РђР’РРўР•Р›Р¬ + РљР›РР•РќРў =====================

  // РњРµР»РєРёРј С€СЂРёС„С‚РѕРј "РѕС‚РїСЂР°РІРёС‚РµР»СЊ" РЅР°Рґ Р°РґСЂРµСЃРѕРј РєР»РёРµРЅС‚Р° (РєР°Рє РІ DIN 5008)
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

 // РђРґСЂРµСЃ РєР»РёРµРЅС‚Р° вЂ” СЃР»РµРІР° РІ "РѕРєРѕС€РєРµ РєРѕРЅРІРµСЂС‚Р°" (СЃС‚Р°РЅРґР°СЂС‚ DIN 5008)
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

  // Р РµРєРІРёР·РёС‚С‹ СЃРїСЂР°РІР°: РґР°С‚Р°, РЅРѕРјРµСЂ СЃС‡С‘С‚Р°
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

  // Р’РѕР·РІСЂР°С‰Р°РµРјСЃСЏ Рє Р»РµРІРѕР№ РєРѕР»РѕРЅРєРµ
  y = Math.min(savedY, y) - 26;

  // ===================== Р—РђР“РћР›РћР’РћРљ =====================
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

  // ===================== РўРђР‘Р›РР¦Рђ РЈРЎР›РЈР“ =====================
  const tableTop = y;
  page.drawRectangle({
    x: margin,
    y: tableTop - 22,
    width: W - 2 * margin,
    height: 22,
    color: COLORS.tableHeader,
  });

  // РљРѕР»РѕРЅРєРё: Pos | Leistung | Betrag
  const colPos = margin + 8;
  const colLeistung = margin + 40;
  const colTotals = margin + 350;
  const colBetragRight = W - margin - 8;

  drawText('Pos.', colPos, bold, 9, COLORS.text);
  y -= 15; // РІРЅСѓС‚СЂРё С€Р°РїРєРё
  // Р’РµСЂРЅС‘РјСЃСЏ РЅР° С€Р°РїРєСѓ РґР»СЏ РІС‚РѕСЂРѕРіРѕ СЃС‚РѕР»Р±С†Р°
  y = tableTop - 15;
  drawText('Leistung', colLeistung, bold, 9, COLORS.text);
  drawRight('Betrag', colBetragRight, bold, 9, COLORS.text);

  y = tableTop - 35;

  // РЎС‚СЂРѕРєР° 1
  drawText('1', colPos, regular, 10);
  drawText(data.order.service_title, colLeistung, regular, 10);
  drawRight(formatEUR(data.order.price), colBetragRight, regular, 10);
  y -= 14;

  // РћРїРёСЃР°РЅРёРµ РїРѕРґ СѓСЃР»СѓРіРѕР№
  if (data.order.description) {
    const lines = data.order.description.split('\n');
    for (const line of lines) {
      drawWrapped(line, colLeistung, W - colLeistung - margin - 80, regular, 9, COLORS.muted);
    }
    y -= 5;
  }

  // Р Р°Р·РґРµР»РёС‚РµР»СЊ
  page.drawLine({
    start: { x: margin, y },
    end: { x: W - margin, y },
    thickness: 0.5,
    color: COLORS.line,
  });
  y -= 18;

  // ===================== РРўРћР“Рћ =====================
  // Netto = Brutto РґР»СЏ Kleinunternehmer (Р±РµР· РќР”РЎ)
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

    // РћР±СЏР·Р°С‚РµР»СЊРЅР°СЏ РїРѕРјРµС‚РєР° В§19 UStG
    page.drawRectangle({
      x: margin,
      y: y - 32,
      width: W - 2 * margin,
      height: 32,
      color: rgb(0.98, 0.98, 1),
    });
    y -= 12;
    drawText(
      'GemГ¤Гџ В§ 19 UStG wird keine Umsatzsteuer berechnet.',
      margin + 10,
      regular,
      9,
      COLORS.text
    );
    y -= 10;
    drawText(
      'Kleinunternehmer-Regelung nach В§ 19 Abs. 1 UStG.',
      margin + 10,
      regular,
      8,
      COLORS.muted
    );
    y -= 20;
  } else {
    // РќР° РІСЃСЏРєРёР№ СЃР»СѓС‡Р°Р№: СЂР°СЃС‡С‘С‚ РќР”РЎ 19%
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
if (data.order.payment_method || data.order.paid_at) {
  const paymentLabels: Record<string, string> = {
    cash: 'Barzahlung',
    transfer: 'Ueberweisung',
    ec_card: 'EC-Karte',
    paypal: 'PayPal',
  };
  const label = data.order.payment_method
    ? paymentLabels[data.order.payment_method] ?? data.order.payment_method
    : 'Unbekannt';
  const providerLabel = data.order.payment_provider === 'sumup' ? 'SumUp' : null;

  ensureSpace(72);
  drawText('Zahlung', margin, bold, 10);
  y -= 14;
  if (data.order.paid_at) {
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
  y -= 6;
}

if (false && data.order.payment_method) {
  const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Barzahlung',
    transfer: 'Гњberweisung',
    ec_card: 'EC-Karte',
    paypal: 'PayPal',
  };
  const label = PAYMENT_LABELS[data.order.payment_method!] ?? data.order.payment_method;

  ensureSpace(40);
  drawText('Zahlungsart', margin, bold, 10);
  y -= 14;
  drawText(label, margin, regular, 10, COLORS.text);
  y -= 20;
}

  // ===================== РџРћР”РџРРЎР¬ =====================
  if (data.signature) {
  ensureSpace(180);

  // РўРµРєСЃС‚ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ (РєР°Рє РєР»РёРµРЅС‚ РІРёРґРµР» РїРµСЂРµРґ РїРѕРґРїРёСЃСЊСЋ)
  drawText('AuftragsbestГ¤tigung / LeistungsbestГ¤tigung', margin, bold, 9, COLORS.text);
  y -= 12;

  drawWrapped(
    'Mit meiner Unterschrift bestГ¤tige ich, dass die oben genannten Leistungen fachgerecht und zu meiner Zufriedenheit erbracht wurden.',
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

  // РџРѕРґРїРёСЃСЊ
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

  // ===================== Р¤РћРўРћ =====================
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

  // ===================== Р¤РЈРўР•Р  РќРђ Р’РЎР•РҐ РЎРўР РђРќРР¦РђРҐ =====================
  const pages = doc.getPages();
  pages.forEach((p, idx) => {
    const footerY = 40;

    // Р›РёРЅРёСЏ
    p.drawLine({
      start: { x: margin, y: footerY + 45 },
      end: { x: W - margin, y: footerY + 45 },
      thickness: 0.3,
      color: COLORS.line,
    });

    // 3 РєРѕР»РѕРЅРєРё С„СѓС‚РµСЂР°
    const colW = (W - 2 * margin) / 3;

    // РљРѕР»РѕРЅРєР° 1: РљРѕРЅС‚Р°РєС‚С‹
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

    // РљРѕР»РѕРЅРєР° 2: РќР°Р»РѕРіРѕРІС‹Рµ
    const middle = [
      data.master.tax_number ? `Steuernummer: ${data.master.tax_number}` : null,
      data.master.vat_id ? `USt-IdNr.: ${data.master.vat_id}` : null,
      data.master.is_kleinunternehmer ? 'Kleinunternehmer (В§19 UStG)' : null,
    ].filter(Boolean);

    p.drawText('Steuer', { x: margin + colW, y: footerY + 36, font: bold, size: 7, color: COLORS.text });
    let my = footerY + 26;
    for (const line of middle) {
      p.drawText(String(line), { x: margin + colW, y: my, font: regular, size: 7, color: COLORS.muted });
      my -= 9;
    }

    // РљРѕР»РѕРЅРєР° 3: Р‘Р°РЅРє
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

    // РќРѕРјРµСЂ СЃС‚СЂР°РЅРёС†С‹
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
