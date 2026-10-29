import type { LgsInfoResponse } from "@slot-engine/lgs"
import { Checkbox } from "../Checkbox"
import { NumberInput } from "../NumberInput"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"
import type { PlaySettings } from "./settings"

interface SettingsBarProps {
  info: LgsInfoResponse
  settings: PlaySettings
  onChange: (patch: Partial<PlaySettings>) => void
  onBalanceChange: (balance: number) => void
}

export const SettingsBar = ({
  info,
  settings,
  onChange,
  onBalanceChange,
}: SettingsBarProps) => {
  return (
    <div className="flex items-end gap-4 px-6 py-4">
      <Select
        label="Currency"
        className="w-36"
        multiple={false}
        value={settings.currency}
        onValueChange={(currency) => currency && onChange({ currency })}
      >
        <SelectTrigger />
        <SelectContent>
          {info.currencies.map((currency) => (
            <SelectItem key={currency} value={currency}>
              {currency}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        label="Language"
        className="w-28"
        multiple={false}
        value={settings.language}
        onValueChange={(language) => language && onChange({ language })}
      >
        <SelectTrigger />
        <SelectContent>
          {info.languages.map((language) => (
            <SelectItem key={language} value={language}>
              {language}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <NumberInput
        label="Starting balance"
        className="w-56"
        min={0}
        value={settings.balance}
        onValueChange={(balance) => onBalanceChange(balance ?? 0)}
      />
      <Checkbox
        label="Social"
        className="h-10 flex items-center"
        checked={settings.social}
        onCheckedChange={(social) => onChange({ social })}
      />
    </div>
  )
}
