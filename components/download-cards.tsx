import Link from "next/link";
import { Download } from "lucide-react";
import {
  MAC_DMG_ARTIFACTS,
  SUBSCRIPTION_PLANS,
  WIN_ARTIFACT,
  WINDOWS_NOTES,
  productDisplayName,
} from "@/lib/product";

function DownloadButton({ artifactId }: { artifactId: string }) {
  return (
    <Link
      href={`/api/download/${artifactId}`}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
    >
      <Download size={16} />
      Download
    </Link>
  );
}

export function DownloadCards() {
  const win = WIN_ARTIFACT;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-10 text-center">
      <div className="w-full rounded-2xl border border-line bg-white px-6 py-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{win.platform}</p>
        <h3 className="mt-2 text-lg font-semibold text-ink">{win.label}</h3>
        <p className="mt-1 text-[11px] text-ink-3">{win.sizeHint}</p>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{win.description}</p>
        <p className="mt-3 break-all font-mono text-[11px] text-ink-3">{win.fileName}</p>
        <div className="mt-6 flex justify-center">
          <DownloadButton artifactId={win.id} />
        </div>
      </div>

      <div className="w-full rounded-2xl border border-line bg-white px-6 py-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">macOS</p>
        <h3 className="mt-2 text-lg font-semibold text-ink">macOS dmg</h3>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">Mac 종류에 맞는 dmg를 선택해 다운로드하세요.</p>
        <div className="mt-8 space-y-8">
          {MAC_DMG_ARTIFACTS.map((a) => (
            <div key={a.id} className="border-t border-line/70 pt-8 first:border-t-0 first:pt-0">
              <p className="text-sm font-semibold text-ink">{a.label}</p>
              <p className="mt-2 break-all font-mono text-[11px] text-ink-3">{a.fileName}</p>
              <div className="mt-4 flex justify-center">
                <DownloadButton artifactId={a.id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DownloadPageContent() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-ink">Download Desktop</h1>
        <p className="mx-auto mt-2 max-w-xl text-ink-2">{productDisplayName()} 배포 파일입니다.</p>
      </div>
      <div className="mt-12">
        <DownloadCards />
      </div>
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-brand/20 bg-brand-wash/60 p-6 text-left">
        <h2 className="font-semibold text-ink">Window 및 Mac의 실행 안내</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-2">
          {WINDOWS_NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-line bg-white p-6 text-left">
        <h2 className="font-semibold text-ink">라이선스 · 구독 기간</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          구매한 인증키로 처음 한 번 이 PC를 활성화합니다. 기간은 발급일이 아니라{" "}
          <strong className="font-semibold text-ink">처음 활성화한 날</strong>부터 계산되며, 아래 기간
          중에서 선택할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <span
              key={plan.months}
              className="rounded-full border border-brand/30 bg-brand-wash/60 px-4 py-1.5 text-sm font-semibold text-brand"
            >
              {plan.label}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-3">
          인증키는 활성화한 PC에만 묶입니다. 인터넷이 없는 환경에서는 요청/응답 코드로 오프라인
          활성화할 수 있습니다. 문의는 아래 연락처로 보내 주세요.
        </p>
      </div>
      <p className="mt-8 text-center text-sm text-ink-3">
        라이선스·고지 전문은{" "}
        <Link href="/about" className="text-brand hover:underline">
          About Methodos
        </Link>
        를 참고하세요.
      </p>
    </div>
  );
}
