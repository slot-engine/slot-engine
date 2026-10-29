import { cva } from "../../lib/cn"

interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "ghost-destructive"
  size?: "sm" | "md" | "lg"
  isIconButton?: boolean
}

const buttonStyles = cva({
  base: "press inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    variant: {
      primary: "bg-accent-500 text-ui-950 hover:bg-accent-500/90",
      secondary: "bg-ui-800 text-ui-50 hover:bg-ui-700",
      ghost: "text-ui-100 hover:bg-ui-800 hover:text-ui-50",
      destructive: "bg-danger-500 text-ui-950 hover:bg-danger-500/90",
      "ghost-destructive": "text-danger-500 hover:bg-danger-950",
    },
    size: {
      sm: "h-8 px-3",
      md: "h-10 px-4",
      lg: "h-12 px-5",
    },
    isIconButton: {
      true: "size-10 p-0",
      false: "",
    },
  },
})

export const Button = ({
  variant = "primary",
  size = "md",
  isIconButton = false,
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      {...props}
      className={buttonStyles({ variant, isIconButton, size, className })}
    />
  )
}
