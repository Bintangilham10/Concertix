import type {
  AuthResponse,
  User,
  AdminStats,
  AdminTicketScanResult,
  AdminTransactionsResponse,
  AdminUsersResponse,
  BlockchainBlock,
  Concert,
  ConcertPayload,
} from "@/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "https://concertix-production.up.railway.app"
)
  .replace(/^http:\/\/concertix-production\.up\.railway\.app/i, "https://concertix-production.up.railway.app")
  .replace(/\/$/, "");

type ValidationErrorItem = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

function formatFieldName(field: string): string {
  const labels: Record<string, string> = {
    email: "Email",
    full_name: "Nama lengkap",
    password: "Password",
    confirm_password: "Konfirmasi password",
  };
  return labels[field] || field;
}

function cleanErrorMessage(message: string): string {
  return message.replace(/^Value error,\s*/i, "");
}

function formatApiErrorDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return null;

        const validation = item as ValidationErrorItem;
        const message = validation.msg ? cleanErrorMessage(validation.msg) : "";
        const field = validation.loc
          ?.filter((segment) => segment !== "body")
          .map(String)
          .pop();

        if (field && message) return `${formatFieldName(field)}: ${message}`;
        return message || validation.type || null;
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return fallback;
}

/**
 * Base fetch wrapper with auth header injection.
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("access_token")
      : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const detail =
      errorBody && typeof errorBody === "object" && "detail" in errorBody
        ? (errorBody as { detail?: unknown }).detail
        : errorBody;

    throw new Error(formatApiErrorDetail(detail, `HTTP ${response.status}`));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ── Auth API ──

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return fetchApi<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string,
  full_name: string
): Promise<AuthResponse> {
  return fetchApi<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name }),
  });
}

export async function refreshToken(
  refresh_token: string
): Promise<AuthResponse> {
  return fetchApi<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  });
}

export async function getMe(): Promise<User> {
  return fetchApi<User>("/auth/me");
}

export async function logoutApi(): Promise<void> {
  try {
    await fetchApi<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  } catch {
    // Even if the server rejects (e.g. token already expired), we still
    // clear local state in the calling code.
  }
}

// ── Concerts API ──

export async function getConcerts(page = 1, perPage = 10) {
  return fetchApi(`/concerts/?page=${page}&per_page=${perPage}`);
}

export async function getConcertById(id: string) {
  return fetchApi(`/concerts/${id}`);
}

export async function createConcert(payload: ConcertPayload): Promise<Concert> {
  return fetchApi<Concert>("/concerts/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateConcert(id: string, payload: Partial<ConcertPayload>): Promise<Concert> {
  return fetchApi<Concert>(`/concerts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteConcert(id: string): Promise<void> {
  await fetchApi<void>(`/concerts/${id}`, {
    method: "DELETE",
  });
}

// ── Tickets API ──

export async function orderTicket(concertId: string, quantity: number) {
  return fetchApi("/tickets/order", {
    method: "POST",
    body: JSON.stringify({ concert_id: concertId, quantity }),
  });
}

export async function getMyTickets() {
  return fetchApi("/tickets/my-tickets");
}

export async function cancelTicket(ticketId: string) {
  return fetchApi(`/tickets/${ticketId}/cancel`, {
    method: "POST",
  });
}

// ── Payments API ──

export async function createPayment(ticketId: string) {
  return fetchApi("/payments/create", {
    method: "POST",
    body: JSON.stringify({ ticket_id: ticketId }),
  });
}

// ── Admin API ──

export async function getAdminStats(): Promise<AdminStats> {
  return fetchApi<AdminStats>("/admin/stats");
}

export async function getAdminTransactions(
  page = 1,
  perPage = 20,
  status?: string,
  search?: string
): Promise<AdminTransactionsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  return fetchApi<AdminTransactionsResponse>(`/admin/transactions?${params}`);
}

export async function getAdminUsers(
  page = 1,
  perPage = 20,
  role?: string,
  search?: string
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (role) params.set("role", role);
  if (search) params.set("search", search);
  return fetchApi<AdminUsersResponse>(`/admin/users?${params}`);
}

export async function getAdminTicketScan(ticketId: string): Promise<AdminTicketScanResult> {
  return fetchApi<AdminTicketScanResult>(`/admin/tickets/${ticketId}/scan`);
}

export async function validateTicket(ticketId: string): Promise<BlockchainBlock> {
  return fetchApi<BlockchainBlock>(`/blockchain/ticket/${ticketId}/validate`, {
    method: "POST",
  });
}
