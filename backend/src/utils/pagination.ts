export function parsePositiveInt(
  input: string | undefined,
  fallback: number
): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function parseBoolean(input: string | undefined): boolean | undefined {
  if (input === undefined) return undefined;
  const s = input.trim().toLowerCase();
  if (["true", "1", "yes"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  return undefined;
}
