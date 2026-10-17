/**
 * 라이선스 규칙 — license-server/server.cjs 와 같은 동작을 서버리스용으로 옮긴 것.
 * (활성화·갱신·해지·오프라인 코드·관리자 발급)
 */
import {
  ApiError,
  addMonths,
  clip,
  decodeCode,
  encodeCode,
  isExpired,
  loadPrivateKey,
  makeKey,
  normKey,
  parseMonths,
  signPayload,
  todayStr,
  validFp,
} from "./core";
import { getStore, mutate, type KeyRec, type Store } from "./store";

const LEASE_DAYS = Number(process.env.LICENSE_LEASE_DAYS || 7);
const unknownKey = (): never => {
  throw new ApiError(404, "unknown_key", "등록되지 않은 인증키입니다.");
};

type License = { p: string; s: string };

function assertUsable(rec: KeyRec) {
  if (rec.status === "revoked") throw new ApiError(403, "revoked", "해지된 인증키입니다.");
  if (isExpired(rec.expires)) throw new ApiError(403, "expired", `인증키가 ${rec.expires}에 만료되었습니다.`);
}

function buildLicense(key: string, rec: KeyRec, fp: string, mode: "online" | "offline"): License {
  const now = new Date();
  const lease = mode === "online" ? new Date(now.getTime() + LEASE_DAYS * 86400_000).toISOString() : null;
  return signPayload(
    {
      v: 1,
      key,
      issuedTo: rec.issuedTo,
      edition: rec.edition,
      expires: rec.expires,
      termMonths: rec.termMonths || null,
      fp,
      mode,
      issuedAt: now.toISOString(),
      leaseUntil: lease,
    },
    loadPrivateKey(),
  );
}

/** 활성화(새 기기 등록) 또는 이미 등록된 기기의 재발급. */
export async function activate(
  body: { key?: unknown; fp?: unknown; hostname?: unknown },
  mode: "online" | "offline",
  store: Store = getStore(),
): Promise<License> {
  const { fp } = body;
  if (!validFp(fp)) throw new ApiError(400, "bad_fingerprint", "기기 지문 형식이 올바르지 않습니다.");
  const key = normKey(body.key);
  const hostname = clip(body.hostname, 64);
  const rec = await mutate(
    store,
    key,
    (r) => {
      assertUsable(r);
      const now = new Date().toISOString();
      // 개월 수로 발급된 키는 첫 활성화 때부터 기간을 센다(구독처럼).
      if (!r.expires && r.termMonths) {
        r.startedAt = now;
        r.expires = addMonths(todayStr(), r.termMonths);
      }
      const known = r.devices[fp];
      if (known) {
        known.lastSeen = now;
        if (hostname) known.hostname = hostname;
      } else {
        const used = Object.keys(r.devices).length;
        if (used >= r.maxDevices) {
          const names = Object.values(r.devices).map((d) => d.hostname || "(이름 없음)");
          throw new ApiError(
            409,
            "seat_limit",
            `이 인증키는 ${r.maxDevices}대까지 쓸 수 있고 이미 모두 등록되었습니다 (${names.join(", ")}). ` +
              "다른 PC에서 쓰려면 기존 PC 등록을 먼저 해지해야 합니다.",
          );
        }
        r.devices[fp] = { hostname, activatedAt: now, lastSeen: now };
      }
      return r;
    },
    unknownKey,
  );
  return buildLicense(key, rec, fp, mode);
}

export async function renew(body: { key?: unknown; fp?: unknown }, store: Store = getStore()): Promise<License> {
  const { fp } = body;
  if (!validFp(fp)) throw new ApiError(400, "bad_fingerprint", "기기 지문 형식이 올바르지 않습니다.");
  const key = normKey(body.key);
  const rec = await mutate(
    store,
    key,
    (r) => {
      assertUsable(r);
      const dev = r.devices[fp];
      if (!dev) throw new ApiError(403, "not_activated", "이 PC는 이 인증키로 등록되어 있지 않습니다.");
      dev.lastSeen = new Date().toISOString();
      return r;
    },
    unknownKey,
  );
  return buildLicense(key, rec, fp, "online");
}

/** 해지·만료된 키라도 기기 등록은 풀 수 있어야 한다. */
export async function deactivate(body: { key?: unknown; fp?: unknown }, store: Store = getStore()): Promise<void> {
  const key = normKey(body.key);
  const fp = String(body.fp || "");
  await mutate(
    store,
    key,
    (r) => {
      delete r.devices[fp];
    },
    unknownKey,
  );
}

