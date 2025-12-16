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
      <Outlet />
    </>
  )
}
