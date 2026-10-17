"use client";

import { useState } from "react";

export default function OfflineActivationPage() {
  const [request, setRequest] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/offline-activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestCode: request }),
      });
      const json = await res.json();
      setResult(res.ok ? { ok: true, text: json.responseCode } : { ok: false, text: json.message || json.error });
    } catch {
      setResult({ ok: false, text: "서버에 연결하지 못했습니다." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:px-6">
      <h1 className="text-2xl font-bold text-ink">오프라인 활성화</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        인터넷이 안 되는 PC의 Methodos Basic 인증키 창에서 만든 <strong className="text-ink">요청 코드</strong>를 아래에 붙여
        넣으면 <strong className="text-ink">응답 코드</strong>를 드립니다. 응답 코드를 그 PC의 프로그램에 입력하세요.
      </p>
      <textarea
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        rows={5}
        placeholder="요청 코드"
        className="mt-6 w-full rounded-xl border border-line bg-white p-3 font-mono text-xs text-ink focus:border-brand focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={busy || !request.trim()}
        className="mt-3 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? "처리 중…" : "응답 코드 받기"}
      </button>
      {result && (
        <div
          className={`mt-6 break-all rounded-xl border p-4 text-sm ${
            result.ok ? "border-brand/30 bg-brand-wash/60 text-ink" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.ok && <p className="mb-2 text-xs font-semibold text-brand">응답 코드</p>}
          <p className={result.ok ? "select-all font-mono text-xs" : ""}>{result.text}</p>
        </div>
      )}
    </div>
  );
}
