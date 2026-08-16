import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const GITHUB_LATEST_RELEASE = 'https://api.github.com/repos/Daberoma/Proyecto_Papachito/releases/latest';
const GITHUB_APK_PREFIX = 'https://github.com/Daberoma/Proyecto_Papachito/releases/download/';

export type GithubApkUpdate = {
  version: string;
  tagName: string;
  name: string;
  notes: string;
  publishedAt?: string;
  downloadUrl: string;
  fileName: string;
};

export const installedVersion = String(Constants.expoConfig?.version || '0.1.0');
export const installedVersionCode = Number((Constants.expoConfig as any)?.android?.versionCode || 1);

function normalizeVersion(value: string) {
  const match = String(value || '').match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  return match ? [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)] : [0, 0, 0];
}

function compareVersions(left: string, right: string) {
  const a = normalizeVersion(left);
  const b = normalizeVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

export async function checkGithubApkUpdate(): Promise<GithubApkUpdate | null> {
  const response = await fetch(GITHUB_LATEST_RELEASE, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub respondió ${response.status}`);
  const release = await response.json();
  if (release?.draft || release?.prerelease) return null;

  const apk = Array.isArray(release.assets)
    ? release.assets.find((asset: any) => String(asset?.name || '').toLowerCase().endsWith('.apk'))
    : null;
  const downloadUrl = String(apk?.browser_download_url || '');
  const tagName = String(release.tag_name || '');
  const version = normalizeVersion(tagName).join('.');
  if (!apk || !downloadUrl.startsWith(GITHUB_APK_PREFIX) || compareVersions(version, installedVersion) <= 0) return null;

  return {
    version,
    tagName,
    name: String(release.name || `Donde Papachito ${version}`),
    notes: String(release.body || 'Nueva versión disponible.'),
    publishedAt: release.published_at ? String(release.published_at) : undefined,
    downloadUrl,
    fileName: String(apk.name),
  };
}

export async function downloadAndOpenGithubApk(update: GithubApkUpdate) {
  if (Platform.OS !== 'android') throw new Error('La instalación directa está disponible solo en Android.');
  if (!FileSystem.documentDirectory) throw new Error('No se encontró almacenamiento local para descargar el APK.');

  const safeFileName = `papachito-update-${update.version.replace(/[^0-9.]/g, '_')}.apk`;
  const destination = `${FileSystem.documentDirectory}${safeFileName}`;
  const result = await FileSystem.downloadAsync(update.downloadUrl, destination, {
    headers: { Accept: 'application/vnd.android.package-archive' },
  });
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: 'application/vnd.android.package-archive',
    flags: 1,
  });
}
