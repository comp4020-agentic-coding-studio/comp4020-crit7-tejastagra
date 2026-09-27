#!/usr/bin/env node
// Provision an account: the only way (besides the seed) that anyone gets
// one, because there's no sign-up (docs/harness/architecture.md). A real
// deployment would get accounts from ANU's single sign-on instead.
//
//   node scripts/add-user.ts u1234567 "Priya Nair" [student|staff]
//
// Prints a generated password to hand to the person. Uses DATABASE_PATH like
// the app (default ./.data/app.db); run the app once first so the tables
// exist. The hash format must match src/lib/auth/password.ts.
import { randomBytes, scryptSync } from "node:crypto";
import Database from "better-sqlite3";

const [uniIdRaw, name, role = "student"] = process.argv.slice(2);
const uniId = (uniIdRaw ?? "").trim().toLowerCase();
if (!/^u\d{7}$/.test(uniId) || !name || !["student", "staff"].includes(role)) {
  console.error('usage: node scripts/add-user.ts u1234567 "Full Name" [student|staff]');
  process.exit(1);
}

const password = randomBytes(9).toString("base64url");
const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 32).toString("hex")}`;

const db = new Database(process.env.DATABASE_PATH ?? "./.data/app.db");
try {
  db.prepare("INSERT INTO users (uni_id, name, role, password_hash) VALUES (?, ?, ?, ?)").run(uniId, name.trim(), role, hash);
} catch (error) {
  console.error(String(error).includes("UNIQUE") ? `${uniId} already has an account.` : String(error));
  process.exit(1);
}
console.log(`Created ${role} ${uniId} (${name.trim()}). Password: ${password}`);
