export const PDF_PUBLIC_BASE_URL = "https://pdf.alpha2026.dpdns.org";

export function parsePdfCode(title) {
  const value = String(title || "");
  const tvchh = value.match(/^\[([1-9]\d*)-TVCHH\](?=\s|$)/);
  if (tvchh) return { collection: "tvchh", number: Number(tvchh[1]) };
  const main = value.match(/^\[([1-9]\d*)\](?=\s|$)/);
  if (!main) return null;
  const number = Number(main[1]);
  return number <= 120 ? { collection: "thanhca", number } : null;
}

export function inspectPdfCode(title) {
  const value = String(title || "");
  const valid = parsePdfCode(value);
  if (valid) return { valid };
  const main = value.match(/^\[(\d+)\](?=\s|$)/);
  if (main) return { code: "main-pdf-number-out-of-range", number: Number(main[1]) };
  if (/^\[[^\]]*TVCHH[^\]]*\]/.test(value)) return { code: "invalid-tvchh-pdf-code" };
  return { valid: null };
}

export function pdfUrlFromCode(code) {
  if (!code || !Number.isInteger(code.number) || code.number < 1) return null;
  const path = code.collection === "thanhca"
    ? (code.number <= 120 ? `thanhca/${code.number}.pdf` : null)
    : (code.collection === "tvchh" ? `tvchh/${code.number}.pdf` : null);
  return path ? `${PDF_PUBLIC_BASE_URL}/${path}` : null;
}

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}

export function isSecurePdfUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && url.pathname.endsWith(".pdf");
  } catch { return false; }
}

export function resolvePdfUrl(song) {
  const generated = pdfUrlFromCode(parsePdfCode(song?.title));
  if (generated) return generated;
  const fallback = String(song?.sheet || "").trim();
  return isHttpUrl(fallback) ? fallback : null;
}
