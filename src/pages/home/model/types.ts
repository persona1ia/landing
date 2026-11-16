export interface SiteLink {
  url: string
  label: string
}

export interface SiteContacts {
  email: string
  phone: string
  address: string
  links: SiteLink[]
}

export interface Course {
  id: string
  title: string
  currency: string
  visible: boolean
  priceMinor: number
  description: string
  imageId: string | null
}

interface BlockBase {
  id: string
  title: string
  visible: boolean
}

export type Block = BlockBase &
  (
    | {
        type: 'hero'
        text: string
        imageId: string | null
        action: SiteLink | null
      }
    | { text: string; type: 'about'; imageId: string | null }
    | { type: 'text'; text: string }
    | { type: 'courses'; courseIds: string[] }
    | { type: 'gallery'; images: { alt: string; imageId: string }[] }
    | {
        type: 'testimonials'
        items: { text: string; author: string; imageId: string | null }[]
      }
    | { type: 'faq'; items: { answer: string; question: string }[] }
    | { text: string; type: 'contacts' }
  )

export interface SiteContent {
  blocks: Block[]
  schemaVersion: 1
  courses: Course[]
  site: { title: string; description: string; contacts: SiteContacts }
}

export interface SavedContent {
  savedAt: string
  revision: number
  content: SiteContent
}

export type PageState =
  | { status: 'loading' }
  | { status: 'ready'; content: SiteContent }
  | { status: 'error'; message: string }

export interface PublicSiteProps {
  content: SiteContent
}

export interface MediaProps {
  alt: string
  imageId: string
  priority?: boolean
}

export interface ContactsProps {
  courseTitle?: string
  contacts: SiteContacts
  onNavigate?: () => void
}

export interface CourseCardProps {
  course: Course
  canEnroll: boolean
  onEnroll: (course: Course) => void
}

export interface BlockContentProps {
  block: Block
  primary: boolean
  courses: Course[]
  contacts: SiteContacts
  onEnroll: (course: Course) => void
}

export interface EnrollmentProps {
  course: Course
  onClose: () => void
  contacts: SiteContacts
}
