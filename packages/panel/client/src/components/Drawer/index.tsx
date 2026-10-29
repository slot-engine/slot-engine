import { cn } from "@/lib/cn"
import { Drawer as Primitive } from "@base-ui/react/drawer"
import { IconX } from "@tabler/icons-react"
import { Button } from "../Button"

export const Drawer = ({ swipeDirection = "right", ...props }: Primitive.Root.Props) => {
  return <Primitive.Root {...props} swipeDirection={swipeDirection} />
}

export const DrawerTrigger = Primitive.Trigger

export const DrawerTitle = (props: Primitive.Title.Props) => {
  return (
    <Primitive.Title
      {...props}
      className={cn("text-xl font-semibold pr-10 mb-1", props.className)}
    />
  )
}

export const DrawerDescription = (props: Primitive.Description.Props) => {
  return (
    <Primitive.Description {...props} className={cn("text-ui-500", props.className)} />
  )
}

export const DrawerContent = ({
  children,
  className,
  ...props
}: Primitive.Popup.Props) => {
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="fixed inset-0 bg-ui-950/70 backdrop-blur-sm transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
      <Primitive.Viewport>
        <Primitive.Popup
          {...props}
          className={cn(
            "fixed inset-y-0 right-0 w-[28rem] max-w-full p-6 rounded-l-2xl bg-ui-900 shadow-popup outline-none overflow-y-auto overscroll-contain",
            // The swipe offset stays in the resting transform and the duration drops while swiping, so a swipe-to-dismiss tracks the pointer.
            "translate-x-[var(--drawer-swipe-movement-x,0px)] transition-transform duration-200 ease-out data-swiping:duration-0 data-starting-style:translate-x-full data-ending-style:translate-x-full motion-reduce:transition-none",
            className,
          )}
        >
          <Primitive.Content>{children}</Primitive.Content>
          <Primitive.Close
            className="absolute top-4.5 right-4.5"
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
