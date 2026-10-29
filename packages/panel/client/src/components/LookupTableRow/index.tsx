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
import { useVirtualizer } from "@tanstack/react-virtual"

// Every variable the viewer reads is set, because an unset one falls back to the library's blue, green or orange.
const JSON_THEME = {
  "--w-rjv-font-family": "monospace",
  "--w-rjv-background-color": "var(--color-ui-950)",
  "--w-rjv-color": "var(--color-ui-100)",
  "--w-rjv-key-string": "var(--color-ui-100)",
  "--w-rjv-key-number": "var(--color-ui-100)",
  "--w-rjv-edit-color": "var(--color-ui-100)",
  "--w-rjv-type-string-color": "var(--color-accent-500)",
  "--w-rjv-quotes-string-color": "var(--color-accent-500)",
  "--w-rjv-type-url-color": "var(--color-accent-500)",
  "--w-rjv-type-int-color": "var(--color-ui-50)",
  "--w-rjv-type-float-color": "var(--color-ui-50)",
  "--w-rjv-type-bigint-color": "var(--color-ui-50)",
  "--w-rjv-type-date-color": "var(--color-ui-50)",
  "--w-rjv-type-boolean-color": "var(--color-ui-50)",
  "--w-rjv-type-null-color": "var(--color-ui-500)",
  "--w-rjv-type-nan-color": "var(--color-ui-500)",
  "--w-rjv-type-undefined-color": "var(--color-ui-500)",
  "--w-rjv-type-set-color": "var(--color-ui-500)",
  "--w-rjv-type-map-color": "var(--color-ui-500)",
  "--w-rjv-quotes-color": "var(--color-ui-500)",
  "--w-rjv-colon-color": "var(--color-ui-500)",
  "--w-rjv-curlybraces-color": "var(--color-ui-500)",
  "--w-rjv-brackets-color": "var(--color-ui-500)",
  "--w-rjv-arrow-color": "var(--color-ui-500)",
  "--w-rjv-info-color": "var(--color-ui-500)",
  "--w-rjv-ellipsis-color": "var(--color-ui-500)",
  "--w-rjv-line-color": "var(--color-ui-700)",
  "--w-rjv-update-color": "var(--color-accent-950)",
  "--w-rjv-copied-color": "var(--color-accent-500)",
  "--w-rjv-copied-success-color": "var(--color-accent-500)",
} as React.CSSProperties

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

  const formatter = new Intl.NumberFormat(undefined, { style: "decimal" })
  const formattedPayout = formatter.format(payout / 100)
  const formattedBsWins = formatter.format(bsWins)
  const formattedFsWins = formatter.format(fsWins)

  return (
    <Accordion.Item
      className={cn(
        "mb-2 rounded-xl bg-ui-900 transition-colors duration-150",
        !isOpen && "hover:bg-ui-800",
      )}
      onOpenChange={(v) => {
        setIsOpen(v)
        onOpenChange?.(v)
      }}
    >
      <Accordion.Trigger className="w-full py-2 pl-4 pr-2 flex justify-between items-center gap-8 rounded-xl text-left cursor-pointer">
        <div className="min-w-0 flex items-baseline gap-8 tabular">
          <div className="w-24 shrink-0 truncate">
            <span className="text-ui-500">ID:</span>
            <span className="ml-2">{id}</span>
          </div>
          <div className="w-60 shrink-0 flex">
            <span className="text-ui-500">Criteria:</span>
            <span className="ml-2 truncate" title={String(criteria)}>
              {criteria}
            </span>
          </div>
          <div className="w-40 shrink-0 truncate">
            <span className="text-ui-500">Payout:</span>
            <span className="ml-2">{formattedPayout}x</span>
          </div>
          <div className="min-w-0 truncate">
            <span className="text-ui-500">Weight:</span>
            <span className="ml-2">{weight}</span>
          </div>
        </div>
        <span className="size-10 shrink-0 flex items-center justify-center rounded-lg text-ui-500">
          {isOpen ? (
            <IconMinus size={20} stroke={1.5} aria-hidden />
          ) : (
            <IconPlus size={20} stroke={1.5} aria-hidden />
          )}
        </span>
      </Accordion.Trigger>
      <Accordion.Panel className="overflow-hidden h-(--accordion-panel-height) transition-[height] duration-200 ease-out data-starting-style:h-0 data-ending-style:h-0">
        <div className="px-2 pb-2">
          <div className="p-4 rounded-xl bg-ui-950">
            <div className="pb-3 mb-4 border-b border-ui-700 flex gap-8 items-center tabular">
              <div className="text-ui-100">Win Composition:</div>
              <div>
                <span className="text-ui-500">Basegame:</span> {formattedBsWins}x
              </div>
              <div>
                <span className="text-ui-500">Freespins:</span> {formattedFsWins}x
              </div>
            </div>
            <BookDetails bookId={id} mode={mode} />
          </div>
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
                <div className="py-4 flex justify-center gap-4">
                  <div className="size-14 shrink-0 flex items-center justify-center rounded-xl bg-ui-800">
                    <IconMoodPuzzled size={32} stroke={1.5} aria-hidden />
                  </div>
                  <div className="max-w-2xl">
                    <h4>Book not found</h4>
                    <p className="mt-1 text-ui-500">
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
                  <h2 className="tabular">{error.code}</h2>
                  <div className="text-ui-500">{error.message}</div>
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
      <h5 className="mb-3">
        Book Events <span className="tabular">({events.length})</span>
      </h5>
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
                <div className="min-w-80 p-4 rounded-xl bg-ui-900">
                  <div className="flex gap-2 items-center mb-3">
                    <div className="h-6 min-w-6 px-1.5 flex items-center justify-center rounded-md bg-ui-800 text-xs text-ui-100 tabular">
                      {event.index}
                    </div>
                    <div className="font-medium truncate" title={event.type}>
                      {event.type}
                    </div>
                  </div>
                  <div className="max-h-72 rounded-lg overflow-auto scrollbar-thin">
                    <JsonView
                      className="p-2"
                      value={event.data}
                      style={JSON_THEME}
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
