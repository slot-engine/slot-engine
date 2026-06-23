import path from "path"

export type PermanentFilePaths = {
  base: string
  books: (mode: string) => string
  booksIndex: (mode: string, worker: number) => string
  booksIndexMeta: (mode: string) => string
  booksChunk: (mode: string, worker: number, chunk: number) => string
  booksCompressed: (mode: string) => string
  booksUncompressed: (mode: string) => string
  lookupTable: (mode: string) => string
  lookupTableIndex: (mode: string) => string
  lookupTableSegmented: (mode: string) => string
  lookupTableSegmentedIndex: (mode: string) => string
  lookupTablePublish: (mode: string) => string
  tags: (mode: string) => string
  tagKeys: (mode: string) => string
  indexJson: string
  publishFiles: string
  simulationSummary: string
  statsPayouts: string
  statsSummary: string
  statsTags: string
  frontendConfig: string
}

export type TemporaryFilePaths = {
  tempBooks: (mode: string, i: number) => string
  tempLookupTable: (mode: string, i: number) => string
  tempLookupTableSegmented: (mode: string, i: number) => string
  tempTags: (mode: string) => string
}

export type FilePaths = PermanentFilePaths & TemporaryFilePaths

export function createPermanentFilePaths(basePath: string): PermanentFilePaths {
  return {
    base: basePath,
    books: (mode: string) => path.join(basePath, `books_${mode}.jsonl`),
    booksIndexMeta: (mode: string) =>
      path.join(basePath, `books_${mode}.index.meta.json`),
    booksIndex: (mode: string, worker: number) =>
      path.join(basePath, "books_chunks", `books_${mode}_${worker}.index.txt`),
    booksChunk: (mode: string, worker: number, chunk: number) =>
      path.join(
        basePath,
        "books_chunks",
        `books_${mode}_chunk_${worker}-${chunk}.jsonl.zst`,
      ),
    booksCompressed: (mode: string) =>
      path.join(basePath, "publish_files", `books_${mode}.jsonl.zst`),
    booksUncompressed: (mode: string) => path.join(basePath, `books_${mode}.jsonl`),
    lookupTable: (mode: string) => path.join(basePath, `lookUpTable_${mode}.csv`),
    lookupTableIndex: (mode: string) => path.join(basePath, `lookUpTable_${mode}.index`),
    lookupTableSegmented: (mode: string) =>
      path.join(basePath, `lookUpTableSegmented_${mode}.csv`),
    lookupTableSegmentedIndex: (mode: string) =>
      path.join(basePath, `lookUpTableSegmented_${mode}.index`),
    lookupTablePublish: (mode: string) =>
      path.join(basePath, "publish_files", `lookUpTable_${mode}_0.csv`),
    tags: (mode: string) => path.join(basePath, `tags_${mode}.json`),
    tagKeys: (mode: string) => path.join(basePath, `tag_keys_${mode}.json`),
    indexJson: path.join(basePath, "publish_files", "index.json"),
    publishFiles: path.join(basePath, "publish_files"),
    simulationSummary: path.join(basePath, "simulation_summary.json"),
    statsPayouts: path.join(basePath, "stats_payouts.json"),
    statsSummary: path.join(basePath, "stats_summary.json"),
    statsTags: path.join(basePath, "stats_tags.json"),
    frontendConfig: path.join(basePath, "frontend_config.json"),
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
    tempTags: (mode: string) =>
      path.join(basePath, tempFolder, `temp_tags_${mode}.jsonl`),
  }
}
