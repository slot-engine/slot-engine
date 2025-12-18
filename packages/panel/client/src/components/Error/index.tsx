import { FetchError } from "../../lib/queries"

interface ErrorDisplayProps {
  error: Error | null
}

export const ErrorDisplay = ({ error }: ErrorDisplayProps) => {
  const styles = "p-8 flex flex-col items-center justify-center"

  if (!error) return null

  if (error instanceof FetchError) {
    return (
      <div className={styles}>
        <h2>{error.code}</h2>
        <div>{error.message}</div>
      </div>
    )
  }

  return (
    <div className={styles}>
      <h2>{error.message}</h2>
    </div>
  )
}
