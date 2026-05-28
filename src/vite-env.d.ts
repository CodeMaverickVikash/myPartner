/// <reference types="vite/client" />

interface FileSystemPickerAcceptType {
  description?: string
  accept: Record<string, string[]>
}

interface FileSystemOpenFilePickerOptions {
  types?: FileSystemPickerAcceptType[]
  multiple?: boolean
}

interface FileSystemSaveFilePickerOptions {
  suggestedName?: string
  types?: FileSystemPickerAcceptType[]
}

interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean
}

type FileSystemPermissionMode = 'read' | 'readwrite'

interface FileSystemHandlePermissionDescriptor {
  mode?: FileSystemPermissionMode
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BlobPart): Promise<void>
  close(): Promise<void>
}

interface FileSystemFileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<File>
  createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
}

interface Window {
  showOpenFilePicker(options?: FileSystemOpenFilePickerOptions): Promise<FileSystemFileHandle[]>
  showSaveFilePicker(options?: FileSystemSaveFilePickerOptions): Promise<FileSystemFileHandle>
}
