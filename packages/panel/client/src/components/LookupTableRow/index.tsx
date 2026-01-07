import { Accordion } from "@base-ui/react/accordion"
import type { LookupTable, LookupTableSegmented } from "@slot-engine/core/types"
import { IconMinus, IconMoodPuzzled, IconPlus } from "@tabler/icons-react"
import { useRef, useState } from "react"
import { cn } from "../../lib/cn"
import { useGameContext } from "../../context/GameContext"
import { FetchError, query } from "../../lib/queries"
import { useQuery } from "@tanstack/react-query"
import { ErrorDisplay } from "../Error"
import { Loading } from "../Loading"
import JsonView from "@uiw/react-json-view"
import { vscodeTheme } from "@uiw/react-json-view/vscode"
import { useVirtualizer } from "@tanstack/react-virtual"

interface LookupTableRowProps {
  mode: string
  lut: LookupTable[number]
  lutSegmented: LookupTableSegmented[number]
  onOpenChange?: (isOpen: boolean) => void
}

export const LookupTableRow = ({
  lut,
  lutSegmented,
  mode,
  onOpenChange,
}: LookupTableRowProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [id, weight, payout] = lut
  const [, criteria, bsWins, fsWins] = lutSegmented

  const formatter = new Intl.NumberFormat("en-US", { style: "decimal" })
  const formattedPayout = formatter.format(payout / 100)
  const formattedBsWins = formatter.format(bsWins)
  const formattedFsWins = formatter.format(fsWins)

  return (
    <Accordion.Item
      className={cn(
        "mb-2 bg-ui-900 hover:bg-ui-800 border border-ui-700 rounded-lg overflow-clip",
        isOpen && "bg-ui-800",
      )}
      onOpenChange={(v) => {
        setIsOpen(v)
        onOpenChange?.(v)
      }}
    >
      <Accordion.Trigger className="cursor-pointer p-4 w-full flex justify-between items-center gap-8">
        <div className="flex">
          <div className="w-26 text-left">
            <span className="font-bold">ID:</span>
            <span className="ml-2">{id}</span>
          </div>
          <div className="w-64 flex items-center text-left ml-4 pl-4 border-l border-ui-700">
            <span className="font-bold">Criteria:</span>
            <span className="ml-2 truncate">{criteria}</span>
          </div>
          <div className="w-40 text-left ml-4 pl-4 border-l border-ui-700">
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
          <div className="pb-2 mb-4 border-b border-ui-700 flex gap-8 items-center">
            <div className="font-bold">Win Composition:</div>
            <div>Basegame: {formattedBsWins}x</div>
            <div>Freespins: {formattedFsWins}x</div>
          </div>
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
      return await query.gameExploreBook(gameId, mode, bookId)
    },
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  const events = data ? data.book.events : []

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: events.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 320,
    gap: 16,
  })

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        render={(props) => {
          const error = props.error as FetchError
          switch (error.code) {
            case 404:
              return (
                <div className="flex justify-center gap-4">
                  <div>
                    <IconMoodPuzzled size={64} stroke={1} />
                  </div>
                  <div>
                    <h4 className="text-2xl">Book not found</h4>
                    <p>
                      Your book details could not be loaded. The uncompressed book file
                      for this game mode doesn't exist. Panel works with uncompressed
                      books, so make sure those exist by running simulations again.
                    </p>
                  </div>
                </div>
              )
            default:
              return (
                <div className="text-center">
                  <h2>{error.code}</h2>
                  <div>{error.message}</div>
                </div>
              )
          }
        }}
      />
    )
  }

  if (!data) return <Loading isLoading={isLoading} />

  const items = virtualizer.getVirtualItems()

  return (
    <div>
      <div className="text-lg mb-2">Book Events ({events.length})</div>
      <div ref={scrollRef} className="overflow-x-auto h-98">
        <div
          style={{
            width: virtualizer.getTotalSize(),
            height: "100%",
            position: "relative",
          }}
        >
          {items.map((virtualCol) => {
            const event = events[virtualCol.index]
            return (
              <div
                key={virtualCol.key}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  transform: `translateX(${virtualCol.start}px)`,
                }}
              >
                <div className="min-w-80 bg-ui-950 rounded-lg p-4">
                  <div className="flex gap-2 items-center mb-4">
                    <div className="px-1 py-1 text-sm text-center min-w-8 rounded-sm bg-ui-900 border border-ui-700">
                      {event.index}
                    </div>
                    <div className="font-bold truncate">{event.type}</div>
                  </div>
                  <div className="max-h-72 rounded-lg overflow-auto scrollbar-thin">
                    <JsonView
                      className="p-2"
                      value={event.data}
                      style={vscodeTheme}
                      displayDataTypes={false}
                      enableClipboard={false}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
