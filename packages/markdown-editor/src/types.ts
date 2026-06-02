export interface MarkdownFile {
  id: string
  name: string
  content: string
  uploadedAt: string
  updatedAt?: string
  isSystemFile?: boolean
  filePath?: string
}

export interface Heading {
  id: string
  text: string
}
