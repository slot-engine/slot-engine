import "@/styles/styles.css"
import { Outlet, createRootRoute } from "@tanstack/react-router"
import { Navigation } from "../components/Navigation"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Navigation />
      <main className="px-4 py-8 max-w-page-width mx-auto w-full border-x border-ui-700 min-h-content-height">
        <Outlet />
      </main>
    </>
  )
}
