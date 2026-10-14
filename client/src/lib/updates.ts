export const APP_VERSION = __APP_VERSION__;

const RELEASES_API = 'https://api.github.com/repos/JohnTa15/MailMan/releases/latest';

export interface UpdateInfo {
  version: string;
  /** Direct download for this device when the release has one, else the release page. */
  downloadUrl: string;
  releaseUrl: string;
  assetSize?: number;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  assets: { name: string; browser_download_url: string; size: number }[];
}

type Platform = 'windows' | 'android' | 'other';

export function currentPlatform(): Platform {
  if (window.Capacitor?.getPlatform?.() === 'android') return 'android';
  if (window.electronAPI?.platform === 'win32') return 'windows';
  return 'other';
}

/** Compares dotted versions numerically: 1 when a > b, -1 when a < b. */
export function compareVersions(a: string, b: string) {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

let pending: Promise<UpdateInfo | null> | null = null;

/**
 * Resolves to the newer release, or null when this build is current. The
 * result is shared for the session to stay well within GitHub's rate limit.
 */
export function checkForUpdate(force = false): Promise<UpdateInfo | null> {
  if (pending && !force) return pending;
  pending = fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
      return res.json() as Promise<GitHubRelease>;
    })
    .then((release) => {
      if (compareVersions(release.tag_name, APP_VERSION) <= 0) return null;
      const ext = { windows: '.exe', android: '.apk', other: null }[currentPlatform()];
      const asset = ext ? release.assets.find((a) => a.name.toLowerCase().endsWith(ext)) : undefined;
      return {
        version: release.tag_name.replace(/^v/, ''),
        downloadUrl: asset?.browser_download_url || release.html_url,
        releaseUrl: release.html_url,
        assetSize: asset?.size,
      };
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

/** Opens a link in the system browser (desktop/mobile) or a new tab (web). */
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
