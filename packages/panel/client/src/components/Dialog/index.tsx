import { cn, cva } from "@/lib/cn"
import { Dialog as Primitive } from "@base-ui/react/dialog"
import { IconX } from "@tabler/icons-react"
import { Button } from "../Button"

export const Dialog = Primitive.Root

export const DialogTrigger = Primitive.Trigger

export const DialogTitle = (props: Primitive.Title.Props) => {
  return (
    <Primitive.Title
      {...props}
      className={cn("text-xl font-semibold pr-10 mb-1", props.className)}
    />
  )
}

export const DialogDescription = (props: Primitive.Description.Props) => {
  return (
    <Primitive.Description {...props} className={cn("text-ui-500", props.className)} />
  )
}

interface DialogContentProps extends Primitive.Popup.Props {
  width?: "sm" | "md" | "lg" | "xl"
}

const contentStyles = cva({
  base: "fixed top-1/2 left-1/2 -translate-1/2 p-4 rounded-2xl bg-ui-900 shadow-popup outline-none overscroll-contain transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0",
  variants: {
    width: {
      sm: "w-96",
      md: "w-[600px]",
      lg: "w-3/4 max-w-3xl",
      xl: "w-[min(72rem,calc(100vw-3rem))] max-h-[calc(100vh-3rem)] flex flex-col",
    },
  },
})

export const DialogContent = ({
  children,
  className,
  width = "md",
  ...props
}: DialogContentProps) => {
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="fixed inset-0 bg-ui-950/70 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
      <Primitive.Viewport>
        <Primitive.Popup {...props} className={contentStyles({ width, className })}>
          {children}
          <Primitive.Close
            className="absolute top-2 right-2"
            aria-label="Close"
            render={<Button isIconButton variant="ghost" />}
          >
            <IconX size={20} stroke={1.5} aria-hidden />
          </Primitive.Close>
        </Primitive.Popup>
      </Primitive.Viewport>
    </Primitive.Portal>
  )
}
