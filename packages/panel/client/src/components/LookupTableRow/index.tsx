import { Accordion } from "@base-ui/react/accordion"
import type { LookupTable } from "@slot-engine/core"
import { IconMinus, IconPlus } from "@tabler/icons-react"
import { useState } from "react"
import { cn } from "../../lib/cn"

interface LookupTableRowProps {
  lut: LookupTable[number]
}

export const LookupTableRow = ({ lut }: LookupTableRowProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [id, weight, payout] = lut

  return (
    <Accordion.Item
      className={cn(
        "mb-2 bg-ui-900 border border-ui-700 rounded-lg overflow-clip",
        isOpen && "bg-ui-800",
      )}
      onOpenChange={(v) => setIsOpen(v)}
    >
      <Accordion.Trigger className="p-4 w-full flex justify-between items-center gap-8">
        <div className="flex">
          <div className="w-28 text-left">
            <span className="font-bold">ID</span>
            <span className="ml-2">{id}</span>
          </div>
          <div className="w-48 text-left ml-4 pl-4 border-l border-ui-700">
            <span className="font-bold">Payout</span>
            <span className="ml-2">{payout}</span>
          </div>
          <div className="ml-4 pl-4 border-l border-ui-700">
            <span className="font-bold">Weight</span>
            <span className="ml-2">{weight}</span>
          </div>
        </div>
        {isOpen ? <IconMinus /> : <IconPlus />}
      </Accordion.Trigger>
      <Accordion.Panel className="bg-ui-900 border-t border-ui-700 h-(--accordion-panel-height) data-starting-style:h-0 data-ending-style:h-0 duration-200">
        <div className="p-4">hey</div>
      </Accordion.Panel>
    </Accordion.Item>
  )
}
