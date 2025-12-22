import { cva } from "../../lib/cn"

interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "secondary"
  size?: "sm" | "md" | "lg"
}

export const Button = ({ variant = "primary", size = "md", ...props }: ButtonProps) => {
  const styles = cva({
    base: [props.className, "cursor-pointer flex items-center gap-2 rounded-lg px-4 py-2"],
    variants: {
      variant: {
        primary: "bg-ui-50 text-ui-950 hover:bg-ui-100",
        secondary: "",
      },
    },
  })

  return (
    <button {...props} className={styles({ variant })}>
      {props.children}
    </button>
  )
}
