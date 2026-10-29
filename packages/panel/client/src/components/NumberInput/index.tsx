import { NumberField as Primitive } from "@base-ui/react/number-field"
import { IconMinus, IconPlus } from "@tabler/icons-react"
import { Button } from "../Button"
import { useId } from "react"

interface NumberInputProps extends Primitive.Root.Props {
  label?: string
  placeholder?: string
}

const stepperStyles = "text-ui-500 hover:bg-ui-700 hover:text-ui-50"

export const NumberInput = (props: NumberInputProps) => {
  const id = useId()

  return (
    <Primitive.Root id={id} {...props}>
      {props.label && (
        <label htmlFor={id} className="block mb-1.5 text-ui-100">
          {props.label}
        </label>
      )}
      <Primitive.Group className="flex h-10 rounded-lg bg-ui-800 outline-1 -outline-offset-1 outline-transparent transition-[outline-color] duration-150 focus-within:outline-accent-500 data-disabled:opacity-50">
        <Primitive.Decrement
          className={stepperStyles}
          render={(props) => (
            <Button variant="ghost" isIconButton {...props}>
              <IconMinus size={20} stroke={1.5} aria-hidden />
            </Button>
          )}
        />
        <Primitive.Input
          placeholder={props.placeholder}
          className="w-full min-w-0 px-1 bg-transparent text-center tabular outline-none placeholder:text-ui-500"
        />
        <Primitive.Increment
          className={stepperStyles}
          render={(props) => (
            <Button variant="ghost" isIconButton {...props}>
              <IconPlus size={20} stroke={1.5} aria-hidden />
            </Button>
          )}
        />
      </Primitive.Group>
    </Primitive.Root>
  )
}
