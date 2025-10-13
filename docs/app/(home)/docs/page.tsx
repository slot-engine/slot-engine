import Link from "next/link"

export default function Page() {
  return (
    <main className="flex flex-1 flex-col justify-center text-center">
      <h1 className="mb-4 text-2xl font-bold">Welcome to the docs!</h1>
      <p className="text-fd-muted-foreground">
        You can open{" "}
        <Link href="/docs/core" className="text-fd-foreground font-semibold underline">
          /docs/core
        </Link>{" "}
        and see the documentation.
      </p>
    </main>
  )
}
