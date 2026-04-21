export type RegisterInput = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type RegisterValidationErrors = Partial<Record<keyof RegisterInput, string>>;

export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordChangeValidationErrors = Partial<
  Record<keyof PasswordChangeInput, string>
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LETTER_RE = /[A-Za-zА-Яа-яЁё]/;

export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 72,
};

export function getPasswordPolicyErrors(password: string) {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Минимум ${PASSWORD_POLICY.minLength} символов`);
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Максимум ${PASSWORD_POLICY.maxLength} символа`);
  }
  if (!LETTER_RE.test(password)) {
    errors.push('Добавьте хотя бы одну букву');
  }

  return errors;
}

export function validateRegister(data: RegisterInput): RegisterValidationErrors {
  const errors: RegisterValidationErrors = {};
  const email = data.email.trim();

  if (!email) {
    errors.email = 'Укажите email';
  } else if (!EMAIL_RE.test(email)) {
    errors.email = 'Некорректный email';
  } else if (email.length > 200) {
    errors.email = 'Email слишком длинный';
  }

  const passwordErrors = getPasswordPolicyErrors(data.password);
  if (passwordErrors.length > 0) {
    errors.password = passwordErrors[0];
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Повторите пароль';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Пароли не совпадают';
  }

  return errors;
}

export function normalizeRegisterInput(data: RegisterInput) {
  return {
    email: data.email.trim().toLowerCase(),
    password: data.password,
  };
}

export function validatePasswordChange(
  data: PasswordChangeInput
): PasswordChangeValidationErrors {
  const errors: PasswordChangeValidationErrors = {};

  if (!data.currentPassword) {
    errors.currentPassword = 'Укажите текущий пароль';
  }

  if (!data.newPassword) {
    errors.newPassword = 'Укажите новый пароль';
  } else {
    const passwordErrors = getPasswordPolicyErrors(data.newPassword);
    if (passwordErrors.length > 0) {
      errors.newPassword = passwordErrors[0];
    }
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Повторите пароль';
  } else if (data.newPassword !== data.confirmPassword) {
    errors.confirmPassword = 'Пароли не совпадают';
  }

  if (
    data.currentPassword &&
    data.newPassword &&
    data.currentPassword === data.newPassword
  ) {
    errors.newPassword = 'Новый пароль должен отличаться от текущего';
  }

  return errors;
}
