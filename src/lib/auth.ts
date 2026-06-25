import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_session";

export function getSecret() {
  return process.env.ADMIN_PASSWORD || "dev-admin-password";
}

export function signAdminSession(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return false;

  const [value, signature] = raw.split(".");
  if (!value || !signature) return false;

  const expected = signAdminSession(value);
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  const value = "admin";
  cookieStore.set(COOKIE_NAME, `${value}.${signAdminSession(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function isValidAdminPassword(password: string) {
  return password === getSecret();
}

export { COOKIE_NAME };
