// utils/id.js
export function toNumId(id) {
  if (!id) return null
  const n = Number(id)
  if (Number.isNaN(n) || !Number.isFinite(n) || n <= 0) return null
  return Math.trunc(n)
}
