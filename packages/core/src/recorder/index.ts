export class Recorder {
  records: RecordItem[]
  pendingRecords: PendingRecord[]

  constructor() {
    this.records = []
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
