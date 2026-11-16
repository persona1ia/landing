import test from 'node:test'
import assert from 'node:assert/strict'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { loadContent } from '../src/pages/home/api/client.ts'
import {
  PublicSite,
  EnrollmentDialog,
} from '../src/pages/home/ui/public-site.tsx'
import {
  safeUrl,
  formatMoney,
  parseContent,
} from '../src/pages/home/model/content.ts'

const imageId = 'a'.repeat(64)
const contacts = {
  address: 'Москва',
  email: 'expert@example.com',
  phone: '+7 (999) 123-45-67',
  links: [{ label: 'Написать', url: 'https://example.com/contact' }],
}

function fixture() {
  const base = { title: '', visible: true }
  const course = {
    imageId,
    visible: true,
    currency: 'RUB',
    priceMinor: 99000,
    description: 'Описание курса',
  }
  return {
    revision: 1,
    savedAt: '2026-01-01T00:00:00Z',
    content: {
      schemaVersion: 1,
      site: {
        title: 'Имя эксперта',
        description: 'Описание страницы',
        contacts: structuredClone(contacts),
      },
      courses: [
        { ...course, id: 'one', title: 'Первый курс' },
        { ...course, id: 'two', title: 'Второй курс' },
        {
          ...course,
          visible: false,
          id: 'hidden-course',
          title: 'Скрытый курс',
        },
      ],
      blocks: [
        {
          ...base,
          imageId,
          type: 'hero',
          id: 'welcome',
          title: 'Знакомство',
          text: 'Приветствие',
          action: { url: '#catalog', label: 'Посмотреть курсы' },
        },
        {
          ...base,
          id: 'about',
          type: 'about',
          imageId: null,
          text: 'Биография',
          title: 'Об эксперте',
        },
        {
          ...base,
          id: 'text',
          type: 'text',
          title: 'Подход',
          text: '<script>alert(1)</script>\nВторая строка',
        },
        {
          ...base,
          id: 'catalog',
          title: 'Курсы',
          type: 'courses',
          courseIds: ['two', 'hidden-course', 'one'],
        },
        {
          ...base,
          id: 'gallery',
          type: 'gallery',
          title: 'Галерея',
          images: [{ imageId, alt: 'Фото семинара' }],
        },
        {
          ...base,
          title: 'Отзывы',
          id: 'testimonials',
          type: 'testimonials',
          items: [{ imageId, author: 'Участник', text: 'Отзыв участника' }],
        },
        {
          ...base,
          id: 'faq',
          type: 'faq',
          title: 'Вопросы',
          items: [
            { question: 'Как записаться?', answer: 'Свяжитесь с экспертом.' },
          ],
        },
        {
          ...base,
          id: 'contacts',
          type: 'contacts',
          title: 'Контакты',
          text: 'Будем на связи',
        },
        {
          ...base,
          type: 'text',
          visible: false,
          id: 'hidden-block',
          title: 'Скрытый блок',
          text: 'Не публиковать',
        },
      ],
    },
  }
}

function render(content) {
  return renderToStaticMarkup(createElement(PublicSite, { content }))
}

test('renders all eight block types, media and configured anchors in document order', () => {
  const saved = parseContent(fixture())
  const html = render(saved.content)
  let previous = -1
  for (const block of saved.content.blocks.filter(item => item.visible)) {
    const position = html.indexOf(`id="${block.id}"`)
    assert.ok(position > previous, `${block.type} preserves order`)
    previous = position
  }
  assert.match(html, /href="#catalog"/)
  assert.match(html, new RegExp(`/api/media/${imageId}`))
  assert.match(html, /alt="Фото семинара"/)
  assert.match(html, /<details><summary>Как записаться\?/)
  assert.match(html, /Отзыв участника/)
  assert.match(html, /mailto:expert%40example.com/)
  assert.match(html, /tel:\+79991234567/)
  assert.equal((html.match(/<h1>/g) ?? []).length, 1)
})

test('never renders hidden blocks or courses and preserves selected course order', () => {
  const html = render(fixture().content)
  assert.doesNotMatch(html, /Скрытый блок|Скрытый курс|Не публиковать/)
  assert.ok(html.indexOf('<h3>Второй курс') < html.indexOf('<h3>Первый курс'))
})

