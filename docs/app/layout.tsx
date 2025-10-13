import "@/styles/styles.css"
import { RootProvider } from "fumadocs-ui/provider/next"
import { Archivo } from "next/font/google"

const archivo = Archivo({
  subsets: ["latin"],
})

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={archivo.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
