import path from "path"

export type PermanentFilePaths = {
  base: string
  books: (mode: string) => string
  booksIndex: (mode: string) => string
  booksCompressed: (mode: string) => string
  lookupTable: (mode: string) => string
  lookupTableIndex: (mode: string) => string
  lookupTableSegmented: (mode: string) => string
  lookupTableSegmentedIndex: (mode: string) => string
  lookupTablePublish: (mode: string) => string
  forceRecords: (mode: string) => string
  forceKeys: (mode: string) => string
  indexJson: string
  publishFiles: string
  optimizationFiles: string
  simulationSummary: string
  statsPayouts: string
  statsSummary: string
}

export type TemporaryFilePaths = {
  tempBooks: (mode: string, i: number) => string
  tempLookupTable: (mode: string, i: number) => string
  tempLookupTableSegmented: (mode: string, i: number) => string
  tempRecords: (mode: string) => string
}

export type FilePaths = PermanentFilePaths & TemporaryFilePaths

export function createPermanentFilePaths(basePath: string): PermanentFilePaths {
  return {
    base: basePath,
    books: (mode: string) => path.join(basePath, `books_${mode}.jsonl`),
    booksIndex: (mode: string) => path.join(basePath, `books_${mode}.index`),
    booksCompressed: (mode: string) =>
      path.join(basePath, "publish_files", `books_${mode}.jsonl.zst`),
    lookupTable: (mode: string) => path.join(basePath, `lookUpTable_${mode}.csv`),
    lookupTableIndex: (mode: string) => path.join(basePath, `lookUpTable_${mode}.index`),
    lookupTableSegmented: (mode: string) =>
      path.join(basePath, `lookUpTableSegmented_${mode}.csv`),
    lookupTableSegmentedIndex: (mode: string) =>
      path.join(basePath, `lookUpTableSegmented_${mode}.index`),
    lookupTablePublish: (mode: string) =>
      path.join(basePath, "publish_files", `lookUpTable_${mode}_0.csv`),
    forceRecords: (mode: string) => path.join(basePath, `force_record_${mode}.json`),
    forceKeys: (mode: string) => path.join(basePath, `force_keys_${mode}.json`),
    indexJson: path.join(basePath, "publish_files", "index.json"),
    optimizationFiles: path.join(basePath, "optimization_files"),
    publishFiles: path.join(basePath, "publish_files"),
    simulationSummary: path.join(basePath, "simulation_summary.json"),
    statsPayouts: path.join(basePath, "stats_payouts.json"),
    statsSummary: path.join(basePath, "stats_summary.json"),
  }
}

export function createTemporaryFilePaths(
  basePath: string,
  tempFolder: string,
): TemporaryFilePaths {
  return {
    tempBooks: (mode: string, i: number) =>
      path.join(basePath, tempFolder, `temp_books_${mode}_${i}.jsonl`),
    tempLookupTable: (mode: string, i: number) =>
      path.join(basePath, tempFolder, `temp_lookup_${mode}_${i}.csv`),
    tempLookupTableSegmented: (mode: string, i: number) =>
      path.join(basePath, tempFolder, `temp_lookup_segmented_${mode}_${i}.csv`),
    tempRecords: (mode: string) =>
      path.join(basePath, tempFolder, `temp_records_${mode}.jsonl`),
  }
}
