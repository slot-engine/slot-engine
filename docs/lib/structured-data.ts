import type { InferPageType } from "fumadocs-core/source"
import type * as PageTree from "fumadocs-core/page-tree"
import Logo from "@/assets/slot-engine-icon.png"
import { getPageImage, source } from "@/lib/source"

export const siteUrl = "https://slot-engine.dev"
export const siteName = "Slot Engine"
export const siteDescription =
  "Build slot games with TypeScript. Compatible with Engine (formerly Stake Engine). Highly customizable. Trusted and used by providers on Engine."

const githubOrgUrl = "https://github.com/slot-engine"
const githubRepoUrl = `${githubOrgUrl}/slot-engine`

const ids = {
  organization: `${siteUrl}/#organization`,
  website: `${siteUrl}/#website`,
  software: `${siteUrl}/#software`,
}

const packages = [
  {
    name: "@slot-engine/core",
    docs: "/docs/core",
    description:
      "Library for configuring and simulating slot games. Produces output compatible with Engine.",
  },
  {
    name: "@slot-engine/optimizer",
    docs: "/docs/core/game-tasks/optimization",
    description: "Optimize lookup tables to reach a target RTP.",
  },
  {
    name: "@slot-engine/lgs",
    docs: "/docs/lgs",
    description:
      "Local gaming server. Test your game locally without uploading to Engine.",
  },
  {
    name: "@slot-engine/panel",
    docs: "/docs/panel",
    description:
      "Web GUI for Slot Engine. Run simulations, view statistics and explore game files.",
  },
]

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString()
}

export const siteGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ids.organization,
      name: siteName,
      url: siteUrl,
      logo: absoluteUrl(Logo.src),
      sameAs: [githubOrgUrl],
    },
    {
      "@type": "WebSite",
      "@id": ids.website,
      name: siteName,
      url: siteUrl,
      description: siteDescription,
      inLanguage: "en",
      publisher: { "@id": ids.organization },
    },
  ],
}

export const softwareGraph = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  "@id": ids.software,
  name: siteName,
  description:
    "TypeScript libraries for slot game math and simulation: configure games, simulate spins, optimize RTP and test against a local gaming server. Output is compatible with Engine (formerly Stake Engine).",
  url: siteUrl,
  codeRepository: githubRepoUrl,
  programmingLanguage: "TypeScript",
  runtimePlatform: "Node.js",
  author: { "@id": ids.organization },
  hasPart: packages.map((pkg) => ({
    "@type": "SoftwareSourceCode",
    name: pkg.name,
    description: pkg.description,
    url: absoluteUrl(pkg.docs),
    sameAs: `https://www.npmjs.com/package/${pkg.name}`,
    codeRepository: `${githubRepoUrl}/tree/main/packages/${pkg.name.split("/")[1]}`,
    programmingLanguage: "TypeScript",
    runtimePlatform: "Node.js",
  })),
}

export function docPageGraph(page: InferPageType<typeof source>) {
  const url = absoluteUrl(page.url)

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        headline: page.data.title,
        description: page.data.description,
        url,
        mainEntityOfPage: url,
        image: absoluteUrl(getPageImage(page).url),
        inLanguage: "en",
        isPartOf: { "@id": ids.website },
        author: { "@id": ids.organization },
        publisher: { "@id": ids.organization },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs(page.url).map((crumb, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.url),
        })),
      },
    ],
  }
}

/**
 * Follows the sidebar: home, then each folder, then the page.
 * Folders that are missing from the root meta.json live in `fallback`.
 */
function breadcrumbs(url: string) {
  const { children, fallback } = source.pageTree
  const path = findPath([...children, ...(fallback?.children ?? [])], url)
  const crumbs = [{ name: siteName, url: "/" }]

  for (const node of path ?? []) {
    const crumbUrl = node.type === "folder" ? folderUrl(node) : node.url
    if (typeof node.name !== "string" || !crumbUrl) continue
    if (crumbs.at(-1)?.url === crumbUrl) crumbs.pop()
    crumbs.push({ name: node.name, url: crumbUrl })
  }

  return crumbs
}

function findPath(
  nodes: PageTree.Node[],
  url: string,
): Array<PageTree.Folder | PageTree.Item> | undefined {
  for (const node of nodes) {
    if (node.type === "page" && node.url === url) return [node]
    if (node.type !== "folder") continue
    if (node.index?.url === url) return [node]
    const rest = findPath(node.children, url)
    if (rest) return [node, ...rest]
  }
}

// a package root links to its first page, like its sidebar tab
function folderUrl(folder: PageTree.Folder) {
  if (folder.index) return folder.index.url
  if (folder.root) {
    return folder.children.find((c): c is PageTree.Item => c.type === "page")?.url
  }
}
