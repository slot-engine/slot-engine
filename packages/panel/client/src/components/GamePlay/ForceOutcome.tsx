import { IconX } from "@tabler/icons-react"
import { Button } from "../Button"
import { NumberInput } from "../NumberInput"
import { describeForce, NO_FORCE, toForce, type ForceFields } from "./force"

interface ForceOutcomeProps {
  fields: ForceFields
  error: Error | null
  onChange: (fields: ForceFields) => void
}

export const ForceOutcome = ({ fields, error, onChange }: ForceOutcomeProps) => {
  return (
    <div>
      <NumberInput
        label="Book ID"
        placeholder="Any"
        min={0}
        step={1}
        value={fields.bookId}
        onValueChange={(bookId) => onChange({ ...fields, bookId })}
      />
      <NumberInput
        label="Payout multiplier"
        placeholder="Any"
        className="mt-4"
        min={0}
        step={0.1}
        value={fields.payoutMultiplier}
        onValueChange={(payoutMultiplier) => onChange({ ...fields, payoutMultiplier })}
      />
      <p className="text-xs text-ui-500 mt-2">
        Without an exact match, the closest payout is played. A book ID wins when both are
        set.
      </p>
      <div className="flex items-center justify-between gap-2 mt-4">
        <div className="text-ui-100">{describeForce(toForce(fields))}</div>
        <Button variant="secondary" size="sm" onClick={() => onChange(NO_FORCE)}>
          <IconX size={20} stroke={1.5} aria-hidden />
          Clear
        </Button>
      </div>
      {error && (
        <div className="text-xs text-danger-500 mt-2" role="alert">
          {error.message}
        </div>
      )}
    </div>
  )
}
