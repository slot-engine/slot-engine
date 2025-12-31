import { Accordion } from "@base-ui/react/accordion"
import type { LookupTable, LookupTableSegmented } from "@slot-engine/core"
import { IconMinus, IconPlus } from "@tabler/icons-react"
import { useState } from "react"
import { cn } from "../../lib/cn"
import { useGameContext } from "../../context/GameContext"
import { query } from "../../lib/queries"
import { useQuery } from "@tanstack/react-query"
import { ErrorDisplay } from "../Error"
import { Loading } from "../Loading"
import JsonView from "@uiw/react-json-view"
import { vscodeTheme } from "@uiw/react-json-view/vscode"

interface LookupTableRowProps {
  mode: string
  lut: LookupTable[number]
  lutSegmented: LookupTableSegmented[number]
}

export const LookupTableRow = ({ lut, lutSegmented, mode }: LookupTableRowProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [id, weight, payout] = lut
  const [, criteria, bsWins, fsWins] = lutSegmented

  const formatter = new Intl.NumberFormat("en-US", { style: "decimal" })
  const formattedPayout = formatter.format(payout / 100)

  return (
    <Accordion.Item
      className={cn(
        "mb-2 bg-ui-900 hover:bg-ui-800 border border-ui-700 rounded-lg overflow-clip",
        isOpen && "bg-ui-800",
      )}
      onOpenChange={(v) => setIsOpen(v)}
    >
      <Accordion.Trigger className="cursor-pointer p-4 w-full flex justify-between items-center gap-8">
        <div className="flex">
          <div className="w-28 text-left">
            <span className="font-bold">ID:</span>
            <span className="ml-2">{id}</span>
          </div>
          <div className="w-48 text-left ml-4 pl-4 border-l border-ui-700">
            <span className="font-bold">Criteria:</span>
            <span className="ml-2">{criteria}</span>
          </div>
          <div className="w-48 text-left ml-4 pl-4 border-l border-ui-700">
            <span className="font-bold">Payout:</span>
            <span className="ml-2">{formattedPayout}x</span>
          </div>
          <div className="ml-4 pl-4 border-l border-ui-700">
            <span className="font-bold">Weight:</span>
            <span className="ml-2">{weight}</span>
          </div>
        </div>
        {isOpen ? <IconMinus /> : <IconPlus />}
      </Accordion.Trigger>
      <Accordion.Panel className="bg-ui-900 border-t border-ui-700 h-(--accordion-panel-height) data-starting-style:h-0 data-ending-style:h-0 duration-200">
        <div className="p-4">
          <BookDetails bookId={id} mode={mode} />
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  )
}

const BookDetails = ({ bookId, mode }: { bookId: number; mode: string }) => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "book", gameId, mode, bookId],
    queryFn: async () => {
      return await query.gameExploreBook({ gameId, mode, bookId })
    },
  })

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  return (
    <div>
      <div className="text-lg mb-2">Book Events</div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {data.book.events.map((event) => (
          <div className="min-w-80 bg-ui-950 rounded-lg p-4">
            <div className="flex gap-2 items-center mb-4">
              <div className="px-1 py-1 text-sm text-center min-w-8 rounded-sm bg-ui-900 border border-ui-700">
                {event.index}
              </div>
              <div className="font-bold">{event.type}</div>
            </div>
            <div className="max-h-72 overflow-auto scrollbar-thin">
              <JsonView
                className="p-2 rounded-lg"
                value={event.data}
                style={vscodeTheme}
                displayDataTypes={false}
                enableClipboard={false}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
