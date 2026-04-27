import { getMe, login, logoutApi, register } from "./api";
import type { AuthResponse, User } from "@/types";

/**
 * Get cached user from localStorage.
 */
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("concertix_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Cache user profile in localStorage.
 */
export function cacheUser(user: User): void {
  localStorage.setItem("concertix_user", JSON.stringify(user));
}

/**
 * Store auth tokens and user profile from backend JWT response.
 */
function persistAuth(auth: AuthResponse): User {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  sessionStorage.setItem("access_token", auth.access_token);
  sessionStorage.setItem("refresh_token", auth.refresh_token);
  cacheUser(auth.user);
  return auth.user;
}

/**
 * Login via backend JWT auth.
 */
export async function loginWithJwt(
  email: string,
  password: string
): Promise<User> {
  const auth = await login(email, password);
  return persistAuth(auth);
}

/**
 * Register via backend JWT auth.
 */
export async function registerWithJwt(
  email: string,
  password: string,
  fullName: string
): Promise<User> {
  const auth = await register(email, password, fullName);
  return persistAuth(auth);
}

/**
 * Resolve current user from backend using access token.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem("access_token");
  if (!token) return null;

  try {
    const user = await getMe();
    cacheUser(user);
    return user;
  } catch {
    clearCache();
    return null;
  }
}

/**
 * Logout from backend and clear local auth state.
 */
export async function logoutJwt(): Promise<void> {
  await logoutApi();
  clearCache();
}

/**
 * Clear local auth cache and tokens.
 */
export function clearCache(): void {
  localStorage.removeItem("concertix_user");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
}