export async function offlineActivate(body: { requestCode?: unknown }, store: Store = getStore()): Promise<string> {
  const req = decodeCode(body.requestCode);
  if (!req || req.v !== 1) throw new ApiError(400, "bad_request_code", "요청 코드가 올바르지 않습니다.");
  const lic = await activate({ key: req.k, fp: req.f, hostname: req.h }, "offline", store);
  return encodeCode(lic);
}

// ------------------------------------------------------------------ 관리자
function view(key: string, rec: KeyRec) {
  return {
    key,
    issuedTo: rec.issuedTo,
    edition: rec.edition,
    expires: rec.expires || "(첫 활성화 때 시작)",
    termMonths: rec.termMonths || null,
    status: rec.status,
    maxDevices: rec.maxDevices,
    note: rec.note || "",
    createdAt: rec.createdAt,
    devices: Object.entries(rec.devices).map(([fp, d]) => ({ fp: fp.slice(0, 16), ...d })),
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function adminCreate(
  body: { issuedTo?: unknown; edition?: unknown; expires?: unknown; months?: unknown; maxDevices?: unknown; note?: unknown },
  store: Store = getStore(),
) {
  let expires: string | null = null;
  let termMonths: number | null = null;
  if (body.months !== undefined && body.months !== null && body.months !== "") {
    termMonths = parseMonths(body.months);
  } else {
    expires = String(body.expires || "");
    if (expires !== "unlimited" && !DATE_RE.test(expires)) {
      throw new ApiError(400, "bad_expires", "months(개월 수) 또는 expires(YYYY-MM-DD·unlimited)를 주세요.");
    }
  }
  const rec: KeyRec = {
    issuedTo: clip(body.issuedTo, 80),
    edition: clip(body.edition || "basic", 20),
    expires,
    termMonths,
    maxDevices: Math.max(1, Math.min(100, Number(body.maxDevices || 1))),
    status: "active",
    note: clip(body.note, 200),
    createdAt: new Date().toISOString(),
    devices: {},
  };
  for (let i = 0; i < 5; i++) {
    const key = makeKey();
    if (await store.create(key, rec)) return view(key, rec);
  }
  throw new ApiError(500, "key_collision", "키를 만들지 못했습니다. 다시 시도하세요.");
}

export async function adminList(store: Store = getStore()) {
  return (await store.list()).map(({ key, rec }) => view(key, rec));
}

export async function adminRevoke(body: { key?: unknown }, store: Store = getStore()) {
  const key = normKey(body.key);
  const rec = await mutate(store, key, (r) => ((r.status = "revoked"), r), unknownKey);
  return view(key, rec);
}

export async function adminExtend(body: { key?: unknown; months?: unknown; expires?: unknown }, store: Store = getStore()) {
  const key = normKey(body.key);
  const hasMonths = body.months !== undefined && body.months !== null && body.months !== "";
  const n = hasMonths ? parseMonths(body.months) : 0;
  const explicit = hasMonths ? "" : String(body.expires || "");
  if (!hasMonths && explicit !== "unlimited" && !DATE_RE.test(explicit)) throw new ApiError(400, "bad_expires");
  const rec = await mutate(
    store,
    key,
    (r) => {
      if (hasMonths) {
        if (!r.expires) {
          r.termMonths = (r.termMonths || 0) + n; // 아직 시작 전이면 기간 자체를 늘린다
        } else if (r.expires === "unlimited") {
          throw new ApiError(400, "unlimited", "무제한 키는 연장할 필요가 없습니다.");
        } else {
          const base = r.expires > todayStr() ? r.expires : todayStr(); // 남은 기간 뒤에, 지났으면 오늘부터
          r.expires = addMonths(base, n);
        }
      } else {
        r.expires = explicit;
      }
      r.status = "active";
      return r;
    },
    unknownKey,
  );
  return view(key, rec);
}

export async function adminRelease(body: { key?: unknown; fp?: unknown }, store: Store = getStore()) {
  const key = normKey(body.key);
  const prefix = String(body.fp || "\u0000");
  const rec = await mutate(
    store,
    key,
    (r) => {
      const hit = Object.keys(r.devices).find((f) => f.startsWith(prefix));
      if (!hit) throw new ApiError(404, "unknown_device", "해당 지문의 기기가 없습니다.");
      delete r.devices[hit];
      return r;
    },
    unknownKey,
  );
  return view(key, rec);
}
