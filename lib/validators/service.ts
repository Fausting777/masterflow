import { parsePriceInput } from '@/lib/utils/format';

export type ServiceInput = {
  title: string;
  default_price: string;
  description: string;
};

export type ServiceValidationErrors = Partial<Record<keyof ServiceInput, string>>;

export function validateService(data: ServiceInput): ServiceValidationErrors {
  const errors: ServiceValidationErrors = {};

  const title = data.title.trim();
  if (title.length === 0) {
    errors.title = 'Name ist erforderlich';
  } else if (title.length > 200) {
    errors.title = 'Name ist zu lang';
  }

  if (data.default_price.trim() !== '') {
    const price = parsePriceInput(data.default_price);
    if (price === null) {
      errors.default_price = 'Ungueltiger Preis';
    }
  }

  if (data.description.length > 2000) {
    errors.description = 'Beschreibung ist zu lang';
  }

  return errors;
}

export function normalizeServiceInput(data: ServiceInput) {
  const desc = data.description.trim();
  return {
    title: data.title.trim(),
    default_price: parsePriceInput(data.default_price),
    description: desc.length === 0 ? null : desc,
  };
}
