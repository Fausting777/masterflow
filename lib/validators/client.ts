// lib/validators/client.ts

export type ClientInput = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  postal_code: string;
  city: string;
  note: string;
};

export type ClientValidationErrors = Partial<Record<keyof ClientInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function validateClient(data: ClientInput): ClientValidationErrors {
  const errors: ClientValidationErrors = {};

  const name = data.full_name.trim();
  const phone = data.phone.trim();
  const email = data.email.trim();
  const address = data.address.trim();
  const postalCode = data.postal_code.trim();
  const city = data.city.trim();
  const note = data.note.trim();

  if (name.length === 0) {
    errors.full_name = 'Name is required';
  } else if (name.length > 200) {
    errors.full_name = 'Name is too long';
  }

  if (phone.length > 50) {
    errors.phone = 'Phone number is too long';
  }

  if (email.length > 0 && !EMAIL_RE.test(email)) {
    errors.email = 'Invalid email address';
  } else if (email.length > 200) {
    errors.email = 'Email is too long';
  }

  if (address.length === 0) {
    errors.address = 'Address is required for invoices';
  } else if (address.length > 500) {
    errors.address = 'Address is too long';
  }

  if (postalCode.length === 0) {
    errors.postal_code = 'Postal code is required for invoices';
  } else if (!/^\d{5}$/.test(postalCode)) {
    errors.postal_code = 'Postal code must be exactly 5 digits';
  }

  if (city.length === 0) {
    errors.city = 'City is required for invoices';
  } else if (city.length > 200) {
    errors.city = 'City is too long';
  }

  if (note.length > 2000) {
    errors.note = 'Note is too long';
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
    postal_code: clean(data.postal_code),
    city: clean(data.city),
    note: clean(data.note),
  };
}
