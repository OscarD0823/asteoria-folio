export type ReleaseInfo = {
  version: string;
  releaseUrl: string;
  androidUrl: string;
  windowsUrl: string;
  features: string[];
};
export const updateUrl = "https://oscard0823.github.io/prisma-pdf/version.json";
export const releaseBase = "https://github.com/OscarD0823/prisma-pdf/releases/";
export function newerVersion(candidate: string, current: string): boolean {
  if (
    !/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(candidate) ||
    !/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(current)
  )
    return false;
  const a = candidate.split(".").map(Number),
    b = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
export function validateRelease(value: unknown): ReleaseInfo {
  const r = value as ReleaseInfo;
  if (!r || !/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(r.version))
    throw new Error("La información de versión no es válida.");
  const tag = "v" + r.version;
  if (
    r.releaseUrl !== releaseBase + "tag/" + tag ||
    r.androidUrl !==
      releaseBase +
        "download/" +
        tag +
        "/Prisma-PDF-" +
        r.version +
        "-Android.apk" ||
    r.windowsUrl !==
      releaseBase +
        "download/" +
        tag +
        "/Prisma-PDF-" +
        r.version +
        "-Windows-Setup.exe" ||
    !Array.isArray(r.features) ||
    r.features.length > 20 ||
    r.features.some((s) => typeof s !== "string" || s.length > 200)
  )
    throw new Error("Los enlaces de actualización no son válidos.");
  return r;
}
export async function checkRelease(signal?: AbortSignal): Promise<ReleaseInfo> {
  const response = await fetch(updateUrl, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: signal ?? AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "No se pudo comprobar la actualización. Puedes seguir trabajando sin conexión.",
    );
  const text = await response.text();
  if (text.length > 8192)
    throw new Error("La información de versión no es válida.");
  return validateRelease(JSON.parse(text));
}
