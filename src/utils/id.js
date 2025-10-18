export function toNumId(id) {
  const n = Number(id)
  return Number.isNaN(n) ? null : n
}

export function nextId(collection = []) {
  return collection.reduce((m, i) => Math.max(m, Number(i.id || 0)), 0) + 1
}
