// types/database.ts
// Types for the Supabase schema. Update when the schema changes.

export type OrderStatus = 'new' | 'in_progress' | 'completed' | 'canceled';
export type PhotoType = 'before' | 'after';
export type PaymentMethod = 'cash' | 'transfer' | 'ec_card' | 'paypal';
export type PaymentProvider = 'sumup';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
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
  business_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  title: string;
  default_price: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  correction_of_order_id: string | null;
  correction_reason: string | null;
  client_id: string;
  service_id: string | null;
  custom_service_title: string | null;
  custom_price: number | null;
  description: string | null;
  status: OrderStatus;
  order_address: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  signature_file_path: string | null;
  pdf_file_path: string | null;
  pdf_sha256: string | null;
  invoice_number: string | null;
  invoice_issued_at: string | null;
  invoice_locked_at: string | null;
  invoice_version: number;
  invoice_snapshot_json: unknown | null;
  service_date: string | null;
  payment_method: PaymentMethod | null;
  payment_provider: PaymentProvider | null;
  paid_at: string | null;
  sumup_transaction_id: string | null;
  sumup_receipt_no: string | null;
  invoice_sent_at: string | null;
  invoice_sent_to: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderPhoto {
  id: string;
  order_id: string;
  user_id: string;
  photo_type: PhotoType;
  file_path: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  order_id: string;
  user_id: string;
  action_type: string;
  action_text: string | null;
  created_at: string;
}

export interface SumupConnection {
  id: string;
  user_id: string;
  merchant_code: string;
  access_token_encrypted: string;
  access_token_hint: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SumupTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  sumup_transaction_id: string | null;
  transaction_code: string | null;
  receipt_no: string | null;
  amount: number;
  currency: string;
  status: string | null;
  payment_type: string | null;
  entry_mode: string | null;
  paid_at: string | null;
  raw_json: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface AuditTrailEntry {
  id: string;
  table_name: string;
  record_id: string;
  user_id: string | null;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_fields: string[];
  old_data: unknown | null;
  new_data: unknown | null;
  created_at: string;
}

export interface OrderWithClient extends Omit<Order, never> {
  client_name: string;
  client_phone: string | null;
}

export type ExpenseCategory =
  | 'material'
  | 'fahrtkosten'
  | 'werkzeuge'
  | 'telefon_internet'
  | 'versicherung'
  | 'buero'
  | 'weiterbildung'
  | 'sonstiges';

export interface Expense {
  id: string;
  user_id: string;
  order_id: string | null;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  vendor: string | null;
  expense_date: string;
  receipt_file_path: string | null;
  receipt_sha256: string | null;
  tax_deductible: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
