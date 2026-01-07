import { Checkbox as Primitive } from "@base-ui/react/checkbox"
import { Field } from "@base-ui/react/field"
import { cn } from "../../lib/cn"
import { IconCheck } from "@tabler/icons-react"

interface CheckboxProps extends Primitive.Root.Props {
  label?: string
  description?: string
}

export const Checkbox = ({ label, description, className, ...props }: CheckboxProps) => {
  return (
    <Field.Root className={cn("", className)}>
      <Field.Label className="flex items-center gap-2">
        <Primitive.Root
          {...props}
          className="size-6 p-0.5 flex items-center justify-center bg-ui-800 border border-ui-700 rounded-lg shrink-0"
        >
          <Primitive.Indicator render={() => <IconCheck />} />
        </Primitive.Root>
        {label && <span className="block leading-5">{label}</span>}
      </Field.Label>
      {description && <div className="text-xs text-ui-500 mt-1">{description}</div>}
    </Field.Root>
  )
}
