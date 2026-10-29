import "@/styles/styles.css"
import { RootProvider } from "fumadocs-ui/provider/next"
import { Banner } from "fumadocs-ui/components/banner"
import { Archivo } from "next/font/google"
import { Metadata } from "next"
import { JsonLd } from "@/components/JsonLd"
import { siteDescription, siteGraph, siteUrl } from "@/lib/structured-data"

const archivo = Archivo({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Slot Engine - Build highly customizable slot games using TypeScript",
  description: siteDescription,
}

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={archivo.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <JsonLd data={siteGraph} />
        <Banner
          id="alpha"
          variant="rainbow"
          rainbowColors={[
            "#53b3db",
            "transparent",
            "#53dbc9",
            "#53b3db",
            "transparent",
            "transparent",
            "#b753db",
          ]}
        >
          Slot Engine is in Beta - Stable, but may contain minor bugs
        </Banner>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
