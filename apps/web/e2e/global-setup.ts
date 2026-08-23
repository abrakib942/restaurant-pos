import { execSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
  const rootDir = path.resolve(process.cwd(), "../..");
  execSync("pnpm db:seed", {
    cwd: rootDir,
    stdio: "inherit",
  });
}
