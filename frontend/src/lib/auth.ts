import { supabase } from "./supabase";
import type { User } from "@/types";

/**
 * Login with Supabase Auth.
 */
export async function loginWithSupabase(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Register with Supabase Auth.
 */
export async function registerWithSupabase(
  email: string,
  password: string,
  fullName: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "customer",
      },
    },
  });

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Logout from Supabase Auth.
 */
export async function logoutSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Get current Supabase session user.
 */
export async function getSupabaseUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    full_name: user.user_metadata?.full_name ?? "User",
    role: user.app_metadata?.role ?? user.user_metadata?.role ?? "customer",
    created_at: user.created_at,
  };
}

/**
 * Check if user is authenticated via Supabase.
 */
export async function isAuthenticatedSupabase(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Check if current user is admin.
 */
export async function isAdminSupabase(): Promise<boolean> {
  const user = await getSupabaseUser();
  return user?.role === "admin";
}

/**
 * Get stored auth info (synchronous, for quick checks).
 * Falls back to localStorage cache.
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
 * Save user info to localStorage cache.
 */
export function cacheUser(user: User): void {
  localStorage.setItem("concertix_user", JSON.stringify(user));
}

/**
 * Clear cached user data.
 */
export function clearCache(): void {
  localStorage.removeItem("concertix_user");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}
