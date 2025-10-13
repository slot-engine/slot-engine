import { Button } from "@/components/Button"
import Link from "next/link"

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center text-center">
      <h1 className="mb-8 text-5xl font-bold">Slot Engine</h1>
      <div >
        <Link href="/docs/core">
          <Button>Getting Started</Button>
        </Link>
      </div>
    </main>
  )
}