test('renders editor text literally without interpreting HTML', () => {
  const html = render(fixture().content)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;\nВторая строка/)
})

test('enrollment uses configured contact channels and an encoded course subject', () => {
  const course = { ...fixture().content.courses[0], title: 'Курс & вопрос? #1' }
  const html = renderToStaticMarkup(
    createElement(EnrollmentDialog, { course, contacts, onClose() {} }),
  )
  assert.ok(
    html.includes(encodeURIComponent(`Запись на курс «${course.title}»`)),
  )
  assert.match(html, /https:\/\/example.com\/contact/)
  assert.match(html, /aria-labelledby=/)
  assert.doesNotMatch(html, /Оплатить|успешно оплачен|api\/checkout/)
})

test('without contact channels enrollment is unavailable, not an inert button', () => {
  const saved = fixture()
  saved.content.site.contacts = {
    email: '',
    phone: '',
    links: [],
    address: 'Москва',
  }
  const html = render(saved.content)
  assert.match(html, /Запись пока недоступна/)
  assert.doesNotMatch(html, /aria-label="Записаться на курс/)
})

test('empty published content has a useful empty state', () => {
  const saved = fixture()
  saved.content.blocks = []
  saved.content.courses = []
  const html = render(saved.content)
  assert.match(html, /Страница скоро появится/)
  assert.match(html, /Имя эксперта/)
  assert.doesNotMatch(html, /Первый курс|Второй курс/)
})

test('rejects unsupported or malformed API payloads before rendering', () => {
  for (const modify of [
    value => {
      value.content.schemaVersion = 2
    },
    value => {
      value.content.blocks[0].action.url = 'javascript:alert(1)'
    },
    value => {
      value.content.blocks[1].imageId = '../private'
    },
    value => {
      value.content.blocks[6].items = [null]
    },
    value => {
      value.content.courses[0].priceMinor = -1
    },
    value => {
      value.content.courses[0].currency = ''
    },
    value => {
      value.content.site.contacts.links = [{}]
    },
    value => {
      value.content.blocks.push(value.content.blocks[0])
    },
  ]) {
    const saved = fixture()
    modify(saved)
    assert.throws(() => parseContent(saved), /Не удалось прочитать/)
  }
  assert.throws(() => parseContent(null))
})

test('accepts only server-supported link schemes', () => {
  for (const url of [
    'https://example.com',
    'http://example.com',
    '/courses',
    '#catalog',
  ]) {
    assert.equal(safeUrl(url), true, url)
  }
  for (const url of [
    '//example.com',
    '/\\example.com',
    'javascript:alert(1)',
    'data:text/html,x',
    '#',
    'https://example.com\n',
  ]) {
    assert.equal(safeUrl(url), false, url)
  }
})

test('prices respect currency minor units, including zero and three decimals', () => {
  assert.match(formatMoney(99000, 'RUB'), /990/)
  assert.match(formatMoney(990, 'JPY'), /990/)
  assert.match(formatMoney(1234, 'KWD'), /1,234/)
  assert.match(formatMoney(0, 'RUB'), /0/)
})

test('client loads the real public endpoint without cached content', async context => {
  const saved = fixture()
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/site')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.headers.Accept, 'application/json')
    assert.ok(options.signal instanceof AbortSignal)
    return Response.json(saved)
  })
  assert.deepEqual(await loadContent(), saved)
})

test('client reports server failure and invalid JSON rather than substituting demo data', async context => {
  const fetchMock = context.mock.method(
    globalThis,
    'fetch',
    async () => new Response('', { status: 503 }),
  )
  await assert.rejects(loadContent(), /временно недоступна/)
  fetchMock.mock.mockImplementation(
    async () => new Response('<html>proxy error</html>'),
  )
  await assert.rejects(loadContent(), SyntaxError)
})

test('client forwards cancellation', async context => {
  const controller = new AbortController()
  controller.abort()
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    options.signal.throwIfAborted()
  })
  await assert.rejects(loadContent(controller.signal), { name: 'AbortError' })
})
