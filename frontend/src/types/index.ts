// TypeScript interfaces for Concertix

export type UserRole = "customer" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export interface Concert {
  id: string;
  name: string;
  artist: string;
  description: string;
  venue: string;
  date: string;
  time: string;
  price: number;
  quota: number;
  available_tickets: number;
  image_url: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  concert_id: string;
  concert: Concert;
  qr_code: string;
  status: "pending" | "paid" | "used" | "cancelled";
  created_at: string;
}

export type TransactionStatus =
  | "pending"
  | "success"
  | "failed"
  | "expired"
  | "refunded";

export interface Transaction {
  id: string;
  ticket_id: string;
  ticket: Ticket;
  amount: number;
  status: TransactionStatus;
  midtrans_transaction_id: string;
  payment_type: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
