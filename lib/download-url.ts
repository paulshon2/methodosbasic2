import type { ArtifactId } from "@/lib/product";
import { ARTIFACTS } from "@/lib/product";
import { storagePublicUrl } from "@/lib/supabase";

/**
 * Windows 기본 배포처 — GitHub Release (paulshon2/methodosbasic2).
 * 새 판을 낼 때는 RELEASE_TAG 와 아래 파일 이름만 맞추면 된다.
 * (Vercel 환경변수 NEXT_PUBLIC_DOWNLOAD_*_URL 이 있으면 그쪽이 우선한다.)
 */
export const RELEASE_TAG = "v22.19.0-authv1";
const RELEASE_BASE = `https://github.com/paulshon2/methodosbasic2/releases/download/${RELEASE_TAG}`;
export const DEFAULT_WIN_PORTABLE_URL = `${RELEASE_BASE}/MethodosBasic-LT-4-all-v4-R19-Ngraph-AuthV1.exe`;
export const DEFAULT_WIN_SETUP_URL = `${RELEASE_BASE}/MethodosBasic-LT-4-all-v4-R19-Ngraph-AuthV1-Setup.exe`;

export const DEFAULT_MAC_X64_DMG_URL =
  "https://drive.google.com/file/d/1NIadHePoIJqUH5qfb-TGeNSS294P52cJ/view?usp=sharing";

export const DEFAULT_MAC_ARM64_DMG_URL =
  "https://drive.google.com/file/d/1d234UNsSPzgfVAG0oN2dexlQVJyTTTbz/view?usp=sharing";

const STORAGE_PATH: Partial<Record<ArtifactId, string>> = {
  "win-portable": process.env.STORAGE_PATH_WIN_PORTABLE || "MethodosBasic-LT-4-all-v4-R19-Ngraph-AuthV1.exe",
};

export function resolveDownloadUrl(id: ArtifactId): string | null {
  const row = ARTIFACTS.find((a) => a.id === id);
  if (!row) return null;

  const direct = (process.env[row.envKey] || "").trim();
  if (direct) return direct;

  if (id === "win-portable") return DEFAULT_WIN_PORTABLE_URL;
  if (id === "win-setup") return DEFAULT_WIN_SETUP_URL;
  if (id === "mac-x64-dmg") return DEFAULT_MAC_X64_DMG_URL;
  if (id === "mac-arm64-dmg") return DEFAULT_MAC_ARM64_DMG_URL;

  const path = STORAGE_PATH[id];
  if (!path) return null;

  const bucket = (process.env.SUPABASE_RELEASES_BUCKET || "releases").trim();
  return storagePublicUrl(bucket, path);
}

export function isValidArtifactId(value: string): value is ArtifactId {
  return ARTIFACTS.some((a) => a.id === value);
}
