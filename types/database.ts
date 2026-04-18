// types/database.ts
// Типы под схему Supabase. Обновляй вручную, если меняешь схему.

export type OrderStatus = 'new' | 'in_progress' | 'completed' | 'canceled';
export type PhotoType = 'before' | 'after';

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
  bank_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;           // ← новое
  address: string | null;
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
  invoice_number: string | null;
  invoice_issued_at: string | null;
  service_date: string | null;
  invoice_sent_at: string | null;    // ← новое
  invoice_sent_to: string | null;    // ← новое
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

// Удобный тип для orders_with_client view
export interface OrderWithClient extends Omit<Order, never> {
  client_name: string;
  client_phone: string | null;
}