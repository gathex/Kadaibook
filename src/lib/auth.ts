import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s\-()]/g, "");
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(phone);
}

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function attachSessionCookie(
  response: NextResponse,
  payload: Omit<SessionPayload, "exp">
): Promise<NextResponse> {
  const token = await signSessionToken(payload);
  response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", getSessionCookieOptions(0));
  return response;
}

export function setLocaleCookie(
  response: NextResponse,
  locale: Locale
): NextResponse {
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export interface AuthenticatedContext {
  user: {
    id: string;
    name: string | null;
    phone: string;
    role: string;
    shopId: string;
    preferredLocale: Locale;
  };
  shop: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  };
}

export async function getCurrentUser(): Promise<AuthenticatedContext | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      shopId: true,
      preferredLocale: true,
      shop: {
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
        },
      },
    },
  });

  if (!user || user.shopId !== session.shopId) {
    return null;
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      shopId: user.shopId,
      preferredLocale: normalizeLocale(user.preferredLocale),
    },
    shop: user.shop,
  };
}

export async function requireAuth(): Promise<AuthenticatedContext> {
  const current = await getCurrentUser();
  if (!current) {
    redirect("/login");
  }
  return current;
}

