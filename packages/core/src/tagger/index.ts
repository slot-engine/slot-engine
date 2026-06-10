export class Tagger {
  tags: TagItem[]
  tagsMap: Map<string, TagItem>
  pendingTags: PendingTag[]

  constructor() {
    this.tags = []
    this.tagsMap = new Map()
    this.pendingTags = []
  }

  /**
   * Intended for internal use only.
   */
  _reset() {
    this.tags = []
    this.tagsMap.clear()
    this.pendingTags = []
  }
}

export interface PendingTag {
  bookId: number
  properties: Record<string, string>
}

export interface TagItem {
  search: Array<{ name: string; value: string }>
  timesTriggered: number
  bookIds: number[]
}
