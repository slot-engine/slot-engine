import { defineConfig, defineDocs } from "fumadocs-mdx/config"

// You can customise Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  dir: "content/docs",
})

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
})
