/**
 * 라이선스 저장소.
 *
 * - 운영(Vercel): Supabase 테이블 `license_keys` (supabase/license_keys.sql). 서비스 롤 키로만 접근한다.
 * - 개발: 로컬 JSON 파일(LICENSE_STORE=file, 또는 서비스 롤 키가 없는 개발 환경).
 *
 * 서버리스는 요청이 동시에 겹칠 수 있어 "읽고-고치고-쓰기"에 버전 검사를 건다
 * (같은 키로 두 PC가 동시에 활성화해 좌석 수를 넘기는 일을 막는다).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { supabaseAdmin } from "@/lib/supabase";
import { ApiError } from "./core";

export type DeviceRec = { hostname: string; activatedAt: string; lastSeen: string };

export type KeyRec = {
  issuedTo: string;
  edition: string;
  expires: string | null; // null = 첫 활성화 때 시작
  termMonths: number | null;
  maxDevices: number;
  status: "active" | "revoked";
  note: string;
  createdAt: string;
  startedAt?: string;
  devices: Record<string, DeviceRec>;
};

export type Row = { rec: KeyRec; version: number };

export interface Store {
  kind: "supabase" | "file";
  get(key: string): Promise<Row | null>;
  /** 이미 있으면 false */
  create(key: string, rec: KeyRec): Promise<boolean>;
  /** 읽은 뒤 버전이 그대로일 때만 쓴다. 아니면 false */
  update(key: string, rec: KeyRec, version: number): Promise<boolean>;
  list(): Promise<{ key: string; rec: KeyRec }[]>;
}

// ------------------------------------------------------------------ 파일(개발용)
function fileStore(): Store {
  const file = process.env.LICENSE_DEV_DB || path.join(os.tmpdir(), "methodos-license-dev.json");
  type Db = Record<string, Row>;
  const read = (): Db => {
    try {
      return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
      return {};
    }
  };
  const write = (db: Db) => fs.writeFileSync(file, JSON.stringify(db, null, 2));
  return {
    kind: "file",
    async get(key) {
      return read()[key] ?? null;
    },
    async create(key, rec) {
      const db = read();
      if (db[key]) return false;
      db[key] = { rec, version: 1 };
      write(db);
      return true;
    },
    async update(key, rec, version) {
      const db = read();
      if (!db[key] || db[key].version !== version) return false;
      db[key] = { rec, version: version + 1 };
      write(db);
      return true;
    },
    async list() {
      return Object.entries(read()).map(([key, row]) => ({ key, rec: row.rec }));
    },
  };
}

// ------------------------------------------------------------------ Supabase(운영)
function supabaseStore(): Store | null {
  const db = supabaseAdmin();
  if (!db) return null;
  const fail = (what: string, err: { message?: string } | null) => {
    throw new ApiError(503, "store_error", `라이선스 저장소 오류(${what}): ${err?.message ?? "unknown"}`);
  };
  return {
    kind: "supabase",
    async get(key) {
      const { data, error } = await db.from("license_keys").select("data, version").eq("key", key).maybeSingle();
      if (error) fail("get", error);
      return data ? { rec: data.data as KeyRec, version: data.version as number } : null;
    },
    async create(key, rec) {
      const { error } = await db.from("license_keys").insert({ key, data: rec, version: 1 });
      if (!error) return true;
      if (error.code === "23505") return false; // 중복 키
      return fail("create", error) as never;
    },
    async update(key, rec, version) {
      const { data, error } = await db
        .from("license_keys")
        .update({ data: rec, version: version + 1, updated_at: new Date().toISOString() })
        .eq("key", key)
        .eq("version", version)
        .select("key");
      if (error) fail("update", error);
      return !!data && data.length === 1;
    },
    async list() {
      const { data, error } = await db.from("license_keys").select("key, data").order("created_at", { ascending: false }).limit(1000);
      if (error) fail("list", error);
      return (data ?? []).map((r) => ({ key: r.key as string, rec: r.data as KeyRec }));
    },
  };
}

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  const wantFile = (process.env.LICENSE_STORE || "").toLowerCase() === "file";
  if (wantFile && process.env.NODE_ENV === "production" && !process.env.LICENSE_ALLOW_FILE_IN_PROD) {
    throw new ApiError(503, "store_not_configured", "운영 환경에서는 파일 저장소를 쓸 수 없습니다. Supabase 를 설정하세요.");
  }
  const s = wantFile ? fileStore() : supabaseStore() ?? (process.env.NODE_ENV !== "production" ? fileStore() : null);
  if (!s) {
    throw new ApiError(
      503,
      "store_not_configured",
      "라이선스 저장소가 설정되지 않았습니다 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, supabase/license_keys.sql).",
    );
  }
  cached = s;
  return s;
}

/** 키 하나를 읽어 고치고 쓴다. 동시 수정과 부딪히면 다시 읽어 최대 6번 시도한다. */
export async function mutate<T>(
  store: Store,
  key: string,
  fn: (rec: KeyRec) => T,
  onMissing: () => never,
): Promise<T> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const row = await store.get(key);
    if (!row) return onMissing();
    const rec: KeyRec = structuredClone(row.rec);
    const out = fn(rec); // ApiError 를 던지면 쓰지 않고 그대로 올라간다
    if (await store.update(key, rec, row.version)) return out;
  }
  throw new ApiError(409, "busy", "동시에 처리 중입니다. 잠시 뒤 다시 시도하세요.");
}
