// lib/validators/service.ts
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
    errors.title = 'Название обязательно';
  } else if (title.length > 200) {
    errors.title = 'Название слишком длинное';
  }

  if (data.default_price.trim() !== '') {
    const price = parsePriceInput(data.default_price);
    if (price === null) {
      errors.default_price = 'Некорректная цена';
    }
  }

  if (data.description.length > 2000) {
    errors.description = 'Описание слишком длинное';
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