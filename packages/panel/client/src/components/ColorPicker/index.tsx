import { Chrome, ChromeInputType, type ChromeProps } from "@uiw/react-color"

const PICKER_THEME = {
  "--chrome-arrow-fill": "var(--color-ui-500)",
  "--chrome-arrow-background-color": "var(--color-ui-800)",
}

export const ColorPicker = (props: ChromeProps) => {
  return (
    <Chrome
      {...props}
      style={{ ...PICKER_THEME, ...props.style }}
      showAlpha={false}
      showTriangle={false}
      inputType={ChromeInputType.HEXA}
      className="rounded-lg! bg-transparent! shadow-none! border-none! overflow-clip!"
    />
  )
}
