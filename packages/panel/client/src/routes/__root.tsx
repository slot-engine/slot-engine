import "@/styles/styles.css"
import { Outlet, createRootRoute } from "@tanstack/react-router"
import { Navigation } from "@/components/Navigation"
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
        <div className="root grid grid-cols-[16rem_auto] min-h-screen">
          <Navigation />
          <main>
            <Outlet />
          </main>
        </div>
      </WebsocketProvider>
    </QueryClientProvider>
  )
}
