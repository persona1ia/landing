import { useId, useRef, useState, useEffect } from 'react'

import { formatMoney } from '../model/content'
import type {
  Course,
  MediaProps,
  SiteContacts,
  ContactsProps,
  CourseCardProps,
  EnrollmentProps,
  PublicSiteProps,
  BlockContentProps,
} from '../model/types'

function Media({ alt, imageId, priority = false }: MediaProps) {
  return (
    <img
      alt={alt}
      decoding="async"
      src={`/api/media/${imageId}`}
      loading={priority ? 'eager' : 'lazy'}
      onError={event => {
        event.currentTarget.hidden = true
      }}
    />
  )
}

function Contacts({ contacts, onNavigate, courseTitle }: ContactsProps) {
  const phone = contacts.phone.replace(/[^\d+]/g, '')
  const emailQuery = courseTitle
    ? `?subject=${encodeURIComponent(`Запись на курс «${courseTitle}»`)}`
    : ''
  return (
    <address className="landing-contacts">
      {contacts.email && (
        <a href={`mailto:${encodeURIComponent(contacts.email)}${emailQuery}`}>
          {contacts.email}
        </a>
      )}
      {contacts.phone &&
        (phone ? (
          <a href={`tel:${phone}`}>{contacts.phone}</a>
        ) : (
          <span>{contacts.phone}</span>
        ))}
      {contacts.address && <p className="landing-prose">{contacts.address}</p>}
      {contacts.links.length > 0 && (
        <ul className="landing-links">
          {contacts.links.map((link, index) => (
            <li key={index}>
              <a href={link.url} onClick={onNavigate}>
                {link.label}
                <span aria-hidden="true"> ↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </address>
  )
}

function hasEnrollmentContact(contacts: SiteContacts) {
  return Boolean(
    contacts.email.trim() || contacts.phone.trim() || contacts.links.length,
  )
}

function CourseCard({ course, onEnroll, canEnroll }: CourseCardProps) {
  return (
    <article className="landing-course">
      {course.imageId && (
        <div className="landing-course-image">
          <Media alt={course.title} imageId={course.imageId} />
        </div>
      )}
      <div className="landing-course-body">
        <h3>{course.title}</h3>
        {course.description && (
          <p className="landing-prose">{course.description}</p>
        )}
        <div className="landing-course-bottom">
          <p className="landing-price">
            {formatMoney(course.priceMinor, course.currency)}
          </p>
          {canEnroll ? (
            <button
              type="button"
              className="landing-button"
              onClick={() => onEnroll(course)}
              aria-label={`Записаться на курс «${course.title}»`}
            >
              Записаться<span aria-hidden="true"> ↗</span>
            </button>
          ) : (
            <p className="landing-muted">Запись пока недоступна</p>
          )}
        </div>
      </div>
    </article>
  )
}

function BlockContent({
  block,
  courses,
  primary,
  contacts,
  onEnroll,
}: BlockContentProps) {
  const Heading = primary ? 'h1' : 'h2'
  switch (block.type) {
    case 'hero':
    case 'about':
      return (
        <div
          className={`landing-feature ${block.imageId ? 'landing-feature-with-image' : ''}`}
        >
          <div className="landing-feature-copy">
            {block.title && <Heading>{block.title}</Heading>}
            {block.text && <p className="landing-prose">{block.text}</p>}
            {block.type === 'hero' && block.action && (
              <a href={block.action.url} className="landing-button">
                {block.action.label}
                <span aria-hidden="true"> ↗</span>
              </a>
            )}
          </div>
          {block.imageId && (
            <div className="landing-feature-image">
              <Media
                alt={block.title}
                priority={primary}
                imageId={block.imageId}
              />
            </div>
          )}
        </div>
      )
    case 'text':
      return (
        <div className="landing-reading">
          {block.title && <h2>{block.title}</h2>}
          {block.text && <p className="landing-prose">{block.text}</p>}
        </div>
      )
    case 'courses': {
      const selected = block.courseIds.flatMap(
        id => courses.find(course => course.id === id && course.visible) ?? [],
      )
      return (
        <>
          {block.title && <h2>{block.title}</h2>}
          <div className="landing-course-grid">
            {selected.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onEnroll={onEnroll}
                canEnroll={hasEnrollmentContact(contacts)}
              />
            ))}
          </div>
          {selected.length === 0 && (
            <p className="landing-muted">Курсы скоро появятся.</p>
          )}
        </>
      )
    }
    case 'gallery':
      return (
        <>
          {block.title && <h2>{block.title}</h2>}
          <div className="landing-gallery">
            {block.images.map((item, index) => (
              <figure key={index}>
                <Media alt={item.alt} imageId={item.imageId} />
                {item.alt && <figcaption>{item.alt}</figcaption>}
              </figure>
            ))}
          </div>
        </>
      )
    case 'testimonials':
      return (
        <>
          {block.title && <h2>{block.title}</h2>}
          <div className="landing-testimonials">
            {block.items.map((item, index) => (
              <figure key={index}>
                <blockquote className="landing-prose">{item.text}</blockquote>
                <figcaption>
                  {item.imageId && <Media alt="" imageId={item.imageId} />}
                  <span>{item.author}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )
    case 'faq':
      return (
        <div className="landing-reading">
          {block.title && <h2>{block.title}</h2>}
          <div className="landing-faq">
            {block.items.map((item, index) => (
              <details key={index}>
                <summary>
                  {item.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p className="landing-prose">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )
    case 'contacts':
      return (
        <div className="landing-contact-layout">
          <div>
            {block.title && <h2>{block.title}</h2>}
            {block.text && <p className="landing-prose">{block.text}</p>}
          </div>
          <Contacts contacts={contacts} />
        </div>
      )
  }
}

export function EnrollmentDialog({
  course,
  onClose,
  contacts,
}: EnrollmentProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className="landing-enrollment"
      onClose={() => {
        if (!dialog.current?.open) {
          onClose()
        }
      }}
      onClick={event => {
        if (event.target === event.currentTarget) {
          dialog.current?.close()
        }
      }}
    >
      <div className="landing-enrollment-body">
        <button
          type="button"
          aria-label="Закрыть"
          className="landing-close"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        <h2 id={titleId}>Запись на курс</h2>
        <p className="landing-enrollment-course">{course.title}</p>
        <p className="landing-price">
          {formatMoney(course.priceMinor, course.currency)}
        </p>
        <p>
          Выберите удобный способ связи и уточните запись на курс у эксперта.
        </p>
        <Contacts
          contacts={contacts}
          courseTitle={course.title}
          onNavigate={() => dialog.current?.close()}
        />
      </div>
    </dialog>
  )
}

export function PublicSite({ content }: PublicSiteProps) {
  const mainId = useId()
  const [enrollment, setEnrollment] = useState<Course | null>(null)
  const blocks = content.blocks.filter(block => block.visible)
  const firstHero = blocks.find(
    block => block.type === 'hero' && block.title.trim(),
  )
  const navigation = blocks.filter(
    block => block.type !== 'hero' && block.title.trim(),
  )
  return (
    <div className="landing">
      <a href={`#${mainId}`} className="landing-skip">
        К содержимому
      </a>
      <header className="landing-header">
        <a href="#" className="landing-brand">
          {content.site.title || 'Личное пространство'}
        </a>
        {navigation.length > 0 && (
          <nav aria-label="Разделы страницы">
            {navigation.map(block => (
              <a key={block.id} href={`#${block.id}`}>
                {block.title}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main id={mainId} tabIndex={-1} className="home-page">
        {!firstHero && (
          <div className="landing-intro">
            <h1>{content.site.title || 'Личное пространство'}</h1>
            {content.site.description && (
              <p className="landing-prose">{content.site.description}</p>
            )}
          </div>
        )}
        {blocks.length === 0 && (
          <section className="landing-empty">
            <h2>Страница скоро появится</h2>
            <p>Здесь будут информация об эксперте и его курсы.</p>
          </section>
        )}
        {blocks.map(block => (
          <section
            id={block.id}
            key={block.id}
            className={`landing-section landing-section-${block.type}`}
          >
            <BlockContent
              block={block}
              onEnroll={setEnrollment}
              courses={content.courses}
              primary={block === firstHero}
              contacts={content.site.contacts}
            />
          </section>
        ))}
      </main>
      <footer className="landing-footer">
        <span>{content.site.title}</span>
        <a href="#">
          Наверх <span aria-hidden="true">↑</span>
        </a>
      </footer>
      {enrollment && (
        <EnrollmentDialog
          course={enrollment}
          contacts={content.site.contacts}
          onClose={() => setEnrollment(null)}
        />
      )}
    </div>
  )
}
