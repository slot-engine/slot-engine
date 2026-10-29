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
      <Field.Label className="flex items-center gap-2 cursor-pointer">
        <Primitive.Root
          {...props}
          className="size-5 flex items-center justify-center shrink-0 rounded-md bg-ui-800 inset-ring inset-ring-ui-500 text-ui-950 transition-colors duration-150 hover:bg-ui-700 data-checked:bg-accent-500 data-checked:inset-ring-0 data-checked:hover:bg-accent-500/90"
        >
          <Primitive.Indicator
            render={<IconCheck size={20} stroke={1.5} aria-hidden />}
          />
        </Primitive.Root>
        {label && <span>{label}</span>}
      </Field.Label>
      {description && <div className="text-xs text-ui-500 mt-1.5">{description}</div>}
    </Field.Root>
  )
}
