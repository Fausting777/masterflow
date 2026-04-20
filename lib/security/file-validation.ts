const FILE_SIGNATURE_BYTES = 16;

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
};

const EXTENSIONS_BY_MIME = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type SupportedFileMime = keyof typeof EXTENSIONS_BY_MIME;

export type FileValidationOptions = {
  allowedMimeTypes: readonly SupportedFileMime[];
  maxBytes: number;
};

export type FileValidationResult =
  | {
      ok: true;
      detectedMimeType: SupportedFileMime;
      extension: (typeof EXTENSIONS_BY_MIME)[SupportedFileMime];
    }
  | {
      ok: false;
      error: 'missing' | 'too_large' | 'invalid_format' | 'mime_mismatch';
    };

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  return MIME_ALIASES[normalized] ?? normalized;
}

function detectMimeType(bytes: Uint8Array): SupportedFileMime | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }

  return null;
}

export async function validateUploadedFile(
  file: File | null,
  options: FileValidationOptions
): Promise<FileValidationResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: 'missing' };
  }

  if (file.size > options.maxBytes) {
    return { ok: false, error: 'too_large' };
  }

  const sniffedBytes = new Uint8Array(
    await file.slice(0, FILE_SIGNATURE_BYTES).arrayBuffer()
  );
  const detectedMimeType = detectMimeType(sniffedBytes);

  if (!detectedMimeType || !options.allowedMimeTypes.includes(detectedMimeType)) {
    return { ok: false, error: 'invalid_format' };
  }

  const normalizedClientMime = normalizeMimeType(file.type);
  if (normalizedClientMime && normalizedClientMime !== detectedMimeType) {
    return { ok: false, error: 'mime_mismatch' };
  }

  return {
    ok: true,
    detectedMimeType,
    extension: EXTENSIONS_BY_MIME[detectedMimeType],
  };
}
