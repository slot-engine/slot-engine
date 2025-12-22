import { NumberInput as ArkComponent } from "@ark-ui/react/number-input"
import { IconMinus, IconPlus } from "@tabler/icons-react"
import { Button } from "../Button"

interface NumberInputProps extends ArkComponent.RootProps {
  label?: string
}

export const NumberInput = (props: NumberInputProps) => (
  <ArkComponent.Root {...props}>
    {props.label && <ArkComponent.Label className="block mb-1">{props.label}</ArkComponent.Label>}
    <ArkComponent.Control className="flex">
      <ArkComponent.DecrementTrigger
        asChild
        className="cursor-pointer p-2 rounded-r-none"
      >
        <Button variant="secondary" isIconButton>
          <IconMinus />
        </Button>
      </ArkComponent.DecrementTrigger>
      <ArkComponent.Input className="w-full px-4 border-y border-ui-700" />
      <ArkComponent.IncrementTrigger
        asChild
        className="cursor-pointer p-2 rounded-l-none"
      >
        <Button variant="secondary" isIconButton>
          <IconPlus />
        </Button>
      </ArkComponent.IncrementTrigger>
    </ArkComponent.Control>
  </ArkComponent.Root>
)
