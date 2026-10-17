/** 라이선스 API 공통: JSON 읽기(크기 제한), 오류 변환, 관리자 토큰, 간이 요청 제한. */
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { clerkConfigured } from "@/lib/clerk";
import { checkClerkAdmin } from "@/lib/admin/clerk-admin";
import { ApiError } from "./core";

const MAX_BODY = 16 * 1024;

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new ApiError(413, "too_large", "요청이 너무 큽니다.");
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    throw new ApiError(400, "bad_json", "JSON 형식이 올바르지 않습니다.");
  }
}

/** 서버리스라 인스턴스마다 따로 센다 — 완전한 제한이 아니라 단순 남용 억제용이다. */
const hits = new Map<string, number[]>();
export function rateLimit(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "?").split(",")[0].trim();
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (list.length > Number(process.env.LICENSE_RATE_LIMIT_PER_MIN || 30)) {
    throw new ApiError(429, "rate_limited", "요청이 너무 많습니다. 잠시 뒤 다시 시도하세요.");
  }
}

/**
 * 관리자 확인 — 두 길 중 하나면 된다.
 *  1) 발급 도구(CLI)의 헤더 x-admin-token (LICENSE_ADMIN_TOKEN 과 같을 때)
 *  2) 관리 웹페이지: Clerk 로그인 세션이 허용 목록(ADMIN_EMAILS·ADMIN_CLERK_USER_IDS)에 있을 때.
 *     이 경로는 같은 사이트의 화면만 부를 수 있도록 헤더 x-admin-ui 도 요구한다(교차 사이트 요청 차단).
 */
export async function requireAdmin(req: Request): Promise<void> {
  const expected = (process.env.LICENSE_ADMIN_TOKEN || "").trim();
  const header = req.headers.get("x-admin-token");
  if (header && expected) {
    const given = Buffer.from(header);
    const want = Buffer.from(expected);
    if (given.length === want.length && crypto.timingSafeEqual(given, want)) return;
  }
  if (req.headers.get("x-admin-ui") === "1") {
    const check = await checkClerkAdmin();
    if (check.state === "ok") return;
  }
  if (!expected && !clerkConfigured()) {
    throw new ApiError(503, "admin_disabled", "관리자 인증이 설정되지 않았습니다 (LICENSE_ADMIN_TOKEN 또는 Clerk).");
  }
  throw new ApiError(401, "unauthorized", "관리자 인증이 필요합니다.");
}

export async function handle(fn: () => Promise<unknown>): Promise<Response> {
  try {
    const body = await fn();
    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status, headers: { "cache-control": "no-store" } });
    }
    console.error("license api error", err);
    return NextResponse.json({ error: "internal", message: "서버 오류" }, { status: 500 });
  }
}
