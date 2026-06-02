export type NoteColor = 'mint' | 'sky' | 'coral' | 'gold'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'
export type SyncOperation = 'create' | 'update' | 'delete'

export interface LocalNote {
  localId: string
  serverId?: string
  ownerEmail: string
  title: string
  body: string
  color: NoteColor
  pinned: boolean
  createdAt: string
  updatedAt: string
  /** Set on soft-delete; note hidden in UI until server delete succeeds */
  deletedAt?: string
  syncStatus: SyncStatus
  operation: SyncOperation
  /** Incremented on each local write; used for conflict detection ordering */
  version: number
  lastSyncedAt?: string
}
