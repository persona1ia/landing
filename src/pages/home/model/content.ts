import type { Block, Course, SiteLink, SavedContent } from './types'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): value is string {
  return typeof value === 'string'
}

function id(value: unknown): value is string {
  return text(value) && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value)
}

function imageId(value: unknown): value is string {
  return text(value) && /^[a-f0-9]{64}$/.test(value)
}

function optionalImage(value: unknown): value is string | null {
  return value === null || imageId(value)
}

export function safeUrl(value: unknown): value is string {
  if (!text(value)) {
    return false
  }
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= 32 || code === 127 || character === '\\') {
      return false
    }
  }
  if (value.startsWith('#')) {
    return value.length > 1
  }
  if (value.startsWith('/')) {
    return !value.startsWith('//')
  }
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function link(value: unknown): value is SiteLink {
  return record(value) && text(value.label) && safeUrl(value.url)
}

function course(value: unknown): value is Course {
  return (
    record(value) &&
    id(value.id) &&
    text(value.title) &&
    text(value.description) &&
    text(value.currency) &&
    /^[A-Z]{3}$/.test(value.currency) &&
    typeof value.priceMinor === 'number' &&
    Number.isSafeInteger(value.priceMinor) &&
    value.priceMinor >= 0 &&
    typeof value.visible === 'boolean' &&
    optionalImage(value.imageId)
  )
}

function block(value: unknown): value is Block {
  if (
    !record(value) ||
    !id(value.id) ||
    !text(value.title) ||
    typeof value.visible !== 'boolean'
  ) {
    return false
  }
  switch (value.type) {
    case 'hero':
      return (
        text(value.text) &&
        optionalImage(value.imageId) &&
        (value.action === null || link(value.action))
      )
    case 'about':
      return text(value.text) && optionalImage(value.imageId)
    case 'text':
    case 'contacts':
      return text(value.text)
    case 'courses':
      return Array.isArray(value.courseIds) && value.courseIds.every(id)
    case 'gallery':
      return (
        Array.isArray(value.images) &&
        value.images.every(
          item => record(item) && imageId(item.imageId) && text(item.alt),
        )
      )
    case 'testimonials':
      return (
        Array.isArray(value.items) &&
        value.items.every(
          item =>
            record(item) &&
            text(item.author) &&
            text(item.text) &&
            optionalImage(item.imageId),
        )
      )
    case 'faq':
      return (
        Array.isArray(value.items) &&
        value.items.every(
          item => record(item) && text(item.question) && text(item.answer),
        )
      )
    default:
      return false
  }
}

export function parseContent(value: unknown): SavedContent {
  const invalid = () =>
    new Error('Не удалось прочитать страницу. Попробуйте обновить её позже.')
  if (
    !record(value) ||
    !Number.isSafeInteger(value.revision) ||
    !text(value.savedAt) ||
    !record(value.content)
  ) {
    throw invalid()
  }
  const { content } = value
  if (
    content.schemaVersion !== 1 ||
    !record(content.site) ||
    !text(content.site.title) ||
    !text(content.site.description) ||
    !record(content.site.contacts) ||
    !text(content.site.contacts.email) ||
    !text(content.site.contacts.phone) ||
    !text(content.site.contacts.address) ||
    !Array.isArray(content.site.contacts.links) ||
    !content.site.contacts.links.every(link) ||
    !Array.isArray(content.courses) ||
    !content.courses.every(course) ||
    !Array.isArray(content.blocks) ||
    !content.blocks.every(block)
  ) {
    throw invalid()
  }
  if (
    new Set(content.courses.map(item => item.id)).size !==
      content.courses.length ||
    new Set(content.blocks.map(item => item.id)).size !== content.blocks.length
  ) {
    throw invalid()
  }
  return value as unknown as SavedContent
}

export function formatMoney(priceMinor: number, currency: string): string {
  const formatter = new Intl.NumberFormat('ru-RU', {
    currency,
    style: 'currency',
  })
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return new Intl.NumberFormat('ru-RU', {
    currency,
    style: 'currency',
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(priceMinor / 10 ** digits)
}
