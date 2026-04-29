// HOLON-META: {"purpose": "english-teacher-factory", "wiki": "32d6d069-74d6-8164-a6d5-f41c3d26ae9b"}

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Redirect to Supabase OTP login page
export function getLoginUrl(): string {
  return '/login';
}
