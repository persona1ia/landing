import { useState, useEffect } from 'react'

import { PublicSite } from './public-site'
import { loadContent } from '../api/client'
import type { PageState } from '../model/types'

export function HomePage() {
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void loadContent(controller.signal).then(
      saved => {
        if (!controller.signal.aborted) {
          setState({ status: 'ready', content: saved.content })
        }
      },
      error => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message:
              error instanceof Error && error.name === 'Error'
                ? error.message
                : 'Не удалось загрузить страницу. Проверьте подключение и попробуйте ещё раз.',
          })
        }
      },
    )
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    if (state.status !== 'ready') {
      return
    }
    document.title = state.content.site.title || 'Личное пространство'
    const description = document.querySelector('meta[name="description"]')
    description?.setAttribute('content', state.content.site.description)
    try {
      const anchor = decodeURIComponent(window.location.hash.slice(1))
      if (anchor) {
        document.getElementById(anchor)?.scrollIntoView()
      }
    } catch {
      // An invalid URL fragment does not prevent reading the page.
    }
  }, [state])

  if (state.status === 'ready') {
    return <PublicSite content={state.content} />
  }
  return (
    <main className="landing-status">
      {state.status === 'loading' ? (
        <p role="status">Загружаем страницу…</p>
      ) : (
        <div role="alert">
          <h1>Пока не удалось открыть страницу</h1>
          <p>{state.message}</p>
          <button
            type="button"
            className="landing-button"
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt(value => value + 1)
            }}
          >
            Попробовать снова
          </button>
        </div>
      )}
    </main>
  )
}
