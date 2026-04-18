// lib/mrz/parse.ts
// Парсинг MRZ по стандарту ICAO 9303
// TD1 = 3 строки × 30 символов (немецкая ID-карта)
// TD3 = 2 строки × 44 символов (паспорт)

export type MrzData = {
  documentType: string;     // ID / P / PM
  issuingCountry: string;   // DEU
  documentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;   // ISO YYYY-MM-DD
  expiryDate: string | null;  // ISO YYYY-MM-DD
  nationality: string;
  sex: string;                // M / F
  rawLines: string[];
};

// Убираем всё кроме A-Z, 0-9 и 
function cleanMrzLine(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9<]/g, '')
    .replace(/\s+/g, '');
}

// Из MRZ-строк извлекаем 3 или 2 строки длиной ~30 или ~44
export function extractMrzLines(text: string): string[] | null {
  const lines = text
    .split('\n')
    .map(cleanMrzLine)
    .filter(l => l.length >= 28 && l.includes('<'));

  // TD1: 3 строки по 30 символов
  const td1Candidates = lines.filter(l => l.length >= 28 && l.length <= 32);
  if (td1Candidates.length >= 3) {
    return td1Candidates.slice(0, 3).map(l => l.padEnd(30, '<').slice(0, 30));
  }

  // TD3: 2 строки по 44 символов
  const td3Candidates = lines.filter(l => l.length >= 42 && l.length <= 46);
  if (td3Candidates.length >= 2) {
    return td3Candidates.slice(0, 2).map(l => l.padEnd(44, '<').slice(0, 44));
  }

  return null;
}

// ICAO date DDMMYY → ISO (YYYY-MM-DD)
function parseMrzDate(d: string, futureContext: boolean): string | null {
  if (!/^\d{6}$/.test(d)) return null;
  const yy = parseInt(d.slice(0, 2));
  const mm = parseInt(d.slice(2, 4));
  const dd = parseInt(d.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  // Для даты рождения — если yy > current year's 2 digits → 19XX, иначе 20XX
  // Для срока действия — всегда 20XX
  const currentYY = new Date().getFullYear() % 100;
  let fullYear: number;
  if (futureContext) {
    fullYear = 2000 + yy;
  } else {
    fullYear = yy > currentYY + 10 ? 1900 + yy : 2000 + yy;
  }

  const iso = `${fullYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return iso;
}

// Немецкая транслитерация умлаутов в ASCII
// ICAO 9303: Ä → AE, Ö → OE, Ü → UE, ß → SS
// И обратно:
function restoreUmlauts(s: string): string {
  // Это сложная задача, без словаря идеально не сделать.
  // В MRZ всё в верхнем регистре.
  // Эвристика: AE/OE/UE в фамилии/имени обычно → Ä/Ö/Ü
  // Но MÜLLER в MRZ = MUELLER, а имя MAEVA остаётся MAEVA.
  // Для надёжности — не подменяем, возвращаем как есть в MRZ.
  // Мастер может поправить.
  return s;
}

// Имя в MRZ: "LASTNAME<<FIRSTNAME<MIDDLENAME<<<..."
function splitName(block: string): { last: string; first: string } {
  // Убираем хвостовые 
  const trimmed = block.replace(/<+$/, '');
  const parts = trimmed.split('<<');
  const last = (parts[0] ?? '').replace(/</g, ' ').trim();
  const first = (parts[1] ?? '').replace(/</g, ' ').trim();
  return {
    last: restoreUmlauts(last),
    first: restoreUmlauts(first),
  };
}

// Основная функция
export function parseMrz(text: string): MrzData | null {
  const lines = extractMrzLines(text);
  if (!lines) return null;

  // TD1 — немецкая ID-карта (3 строки)
  if (lines.length === 3) {
    const [line1, line2, line3] = lines;

    // Строка 1: ID D + issuingCountry(3) + documentNumber(9) + ...
    const documentType = line1.slice(0, 2).replace(/</g, '');
    const issuingCountry = line1.slice(2, 5).replace(/</g, '');
    const documentNumber = line1.slice(5, 14).replace(/</g, '');

    // Строка 2: birthDate(6) + checkDigit(1) + sex(1) + expiryDate(6) + checkDigit(1) + nationality(3) + ...
    const birthRaw = line2.slice(0, 6);
    const sex = line2.slice(7, 8).replace(/</g, '');
    const expiryRaw = line2.slice(8, 14);
    const nationality = line2.slice(15, 18).replace(/</g, '');

    // Строка 3: LASTNAME<<FIRSTNAME<...
    const { last, first } = splitName(line3);

    return {
      documentType,
      issuingCountry,
      documentNumber,
      firstName: first,
      lastName: last,
      birthDate: parseMrzDate(birthRaw, false),
      expiryDate: parseMrzDate(expiryRaw, true),
      nationality,
      sex,
      rawLines: lines,
    };
  }

  // TD3 — паспорт (2 строки)
  if (lines.length === 2) {
    const [line1, line2] = lines;

    // Строка 1: P< + issuingCountry(3) + LASTNAME<<FIRSTNAME<...
    const documentType = line1.slice(0, 2).replace(/</g, '');
    const issuingCountry = line1.slice(2, 5).replace(/</g, '');
    const nameBlock = line1.slice(5);
    const { last, first } = splitName(nameBlock);

    // Строка 2: documentNumber(9) + check + nationality(3) + birthDate(6) + check + sex(1) + expiryDate(6) + ...
    const documentNumber = line2.slice(0, 9).replace(/</g, '');
    const nationality = line2.slice(10, 13).replace(/</g, '');
    const birthRaw = line2.slice(13, 19);
    const sex = line2.slice(20, 21).replace(/</g, '');
    const expiryRaw = line2.slice(21, 27);

    return {
      documentType,
      issuingCountry,
      documentNumber,
      firstName: first,
      lastName: last,
      birthDate: parseMrzDate(birthRaw, false),
      expiryDate: parseMrzDate(expiryRaw, true),
      nationality,
      sex,
      rawLines: lines,
    };
  }

  return null;
}

// Упорядоченно собираем имя в формате "Имя Фамилия"
export function formatFullName(m: MrzData): string {
  const first = m.firstName.trim();
  const last = m.lastName.trim();
  if (first && last) return `${first} ${last}`;
  return first || last;
}