import { FetchError } from "../../lib/queries"

interface ErrorDisplayProps {
  error: Error | null
  render?: (props: { error: Error | FetchError }) => React.ReactNode
}

export const ErrorDisplay = ({ error, render }: ErrorDisplayProps) => {
  const styles = "p-8 flex flex-col items-center justify-center"

  if (!error) return null

  if (error instanceof FetchError) {
    if (render) {
      return <>{render({ error })}</>
    }

    return (
      <div className={styles}>
        <h2>{error.code}</h2>
        <div>{error.message}</div>
      </div>
    )
  }

  if (render) {
    return <>{render({ error })}</>
  }

  return (
    <div className={styles}>
      <h2>{error.message}</h2>
    </div>
  )
}
