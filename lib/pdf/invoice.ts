// lib/pdf/invoice.ts
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs/promises';
import path from 'path';

export type InvoiceData = {
  // Данные мастера (из profiles)
  master: {
    full_name: string | null;
    phone: string | null;
    company_name: string | null;
    email: string | null;
  };
  // Данные клиента
  client: {
    full_name: string;
    phone: string | null;
    address: string | null;
  };
  // Данные заказа
  order: {
    id: string;
    service_title: string;
    price: number | null;
    description: string | null;
    order_address: string | null;
    created_at: string;
    completed_at: string | null;
  };
  // Подпись (PNG, как Uint8Array)
  signature: Uint8Array | null;
  // Фото (JPEG/PNG, как Uint8Array[])
  photosBefore: Uint8Array[];
  photosAfter: Uint8Array[];
};

// Хелпер: чтение шрифта из public/fonts
async function loadFont(filename: string): Promise<Uint8Array> {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', filename);
  const buf = await fs.readFile(fontPath);
  return new Uint8Array(buf);
}

// Форматирование цены в евро
function formatEUR(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE');
}

// Определяем тип изображения по magic bytes
function detectImageType(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (bytes.length < 4) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  return null;
}

// Главная функция
export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Загружаем Roboto для поддержки кириллицы
  const regularFont = await doc.embedFont(await loadFont('Roboto-Regular.ttf'));
  const boldFont = await doc.embedFont(await loadFont('Roboto-Bold.ttf'));

  // Цвета (как в нашем UI)
  const textColor = rgb(0.09, 0.09, 0.09);      // #171717
  const mutedColor = rgb(0.45, 0.45, 0.45);     // neutral-500
  const lineColor = rgb(0.9, 0.9, 0.9);         // neutral-200
  const accentColor = rgb(0.15, 0.39, 0.92);    // blue-600

  let page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Хелпер для текста с авто-переносом страниц
  function drawText(text: string, options: {
    x: number;
    font?: PDFFont;
    size?: number;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
  }) {
    const font = options.font ?? regularFont;
    const size = options.size ?? 10;
    const color = options.color ?? textColor;

    // Если указан maxWidth — делаем word wrap
    if (options.maxWidth) {
      const words = text.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);
        if (testWidth > options.maxWidth && line) {
          page.drawText(line, { x: options.x, y, font, size, color });
          y -= size * 1.3;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x: options.x, y, font, size, color });
      }
    } else {
      page.drawText(text, { x: options.x, y, font, size, color });
    }
  }

  // Добавляет новую страницу при необходимости
  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = doc.addPage([595, 842]);
      y = height - margin;
    }
  }

  // ========== ШАПКА ==========
  page.drawText(data.master.company_name || 'MasterFlow', {
    x: margin,
    y,
    font: boldFont,
    size: 20,
    color: accentColor,
  });
  y -= 25;

  if (data.master.full_name) {
    page.drawText(data.master.full_name, { x: margin, y, font: regularFont, size: 10, color: mutedColor });
    y -= 14;
  }
  if (data.master.phone) {
    page.drawText(`Tel: ${data.master.phone}`, { x: margin, y, font: regularFont, size: 10, color: mutedColor });
    y -= 14;
  }
  if (data.master.email) {
    page.drawText(data.master.email, { x: margin, y, font: regularFont, size: 10, color: mutedColor });
    y -= 14;
  }

  // Номер счёта справа
  const invoiceNumber = `Nr. ${data.order.id.slice(0, 8).toUpperCase()}`;
  const invoiceDate = formatDate(data.order.completed_at ?? data.order.created_at);
  page.drawText(invoiceNumber, {
    x: width - margin - regularFont.widthOfTextAtSize(invoiceNumber, 10),
    y: height - margin - 5,
    font: boldFont,
    size: 10,
    color: textColor,
  });
  page.drawText(invoiceDate, {
    x: width - margin - regularFont.widthOfTextAtSize(invoiceDate, 10),
    y: height - margin - 21,
    font: regularFont,
    size: 10,
    color: mutedColor,
  });

  y -= 20;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lineColor,
  });
  y -= 30;

  // ========== ЗАГОЛОВОК ==========
  page.drawText('RECHNUNG / СЧЁТ', { x: margin, y, font: boldFont, size: 22, color: textColor });
  y -= 35;

  // ========== КЛИЕНТ ==========
  page.drawText('Клиент:', { x: margin, y, font: boldFont, size: 11, color: mutedColor });
  y -= 16;
  page.drawText(data.client.full_name, { x: margin, y, font: boldFont, size: 12, color: textColor });
  y -= 15;
  if (data.client.phone) {
    page.drawText(data.client.phone, { x: margin, y, font: regularFont, size: 10, color: textColor });
    y -= 13;
  }
  const displayAddress = data.order.order_address ?? data.client.address;
  if (displayAddress) {
    page.drawText(displayAddress, { x: margin, y, font: regularFont, size: 10, color: textColor });
    y -= 13;
  }
  y -= 20;

  // ========== ТАБЛИЦА ==========
  const tableY = y;
  page.drawRectangle({
    x: margin,
    y: tableY - 25,
    width: width - 2 * margin,
    height: 25,
    color: rgb(0.97, 0.97, 0.97),
  });
  page.drawText('Услуга', { x: margin + 10, y: tableY - 17, font: boldFont, size: 10, color: textColor });
  page.drawText('Сумма', {
    x: width - margin - 10 - boldFont.widthOfTextAtSize('Сумма', 10),
    y: tableY - 17,
    font: boldFont,
    size: 10,
    color: textColor,
  });
  y = tableY - 45;

  // Строка услуги
  page.drawText(data.order.service_title, { x: margin + 10, y, font: regularFont, size: 11, color: textColor });
  const priceStr = formatEUR(data.order.price);
  page.drawText(priceStr, {
    x: width - margin - 10 - regularFont.widthOfTextAtSize(priceStr, 11),
    y,
    font: regularFont,
    size: 11,
    color: textColor,
  });
  y -= 20;

  // Описание под услугой (если есть)
  if (data.order.description) {
    const descLines = data.order.description.split('\n');
    for (const line of descLines) {
      drawText(line, {
        x: margin + 10,
        size: 9,
        color: mutedColor,
        maxWidth: width - 2 * margin - 20,
      });
      y -= 12;
    }
    y -= 5;
  }

  // Разделитель
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: lineColor,
  });
  y -= 20;

  // ИТОГО
  page.drawText('ИТОГО:', { x: margin + 10, y, font: boldFont, size: 13, color: textColor });
  const totalStr = formatEUR(data.order.price);
  page.drawText(totalStr, {
    x: width - margin - 10 - boldFont.widthOfTextAtSize(totalStr, 13),
    y,
    font: boldFont,
    size: 13,
    color: accentColor,
  });
  y -= 40;

  // ========== ПОДПИСЬ ==========
  if (data.signature) {
    ensureSpace(130);
    page.drawText('Подпись клиента:', { x: margin, y, font: boldFont, size: 11, color: mutedColor });
    y -= 10;
    try {
      const sigImage = await doc.embedPng(data.signature);
      const sigMaxWidth = 200;
      const sigMaxHeight = 80;
      const scale = Math.min(sigMaxWidth / sigImage.width, sigMaxHeight / sigImage.height);
      const sigW = sigImage.width * scale;
      const sigH = sigImage.height * scale;
      y -= sigH;
      page.drawImage(sigImage, { x: margin, y, width: sigW, height: sigH });
      y -= 10;
      page.drawLine({
        start: { x: margin, y },
        end: { x: margin + 200, y },
        thickness: 0.5,
        color: lineColor,
      });
      y -= 12;
      page.drawText(data.client.full_name, { x: margin, y, font: regularFont, size: 9, color: mutedColor });
      y -= 25;
    } catch {
      // Если не удалось вставить картинку — просто пропускаем
      y -= 10;
    }
  }

  // ========== ФОТО ==========
  async function drawPhotosSection(title: string, photos: Uint8Array[]) {
    if (photos.length === 0) return;
    ensureSpace(150);
    page.drawText(title, { x: margin, y, font: boldFont, size: 11, color: mutedColor });
    y -= 15;

    const cols = 3;
    const gap = 10;
    const photoW = (width - 2 * margin - gap * (cols - 1)) / cols;
    const photoH = photoW * 0.75;

    let col = 0;
    for (const bytes of photos) {
      const type = detectImageType(bytes);
      if (!type) continue;

      try {
        const img = type === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        // Aspect-fit в ячейку
        const scale = Math.min(photoW / img.width, photoH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;

        if (col === 0) ensureSpace(photoH + 10);

        const x = margin + col * (photoW + gap);
        const cellY = y - photoH;
        // Центрируем картинку в ячейке
        const imgX = x + (photoW - w) / 2;
        const imgY = cellY + (photoH - h) / 2;
        page.drawImage(img, { x: imgX, y: imgY, width: w, height: h });

        col++;
        if (col >= cols) {
          col = 0;
          y -= photoH + 10;
        }
      } catch {
        // Пропускаем проблемные изображения
      }
    }
    if (col > 0) y -= photoH + 10;
    y -= 10;
  }

  await drawPhotosSection('Фото до работы:', data.photosBefore);
  await drawPhotosSection('Фото после работы:', data.photosAfter);

  // ========== ФУТЕР ==========
  // Проставляем на последней странице
  const lastPage = doc.getPages()[doc.getPageCount() - 1];
  lastPage.drawText(
    `Сгенерировано ${formatDate(new Date().toISOString())} — MasterFlow`,
    {
      x: margin,
      y: 30,
      font: regularFont,
      size: 8,
      color: mutedColor,
    }
  );

  return await doc.save();
}