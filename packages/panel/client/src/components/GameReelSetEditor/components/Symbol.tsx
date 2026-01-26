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
        "cursor-grab w-20 h-12 bg-ui-800 rounded-sm border border-ui-700",
        "data-[dnd-dragging=true]:opacity-90 data-[dnd-dragging=true]:animate-wiggle",
        className,
      )}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <span className="text-xl pl-1">{symbolId}</span>
        <span className="absolute text-xs top-0.5 left-1 text-ui-100">{index}</span>
        <span
          className="absolute w-1 h-[calc(100%-0.5rem)] top-1 right-1 rounded"
          style={{ backgroundColor: colors[symbolId] }}
        />
        {!isDragging && (
          <span
            className="cursor-pointer absolute bottom-1 left-1"
            title="Delete Symbol"
            onClick={handleDelete}
          >
            <IconTrash size={14} />
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
      className="py-8 h-128 flex flex-col justify-center items-center gap-2 text-center border border-ui-700 border-dashed rounded-sm"
    >
      <IconDragDrop />
      Drop Symbols here
    </div>
  )
}
