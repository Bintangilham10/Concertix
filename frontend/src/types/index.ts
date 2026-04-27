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

export interface ConcertPayload {
  name: string;
  artist: string;
  description?: string;
  venue: string;
  date: string;
  time: string;
  price: number;
  quota: number;
  image_url?: string;
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

// ── Admin Dashboard Types ──

export interface ConcertStat {
  id: string;
  name: string;
  artist: string;
  venue: string;
  date: string;
  price: number;
  quota: number;
  available_tickets: number;
  tickets_sold: number;
}

export interface RecentTransaction {
  id: string;
  ticket_id: string;
  amount: number;
  status: string;
  payment_type: string | null;
  created_at: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  concert_name: string | null;
}

export interface AdminStats {
  total_concerts: number;
  total_tickets_sold: number;
  total_revenue: number;
  total_users: number;
  concerts: ConcertStat[];
  recent_transactions: RecentTransaction[];
}

export interface AdminTransactionItem {
  id: string;
  ticket_id: string;
  amount: number;
  status: string;
  payment_type: string | null;
  created_at: string | null;
  updated_at: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  concert_name: string | null;
  concert_artist: string | null;
  ticket_status: string | null;
}

export interface AdminTransactionsResponse {
  transactions: AdminTransactionItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  total_tickets: number;
  total_spent: number;
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
