import { cn } from "@/lib/cn"
import { useSortable } from "@dnd-kit/react/sortable"
import { IconDragDrop, IconTrash } from "@tabler/icons-react"
import { useRseData } from "../context/DataContext"

interface SortableSymbolProps extends React.ComponentPropsWithoutRef<"div"> {
  index: number
  reelId: number
  symbolId: string
}

export const SortableSymbol = ({
  id,
  index,
  symbolId,
  reelId,
  className,
  ...props
}: SortableSymbolProps) => {
  const { colorsState, reelsState } = useRseData()
  const [colors] = colorsState
  const [, setReels] = reelsState

  const { ref, isDragging } = useSortable({
    id: id!,
    index,
    type: "symbol",
    accept: "symbol",
    group: reelId,
  })

  function handleDelete() {
    setReels((currentReels) => {
      const reel = currentReels[reelId] || []
      const newReel = [...reel.slice(0, index), ...reel.slice(index + 1)]
      return { ...currentReels, [reelId]: newReel }
    })
  }

  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        "cursor-grab w-full rounded-lg bg-ui-800",
        "data-[dnd-dragging=true]:opacity-90 data-[dnd-dragging=true]:animate-wiggle",
        className,
      )}
    >
      <div className="w-full h-full pl-2 flex items-center gap-1.5">
        <span
          className="w-1 h-5 shrink-0 rounded-full"
          style={{ backgroundColor: colors[symbolId] }}
          aria-hidden
        />
        <span className="min-w-5 text-xs text-ui-500 tabular">{index}</span>
        <span className="shrink-0 font-medium" translate="no">
          {symbolId}
        </span>
        {!isDragging && (
          <span
            className="ml-auto size-10 shrink-0 flex items-center justify-center rounded-lg cursor-pointer text-ui-500 transition-colors duration-150 hover:bg-danger-950 hover:text-danger-500"
            title="Delete Symbol"
            onClick={handleDelete}
          >
            <IconTrash size={20} stroke={1.5} aria-hidden />
          </span>
        )}
      </div>
    </div>
  )
}

interface SymbolDropAreaProps extends React.ComponentPropsWithoutRef<"div"> {
  reelId: number
}

export const SymbolDropArea = ({ reelId }: SymbolDropAreaProps) => {
  const { ref } = useSortable({
    id: `dropzone-${reelId}`,
    index: 0,
    type: "symbol",
    accept: "symbol",
    group: reelId,
  })

  return (
    <div
      ref={ref}
      className="py-8 h-128 flex flex-col justify-center items-center gap-2 text-center text-ui-500 rounded-lg border border-dashed border-ui-700"
    >
      <IconDragDrop size={20} stroke={1.5} aria-hidden />
      Drop Symbols here
    </div>
  )
}
