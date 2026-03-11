export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Redirect to Supabase OTP login page
export function getLoginUrl(): string {
  return '/login';
}
