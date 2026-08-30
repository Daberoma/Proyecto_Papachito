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
  fileSize: number;
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
    fileSize: Math.max(0, Number(apk.size || 0)),
  };
}

export type ApkDownloadProgress = {
  receivedBytes: number;
  totalBytes: number;
  progress: number;
};

async function removeTemporaryApk(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // La limpieza es secundaria y no debe ocultar el resultado de la instalación.
  }
}

export async function downloadAndOpenGithubApk(update: GithubApkUpdate, onProgress?: (progress: ApkDownloadProgress) => void) {
  if (Platform.OS !== 'android') throw new Error('La instalación directa está disponible solo en Android.');
  if (!FileSystem.documentDirectory) throw new Error('No se encontró almacenamiento local para descargar el APK.');

  const safeFileName = `papachito-update-${update.version.replace(/[^0-9.]/g, '_')}.apk`;
  const destination = `${FileSystem.documentDirectory}${safeFileName}`;
  // Evita acumular una descarga incompleta o un APK de un intento anterior.
  await removeTemporaryApk(destination);
  const download = FileSystem.createDownloadResumable(update.downloadUrl, destination, {
    headers: { Accept: 'application/vnd.android.package-archive' },
  }, (event) => {
    const totalBytes = event.totalBytesWritten > 0 ? event.totalBytesExpectedToWrite : 0;
    onProgress?.({
      receivedBytes: event.totalBytesWritten,
      totalBytes,
      progress: totalBytes > 0 ? Math.min(event.totalBytesWritten / totalBytes, 1) : 0,
    });
  });
  let result: FileSystem.FileSystemDownloadResult | undefined;
  try {
    result = await download.downloadAsync();
  } catch (error) {
    await removeTemporaryApk(destination);
    throw error;
  }
  if (!result?.uri) {
    await removeTemporaryApk(destination);
    throw new Error('La descarga no terminó correctamente.');
  }
  const info = await FileSystem.getInfoAsync(result.uri);
  const actualSize = Number((info as { size?: number }).size || 0);
  if (!info.exists || !actualSize || (update.fileSize > 0 && actualSize !== update.fileSize)) {
    await removeTemporaryApk(result.uri);
    throw new Error('La descarga del APK quedó incompleta. Vuelve a intentarlo con una conexión estable.');
  }
  try {
    const contentUri = await FileSystem.getContentUriAsync(result.uri);
    // La promesa termina cuando el instalador vuelve, incluso si el usuario cancela.
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1,
    });
  } finally {
    // El instalador ya terminó; borrar el temporal evita llenar el almacenamiento.
    await removeTemporaryApk(result.uri);
  }
}
