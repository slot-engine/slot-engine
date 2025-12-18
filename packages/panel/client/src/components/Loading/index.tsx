import { IconLoader2 } from "@tabler/icons-react"

interface LoadingProps {
  isLoading: boolean
}

export const Loading = ({ isLoading }: LoadingProps) => {
  if (!isLoading) return null

  return (
    <div className="p-8 flex flex-col items-center justify-center">
      <IconLoader2 className="animate-spin" size={64} stroke={1} />
    </div>
  )
}
