import { cva } from "@/lib/cn"

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  size?: "md" | "lg"
}

export const Button = ({ children, className, size = "md", ...props }: ButtonProps) => {
  const buttonStyles = cva({
    base: [
      "cursor-pointer rounded-full bg-blue-500 text-white hover:bg-blue-600 transition",
    ],
    variants: {
      size: {
        md: "px-4 py-2",
        lg: "px-4 lg:px-8 py-2 lg:py-4 lg:text-xl",
      }
    }
  })

  return (
    <button className={buttonStyles({ size })} {...props}>
      {children}
    </button>
  )
}
