import { cva } from "../../lib/cn"

interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
  isIconButton?: boolean
}

export const Button = ({
  variant = "primary",
  size = "md",
  isIconButton = false,
  ...props
}: ButtonProps) => {
  const styles = cva({
    base: [
      "cursor-pointer flex items-center gap-2 rounded-lg py-2 disabled:cursor-not-allowed disabled:opacity-50",
      props.className,
    ],
    variants: {
      variant: {
        primary: "bg-ui-50 text-ui-950 hover:bg-ui-100",
        secondary: "bg-ui-700 hover:bg-ui-800",
        ghost: "bg-transparent hover:bg-ui-800",
        destructive: "bg-red-600 text-white hover:bg-red-700",
      },
      isIconButton: {
        true: "px-2",
        false: "px-4",
      },
      size: {
        sm: "",
        md: "",
        lg: "",
      },
    },
  })

  return (
    <button {...props} className={styles({ variant, isIconButton, size })}>
      {props.children}
    </button>
  )
}
