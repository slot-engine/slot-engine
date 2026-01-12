export class Recorder {
  records: RecordItem[]
  recordsMap: Map<string, RecordItem>
  pendingRecords: PendingRecord[]

  constructor() {
    this.records = []
    this.recordsMap = new Map()
    this.pendingRecords = []
  }

  /**
   * Intended for internal use only.
   */
  _reset() {
    this.records = []
    this.recordsMap.clear()
    this.pendingRecords = []
  }
}

export interface PendingRecord {
  bookId: number
  properties: Record<string, string>
}

export interface RecordItem {
  search: Array<{ name: string; value: string }>
  timesTriggered: number
  bookIds: number[]
}
