import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@repo/db";

export const SESSION_COOKIE = "brasa_session";
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

export type SessionPayload = {
  userId: string;
  role: Role;
  name: string;
  username: string;
};

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  // A256GCM requires exactly 32 bytes; hash any longer secret down.
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(secret))
    .then((hash) => new Uint8Array(hash));
}

export async function encryptSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const key = await getSecretKey();
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .encrypt(key);
}

export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const key = await getSecretKey();
    const { payload } = await jwtDecrypt(token, key);
    const userId = payload.userId;
    const role = payload.role;
    const name = payload.name;
    const username = payload.username;
    if (
      typeof userId !== "string" ||
      typeof role !== "string" ||
      typeof name !== "string" ||
      typeof username !== "string"
    ) {
      return null;
    }
    return {
      userId,
      role: role as Role,
      name,
      username,
    };
  } catch {
    return null;
  }
}

export function roleHomePath(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "WAITER":
      return "/waiter";
    case "KITCHEN":
      return "/kitchen";
    default:
      return "/login";
  }
}

export async function createSession(payload: SessionPayload) {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
}
