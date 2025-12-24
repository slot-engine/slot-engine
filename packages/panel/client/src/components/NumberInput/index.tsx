import { NumberField as Primitive } from "@base-ui/react/number-field"
import { IconMinus, IconPlus } from "@tabler/icons-react"
import { Button } from "../Button"

interface NumberInputProps extends Primitive.Root.Props {
  label?: string
}

export const NumberInput = (props: NumberInputProps) => (
  <Primitive.Root {...props}>
    {props.label && <div className="block mb-1">{props.label}</div>}
    <Primitive.Control className="flex">
      <Primitive.DecrementTrigger
        asChild
        className="cursor-pointer p-2 rounded-r-none"
      >
        <Button variant="secondary" isIconButton>
          <IconMinus />
        </Button>
      </Primitive.DecrementTrigger>
      <Primitive.Input className="w-full px-4 border-y border-ui-700" />
      <Primitive.IncrementTrigger
        asChild
        className="cursor-pointer p-2 rounded-l-none"
      >
        <Button variant="secondary" isIconButton>
          <IconPlus />
        </Button>
      </Primitive.IncrementTrigger>
    </Primitive.Control>
  </Primitive.Root>
)
