import { Chrome, ChromeInputType, type ChromeProps } from "@uiw/react-color"

export const ColorPicker = (props: ChromeProps) => {
  return (
    <Chrome
      {...props}
      showAlpha={false}
      showTriangle={false}
      inputType={ChromeInputType.HEXA}
      className="rounded! bg-transparent! shadow-none! border-none! overflow-clip!"
    />
  )
}
