import "@/styles/styles.css"
import { RootProvider } from "fumadocs-ui/provider/next"
import { Banner } from "fumadocs-ui/components/banner"
import { Archivo } from "next/font/google"

const archivo = Archivo({
  subsets: ["latin"],
})

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
          Public Alpha! Features are missing and there may be bugs. Feel free to
          experiment and help shape the library.
        </Banner>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
