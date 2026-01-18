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
      className={cn("text-xl font-medium mb-4", props.className)}
    />
  )
}

export const DialogDescription = Primitive.Description

interface DialogContentProps extends Primitive.Popup.Props {
  width?: "sm" | "md" | "lg"
}

export const DialogContent = ({
  children,
  className,
  width = "md",
  ...props
}: DialogContentProps) => {
  const contentStyles = cva({
    base: [
      "p-6 bg-ui-950 border border-ui-700 rounded-lg fixed top-1/2 left-1/2 -translate-1/2",
      className,
    ],
    variants: {
      width: {
        sm: "w-96",
        md: "w-[600px]",
        lg: "w-3/4 max-w-3xl",
      },
    },
  })

  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="fixed inset-0 bg-ui-950/50" />
      <Primitive.Viewport>
        <Primitive.Popup {...props} className={contentStyles({ width })}>
          {children}
          <Primitive.Close
            className="absolute top-4 right-4"
            render={<Button isIconButton variant="ghost" />}
          >
            <IconX />
          </Primitive.Close>
        </Primitive.Popup>
      </Primitive.Viewport>
    </Primitive.Portal>
  )
}
