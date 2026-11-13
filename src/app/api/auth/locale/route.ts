import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, setLocaleCookie } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

interface LocaleBody {
  locale?: unknown;
}

async function handleLocaleUpdate(request: NextRequest) {
  let body: LocaleBody;
  try {
    body = (await request.json()) as LocaleBody;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (body.locale !== "en" && body.locale !== "ta") {
    return NextResponse.json(
      { error: "Locale must be 'en' or 'ta'." },
      { status: 400 }
    );
  }

  const locale: Locale = body.locale;
  const current = await getCurrentUser();

  if (current) {
    await prisma.user.update({
      where: { id: current.user.id },
      data: { preferredLocale: locale },
    });
  }

  const response = NextResponse.json(
    { locale, persistedToUser: Boolean(current) },
    { status: 200 }
  );
  setLocaleCookie(response, locale);
  return response;
}

export async function PATCH(request: NextRequest) {
  return handleLocaleUpdate(request);
}

export async function POST(request: NextRequest) {
  return handleLocaleUpdate(request);
}

