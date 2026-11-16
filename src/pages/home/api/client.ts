import { parseContent } from '../model/content'

export async function loadContent(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15_000)
  const response = await fetch('/api/site', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!response.ok) {
    throw new Error(
      'Страница временно недоступна. Пожалуйста, попробуйте ещё раз.',
    )
  }
  return parseContent(await response.json())
}
