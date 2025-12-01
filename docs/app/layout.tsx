import "@/styles/styles.css"
import { RootProvider } from "fumadocs-ui/provider/next"
import { Banner } from "fumadocs-ui/components/banner"
import { Archivo } from "next/font/google"
import { Metadata } from "next"

const archivo = Archivo({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Slot Engine - Build highly customizable slot games using TypeScript",
  description:
    "Build slot games with TypeScript. Compatible with Stake Engine and Stakes Math SDK. Highly customizable.",
}

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={archivo.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
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
          Slot Engine is in Beta - Expect bugs!
        </Banner>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
