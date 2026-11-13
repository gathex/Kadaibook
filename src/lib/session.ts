export const SESSION_COOKIE = "kadaibook_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  shopId: string;
  role: string;
  exp: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET environment variable must be set in production.");
  }
  return "kadaibook-local-dev-secret-change-in-production";
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64Url: string): Uint8Array | null {
  try {
    const padded = base64Url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((base64Url.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function getHmacKey(usage: KeyUsage): Promise<CryptoKey> {
  const secretBytes = textEncoder.encode(getSessionSecret());
  return crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

export async function signSessionToken(
  payload: Omit<SessionPayload, "exp">,
  maxAgeSeconds = SESSION_MAX_AGE
): Promise<string> {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const encodedPayload = bytesToBase64Url(textEncoder.encode(JSON.stringify(fullPayload)));
  const key = await getHmacKey("sign");
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(encodedPayload)
  );
  const encodedSig = bytesToBase64Url(new Uint8Array(signatureBuffer));
  return `${encodedPayload}.${encodedSig}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;

  const dotIndex = token.indexOf(".");
  if (dotIndex <= 0 || dotIndex === token.length - 1) {
    return null;
  }

  const encodedPayload = token.slice(0, dotIndex);
  const encodedSig = token.slice(dotIndex + 1);

  const signatureBytes = base64UrlToBytes(encodedSig);
  const payloadBytes = base64UrlToBytes(encodedPayload);
  if (!signatureBytes || !payloadBytes) {
    return null;
  }

  try {
    const key = await getHmacKey("verify");
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer as ArrayBuffer,
      textEncoder.encode(encodedPayload)
    );
    if (!valid) {
      return null;
    }

    const parsed = JSON.parse(textDecoder.decode(payloadBytes)) as Partial<SessionPayload>;
    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId ||
      typeof parsed.shopId !== "string" ||
      !parsed.shopId ||
      typeof parsed.role !== "string" ||
      !parsed.role ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    if (parsed.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: parsed.userId,
      shopId: parsed.shopId,
      role: parsed.role,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

