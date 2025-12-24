import { NumberField as Primitive } from "@base-ui/react/number-field"
import { IconMinus, IconPlus } from "@tabler/icons-react"
import { Button } from "../Button"
import { useId } from "react"

interface NumberInputProps extends Primitive.Root.Props {
  label?: string
}

export const NumberInput = (props: NumberInputProps) => {
  const id = useId()

  return (
    <Primitive.Root id={id} {...props}>
      {props.label && (
        <label htmlFor={id} className="block mb-1">
          {props.label}
        </label>
      )}
      <Primitive.Group className="flex">
        <Primitive.Decrement
          className="cursor-pointer p-2 rounded-r-none"
          render={(props) => (
            <Button variant="secondary" isIconButton {...props}>
              <IconMinus />
            </Button>
          )}
        />
        <Primitive.Input className="w-full px-4 border-y border-ui-700" />
        <Primitive.Increment
          className="cursor-pointer p-2 rounded-l-none"
          render={(props) => (
            <Button variant="secondary" isIconButton {...props}>
              <IconPlus />
            </Button>
          )}
        />
      </Primitive.Group>
    </Primitive.Root>
  )
}
