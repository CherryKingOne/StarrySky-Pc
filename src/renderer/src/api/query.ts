/** 把参数对象拼成 query string，自动跳过 undefined / null / 空字符串 */
export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/** 数组参数按 Spring 的 `ids=1&ids=2` 形式追加 */
export function buildArrayQuery(key: string, values: string[]): string {
  const search = new URLSearchParams()
  for (const value of values) search.append(key, value)
  const text = search.toString()
  return text ? `?${text}` : ''
}
