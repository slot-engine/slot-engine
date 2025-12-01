import { Button } from "@/components/Button"
import { CheckIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Logo from "@/assets/slot-engine-icon.png"

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center text-center px-4 md:px-8">
      <div className="">
        <div className="flex justify-center items-center gap-4 text-3xl font-bold mb-12">
          <Image src={Logo} height={48} width={48} alt="" />
          Slot Engine
        </div>
        <div className="max-w-5xl mx-auto text-balance mb-8 lg:mb-12">
          <h1 className="text-3xl lg:text-5xl xl:text-7xl font-bold mb-8 lg:mb-12">
            Build highly customizable Slot Games with TypeScript
          </h1>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="p-2 rounded-lg bg-fd-secondary border border-fd-border flex justify-center items-center gap-2">
              <CheckIcon />
              Compatible with Stake Engine
            </div>
            <div className="px-3 py-2 rounded-lg bg-fd-secondary border border-fd-border flex justify-center items-center gap-2">
              <CheckIcon />
              AI Ready
            </div>
          </div>
        </div>
        <div>
          <Link href="/docs/core">
            <Button size="lg">Getting Started</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
