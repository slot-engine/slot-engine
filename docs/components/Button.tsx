import { cva } from "@/lib/cn"

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button"> {}

export const Button = ({ children, className, ...props }: ButtonProps) => {
  const buttonStyles = cva({
    base: [
      "cursor-pointer px-4 py-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition",
    ],
  })

  return (
    <button className={buttonStyles()} {...props}>
      {children}
    </button>
  )
}
