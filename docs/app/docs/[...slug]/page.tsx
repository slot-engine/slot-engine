import { getPageImage, source } from "@/lib/source"
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/page"
import { notFound } from "next/navigation"
import { getMDXComponents } from "@/mdx-components"
import type { Metadata } from "next"
import { createRelativeLink } from "fumadocs-ui/mdx"

export default async function Page(props: PageProps<"/docs/[...slug]">) {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  const MDX = page.data.body

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{ style: "clerk" }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      <div className="mt-8 py-6 border-y">
        <p className="text-sm text-fd-muted-foreground">
          Use of AI on this page: All texts were initially written by hand and were later
          revised by AI for improved flow. All AI generated revisions were carefully
          reviewed and edited as needed.
        </p>
      </div>
    </DocsPage>
  )
}

export async function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(
  props: PageProps<"/docs/[...slug]">,
): Promise<Metadata> {
  const params = await props.params
  const page = source.getPage(params.slug)
  if (!page) notFound()

  return {
    title: page.data.title + " | Slot Engine",
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  }
}
