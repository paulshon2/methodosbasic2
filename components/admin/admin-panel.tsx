"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Device = { fp: string; hostname: string; activatedAt: string; lastSeen: string };
type KeyRow = {
  key: string;
  issuedTo: string;
  edition: string;
  expires: string;
  termMonths: number | null;
  status: "active" | "revoked";
  maxDevices: number;
  note: string;
  createdAt: string;
  devices: Device[];
};

// 1~11개월 + 1년(=12개월) + 2년 + 3년
const TERMS: { months: number; label: string }[] = [
  ...Array.from({ length: 11 }, (_, i) => ({ months: i + 1, label: `${i + 1}개월` })),
  { months: 12, label: "1년" },
  { months: 24, label: "2년" },
  { months: 36, label: "3년" },
];

const termLabel = (m: number | null) => (m == null ? "" : m % 12 === 0 ? `${m / 12}년` : `${m}개월`);

/**
 * 인증키 관리 화면.
 * mode="session": Clerk 로그인 세션으로 인증 (운영). 같은 사이트 화면임을 알리는 x-admin-ui 헤더를 붙인다.
 * mode="token":   입력한 관리자 토큰으로 인증 (개발 미리보기 전용 — 운영 빌드에서는 이 모드로 열리지 않는다).
 */
export function AdminPanel({ mode, who }: { mode: "session" | "token"; who?: string }) {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [created, setCreated] = useState<KeyRow | null>(null);
  const [form, setForm] = useState({ issuedTo: "", months: 1, maxDevices: 1, note: "" });
  const [busy, setBusy] = useState(false);

  const headers = useMemo(() => {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (mode === "session") h["x-admin-ui"] = "1";
    else h["x-admin-token"] = token;
    return h;
  }, [mode, token]);

  const call = useCallback(
    async (method: "GET" | "POST", path: string, body?: unknown) => {
      const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || json.error || `오류 ${res.status}`);
      return json;
    },
    [headers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await call("GET", "/admin/keys");
      setRows(json.keys as KeyRow[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (mode === "session" || token) void load();
  }, [mode, token, load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(ok);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    setNotice(null);
    setCreated(null);
    try {
      const row = (await call("POST", "/admin/keys", {
        issuedTo: form.issuedTo,
        months: form.months,
        maxDevices: form.maxDevices,
        note: form.note,
      })) as KeyRow;
      setCreated(row);
      setForm({ ...form, issuedTo: "", note: "" });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => setNotice("복사했습니다."));

  const shown = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    return !q || r.key.toLowerCase().includes(q) || r.issuedTo.toLowerCase().includes(q) || r.note.toLowerCase().includes(q);
  });

  const inputCls =
    "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none";
  const btn = "rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">인증키 관리</h1>
          <p className="mt-1 text-sm text-ink-2">
            {mode === "session" ? (
              <>
                관리자 <strong className="text-ink">{who}</strong> 로 로그인됨 · 발급·연장·해지가 바로 서버에 반영됩니다.
              </>
            ) : (
              "개발 미리보기 — 관리자 토큰으로 인증합니다."
            )}
          </p>
        </div>
        <button onClick={load} disabled={loading} className={`${btn} border border-brand text-brand hover:bg-brand-wash`}>
          {loading ? "불러오는 중…" : "새로고침"}
        </button>
      </div>

      {mode === "token" && (
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="관리자 토큰"
          aria-label="관리자 토큰"
          className={`${inputCls} mt-4 max-w-md`}
        />
      )}

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg border border-brand/30 bg-brand-wash/60 px-4 py-2 text-sm text-ink">{notice}</p>}

      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-semibold text-ink">새 인증키 발급</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="text-xs font-medium text-ink-2 md:col-span-2">
            받는 사람 / 고객사
            <input className={`${inputCls} mt-1`} value={form.issuedTo} onChange={(e) => setForm({ ...form, issuedTo: e.target.value })} placeholder="예: 고객사A" />
          </label>
          <label className="text-xs font-medium text-ink-2">
            허용 PC 수
            <input type="number" min={1} max={100} className={`${inputCls} mt-1`} value={form.maxDevices} onChange={(e) => setForm({ ...form, maxDevices: Math.max(1, Number(e.target.value) || 1) })} />
          </label>
          <div className="md:col-span-4" role="group" aria-label="기간">
            <p className="text-xs font-medium text-ink-2">
              기간 <span className="text-ink-3">(구매자가 처음 활성화한 날부터 셉니다)</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TERMS.map((t) => (
                <button
                  key={t.months}
                  type="button"
                  aria-pressed={form.months === t.months}
                  onClick={() => setForm({ ...form, months: t.months })}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    form.months === t.months
                      ? "border-brand bg-brand text-white shadow-sm"
                      : "border-line bg-white text-ink-2 hover:border-brand hover:text-brand"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className="text-xs font-medium text-ink-2 md:col-span-4">
            메모
            <input className={`${inputCls} mt-1`} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="주문번호 등 (선택)" />
          </label>
        </div>
        <button
          onClick={create}
          disabled={busy || (mode === "token" && !token)}
          className="mt-4 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {termLabel(form.months)} 인증키 발급
        </button>

        {created && (
          <div className="mt-5 rounded-xl border border-brand/30 bg-brand-wash/60 p-4">
            <p className="text-xs font-semibold text-brand">발급되었습니다 — 구매자에게 전달하세요</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="select-all rounded-lg bg-white px-3 py-2 font-mono text-base tracking-wider text-ink">{created.key}</code>
              <button onClick={() => copy(created.key)} className={`${btn} bg-brand text-white hover:bg-brand-dark`}>키 복사</button>
            </div>
            <p className="mt-2 text-xs text-ink-2">
              {created.issuedTo || "(이름 없음)"} · {termLabel(created.termMonths) || created.expires} · PC {created.maxDevices}대
            </p>
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-ink">발급 내역 <span className="text-sm font-normal text-ink-3">({shown.length}/{rows.length})</span></h2>
          <input className={`${inputCls} max-w-xs`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="키·이름·메모 검색" aria-label="검색" />
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line bg-wash text-xs text-ink-2">
              <tr>
                <th className="px-4 py-3">인증키</th>
                <th className="px-4 py-3">대상</th>
                <th className="px-4 py-3">기간 · 만료</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">사용 PC</th>
                <th className="px-4 py-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-3">{rows.length ? "검색 결과가 없습니다." : "발급된 키가 없습니다."}</td></tr>
              )}
              {shown.map((r) => (
                <tr key={r.key} className="border-b border-line/60 align-top last:border-0">
                  <td className="px-4 py-3">
                    <button onClick={() => copy(r.key)} title="클릭해서 복사" className="font-mono text-xs text-ink hover:text-brand">{r.key}</button>
                    {r.note && <div className="mt-1 text-[11px] text-ink-3">{r.note}</div>}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{r.issuedTo || "—"}</td>
                  <td className="px-4 py-3 text-ink-2">
                    {r.termMonths ? <span className="mr-1 rounded-full bg-wash px-2 py-0.5 text-[11px] text-ink-2">{termLabel(r.termMonths)}</span> : null}
                    <span className="text-xs">{r.expires}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${r.status === "active" ? "bg-brand-wash text-brand" : "bg-red-50 text-red-700"}`}>
                      {r.status === "active" ? "사용 가능" : "해지됨"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-2">
                    {r.devices.length}/{r.maxDevices}
                    {r.devices.map((d) => (
                      <div key={d.fp} className="mt-1 flex items-center gap-2">
                        <span className="text-ink">{d.hostname || "(이름 없음)"}</span>
                        <span className="font-mono text-[10px] text-ink-3">{d.fp.slice(0, 8)}</span>
                        <button
                          disabled={busy}
                          onClick={() => confirm(`${d.hostname || d.fp} 의 등록을 해제할까요? 다른 PC에서 다시 쓸 수 있게 됩니다.`) && act(() => call("POST", "/admin/keys/release", { key: r.key, fp: d.fp }), "PC 등록을 해제했습니다.")}
                          className="text-[11px] text-red-600 hover:underline disabled:opacity-50"
                        >
                          해제
                        </button>
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 3, 12].map((m) => (
                        <button key={m} disabled={busy} onClick={() => act(() => call("POST", "/admin/keys/extend", { key: r.key, months: m }), `${termLabel(m)} 연장했습니다.`)} className={`${btn} border border-brand/40 text-brand hover:bg-brand-wash`}>
                          +{termLabel(m)}
                        </button>
                      ))}
                      {r.status === "active" ? (
                        <button disabled={busy} onClick={() => confirm(`${r.key} 를 해지할까요? 사용 중인 PC는 다음 확인 때 분석이 막힙니다.`) && act(() => call("POST", "/admin/keys/revoke", { key: r.key }), "해지했습니다.")} className={`${btn} border border-red-300 text-red-600 hover:bg-red-50`}>
                          해지
                        </button>
                      ) : (
                        <span className="self-center text-[11px] text-ink-3">연장하면 복구됩니다</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
