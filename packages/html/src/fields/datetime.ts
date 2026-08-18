/**
 * Bridge JSON Schema `format: "date-time"` (RFC 3339) and HTML
 * `<input type="datetime-local">` (local wall-clock, no offset).
 *
 * The data channel always carries the wire form; the control only sees local.
 */

/** ISO / RFC 3339 (or already-local) → value for `datetime-local`. */
export function toDatetimeLocalValue(isoOrLocal: string): string {
  if (isoOrLocal.length === 0) return "";

  // Already a datetime-local-shaped value (no offset / Z).
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(isoOrLocal) &&
    !/[zZ]|[+-]\d{2}:\d{2}$/.test(isoOrLocal)
  ) {
    // Prefer minute precision; browsers often drop seconds without step=1.
    return isoOrLocal.length >= 16 ? isoOrLocal.slice(0, 16) : isoOrLocal;
  }

  const date = new Date(isoOrLocal);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * `datetime-local` value → RFC 3339 UTC for the data channel.
 * Empty input stays empty (optional fields / clear).
 */
export function fromDatetimeLocalValue(local: string): string {
  if (local.length === 0) return "";
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return local;
  return date.toISOString();
}
