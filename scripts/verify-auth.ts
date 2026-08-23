import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import {
  encryptSession,
  decryptSession,
  roleHomePath,
  SESSION_COOKIE,
} from "../src/lib/session";

const base = process.env.VERIFY_BASE_URL ?? "http://localhost:3010";

async function assertRedirect(
  path: string,
  token: string | null,
  expectedLocation: string | null,
) {
  const headers: HeadersInit = {};
  if (token) headers.Cookie = `${SESSION_COOKIE}=${token}`;
  const res = await fetch(`${base}${path}`, {
    method: "HEAD",
    redirect: "manual",
    headers,
  });
  const location = res.headers.get("location");
  if (expectedLocation === null) {
    if (res.status !== 200) {
      throw new Error(`${path}: expected 200, got ${res.status}`);
    }
    return;
  }
  if (res.status !== 307 && res.status !== 308) {
    throw new Error(`${path}: expected redirect, got ${res.status}`);
  }
  if (!location?.includes(expectedLocation)) {
    throw new Error(
      `${path}: expected location containing ${expectedLocation}, got ${location}`,
    );
  }
}

async function main() {
  const demos = [
    { username: "admin", pin: "1111", role: "ADMIN", home: "/admin" },
    { username: "maya", pin: "2222", role: "WAITER", home: "/waiter" },
    { username: "julian", pin: "3333", role: "WAITER", home: "/waiter" },
    { username: "kenji", pin: "4444", role: "KITCHEN", home: "/kitchen" },
  ] as const;

  for (const demo of demos) {
    const user = await prisma.user.findUnique({
      where: { username: demo.username },
    });
    if (!user) throw new Error(`missing user ${demo.username}`);
    const ok = await bcrypt.compare(demo.pin, user.pinHash);
    if (!ok) throw new Error(`bad pin ${demo.username}`);
    if (user.role !== demo.role)
      throw new Error(`role mismatch ${demo.username}`);
    if (roleHomePath(user.role) !== demo.home) {
      throw new Error(`home mismatch ${demo.username}`);
    }
    const token = await encryptSession({
      userId: user.id,
      role: user.role,
      name: user.name,
      username: user.username,
    });
    const session = await decryptSession(token);
    if (!session || session.userId !== user.id) {
      throw new Error(`session fail ${demo.username}`);
    }
    console.log(`OK credentials ${demo.username} -> ${demo.home}`);
  }

  const admin = await prisma.user.findUniqueOrThrow({
    where: { username: "admin" },
  });
  if (await bcrypt.compare("9999", admin.pinHash)) {
    throw new Error("wrong pin should fail");
  }
  console.log("OK wrong pin rejected");

  await assertRedirect("/admin", null, "/login");
  await assertRedirect("/waiter", null, "/login");
  await assertRedirect("/kitchen", null, "/login");
  console.log("OK unauthenticated staff routes redirect to login");

  const waiterToken = await encryptSession({
    userId: admin.id,
    role: "WAITER",
    name: "Maya Chen",
    username: "maya",
  });
  await assertRedirect("/admin", waiterToken, "/waiter");
  await assertRedirect("/login", waiterToken, "/waiter");
  console.log("OK waiter role guard");

  const adminToken = await encryptSession({
    userId: admin.id,
    role: "ADMIN",
    name: admin.name,
    username: admin.username,
  });
  const adminPage = await fetch(`${base}/admin`, {
    headers: { Cookie: `${SESSION_COOKIE}=${adminToken}` },
  });
  const adminHtml = await adminPage.text();
  if (
    !adminHtml.includes("Welcome") ||
    !adminHtml.includes("Amelia") ||
    !adminHtml.includes("Coming next")
  ) {
    throw new Error("admin shell content missing");
  }
  console.log("OK admin shell renders");

  const kitchenToken = await encryptSession({
    userId: admin.id,
    role: "KITCHEN",
    name: "Kenji Sato",
    username: "kenji",
  });
  const kitchenPage = await fetch(`${base}/kitchen`, {
    headers: { Cookie: `${SESSION_COOKIE}=${kitchenToken}` },
  });
  const kitchenHtml = await kitchenPage.text();
  if (!kitchenHtml.includes("Pass") || !kitchenHtml.includes("Kanban")) {
    throw new Error("kitchen shell content missing");
  }
  console.log("OK kitchen shell renders");

  console.log("All Phase 1 auth checks passed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
