/**
 * 라이선스 서명·날짜·키 도우미 — license-server/lib/license-core.cjs 와 같은 형식이다.
 *
 * 라이선스 = { p, s }  (p: 내용 JSON 의 base64url, s: 그 p 문자열에 건 Ed25519 서명)
 * 개인키는 서버 환경변수에만 있고, 앱에는 공개키만 들어 있다.
 */
import crypto from "node:crypto";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message || code);
  }
}

/** 허용 기간: 1~12개월, 24개월(2년), 36개월(3년). */
const ALLOWED_MONTHS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 36]);

export function parseMonths(value: unknown): number {
  const n = Number(value);
  if (!ALLOWED_MONTHS.has(n)) {
    throw new ApiError(400, "bad_months", "기간은 1~12개월 또는 24개월(2년)·36개월(3년)만 됩니다.");
  }
  return n;
}

const b64u = (buf: Buffer) => buf.toString("base64url");
const fromB64u = (text: string) => Buffer.from(String(text), "base64url");

/** Vercel 환경변수는 한 줄이라 줄바꿈이 `\n` 글자로 들어오기 쉽다 — 둘 다 받는다. */
export function loadPrivateKey(): string {
  const raw = (process.env.LICENSE_PRIVATE_KEY || "").trim();
  if (raw) return raw.includes("BEGIN") ? raw.replace(/\\n/g, "\n") : Buffer.from(raw, "base64").toString("utf-8");
  throw new ApiError(503, "signing_key_missing", "서명 키(LICENSE_PRIVATE_KEY)가 설정되지 않았습니다.");
}

export function signPayload(payload: object, privateKeyPem: string): { p: string; s: string } {
  const p = b64u(Buffer.from(JSON.stringify(payload), "utf-8"));
  const s = b64u(crypto.sign(null, Buffer.from(p, "utf-8"), crypto.createPrivateKey(privateKeyPem)));
  return { p, s };
}

export function encodeCode(obj: unknown): string {
  return b64u(Buffer.from(JSON.stringify(obj), "utf-8"));
}

export function decodeCode(text: unknown): Record<string, unknown> | null {
  try {
    return JSON.parse(fromB64u(String(text).replace(/\s+/g, "")).toString("utf-8"));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ 날짜
// Vercel 은 UTC 로 돈다. 사용자는 한국에 있으므로 "오늘"을 한국 시간(UTC+9)으로 센다.
const TZ_HOURS = Number(process.env.LICENSE_TZ_OFFSET_HOURS ?? 9);
const pad = (n: number) => String(n).padStart(2, "0");

export function todayStr(now: Date = new Date()): string {
  const d = new Date(now.getTime() + TZ_HOURS * 3600_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** YYYY-MM-DD 에 개월 수를 더한다. 말일을 넘기면 그 달 말일로 맞춘다(1/31 + 1개월 = 2/28). */
export function addMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, last))}`;
}

/** expires 가 null 이면 아직 시작 전(첫 활성화 때 기간이 시작된다). */
export function isExpired(expires: string | null): boolean {
  return !!expires && expires !== "unlimited" && todayStr() > expires;
}

// ------------------------------------------------------------------ 키
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O, 1/I 처럼 헷갈리는 글자를 뺀다

export function makeKey(): string {
  const bytes = crypto.randomBytes(16);
  let raw = "";
  for (const b of bytes) raw += ALPHABET[b % ALPHABET.length];
  return `MTDS-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export const normKey = (text: unknown) => String(text || "").toUpperCase().replace(/\s+/g, "");
export const validFp = (fp: unknown): fp is string => typeof fp === "string" && /^[0-9a-f]{64}$/.test(fp);
export const clip = (text: unknown, n: number) => String(text ?? "").slice(0, n);
