// lib/validators/client.ts

export type ClientInput = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
};

export type ClientValidationErrors = Partial<Record<keyof ClientInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateClient(data: ClientInput): ClientValidationErrors {
  const errors: ClientValidationErrors = {};

  const name = data.full_name.trim();
  if (name.length === 0) {
    errors.full_name = 'Имя обязательно';
  } else if (name.length > 200) {
    errors.full_name = 'Имя слишком длинное (макс. 200 символов)';
  }

  if (data.phone.length > 50) {
    errors.phone = 'Телефон слишком длинный';
  }

  const email = data.email.trim();
  if (email.length > 0 && !EMAIL_RE.test(email)) {
    errors.email = 'Некорректный email';
  }
  if (email.length > 200) {
    errors.email = 'Email слишком длинный';
  }

  if (data.address.length > 500) {
    errors.address = 'Адрес слишком длинный';
  }

  if (data.note.length > 2000) {
    errors.note = 'Заметка слишком длинная';
  }

  return errors;
}

export function normalizeClientInput(data: ClientInput) {
  const clean = (s: string) => {
    const trimmed = s.trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  return {
    full_name: data.full_name.trim(),
    phone: clean(data.phone),
    email: clean(data.email)?.toLowerCase() ?? null,
    address: clean(data.address),
    note: clean(data.note),
  };
}