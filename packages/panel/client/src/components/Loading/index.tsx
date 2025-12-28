import { IconLoader2 } from "@tabler/icons-react"
import { cn } from "../../lib/cn"

interface LoadingProps extends React.ComponentPropsWithoutRef<"div"> {
  isLoading: boolean
}

export const Loading = ({ isLoading, ...props }: LoadingProps) => {
  if (!isLoading) return null

  return (
    <div
      {...props}
      className={cn("p-8 flex flex-col items-center justify-center", props.className)}
    >
      <IconLoader2 className="animate-spin" size={64} stroke={1} />
    </div>
  )
}

export const SimulationLoading = ({ isLoading, ...props }: LoadingProps) => {
  if (!isLoading) return null

  const text = "SIMULATING"

  return (
    <div {...props} className={cn("", props.className)}>
      <div className="flex flex-col items-center justify-center">
        <div className="text-2xl flex tracking-wider">
          {text.split("").map((char, index) => (
            <span
              key={index}
              className="block animate-pulse h-6 overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <span
                className="text-slot-letter"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="block leading-6">{char}</span>
                <span className="block leading-6">{char}</span>
                <span className="block leading-6">{char}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
