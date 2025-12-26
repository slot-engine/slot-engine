import "@/styles/styles.css"
import { Outlet, createRootRoute } from "@tanstack/react-router"
import { Navigation } from "../components/Navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WebsocketProvider } from "../context/Websocket"

export const Route = createRootRoute({
  component: RootComponent,
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebsocketProvider>
        <div className="root">
          <Navigation />
          <main className="px-4 py-8 max-w-page-width mx-auto w-full border-x border-ui-700 min-h-content-height">
            <Outlet />
          </main>
        </div>
      </WebsocketProvider>
    </QueryClientProvider>
  )
}
