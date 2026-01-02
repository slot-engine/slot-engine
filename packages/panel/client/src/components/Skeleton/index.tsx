import { cn } from "../../lib/cn"

export const Skeleton = (props: React.ComponentPropsWithoutRef<"div">) => {
  return (
    <div
    {...props}
      className={cn("animate-pulse bg-ui-800 rounded-lg", props.className)}
    />
  )
}
