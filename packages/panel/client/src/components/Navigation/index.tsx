import SlotEngineIcon from "@/assets/slot-engine-icon.png"

export const Navigation = () => {
  return (
    <div className="px-8 py-6 flex gap-8 justify-between border-b border-ui-700">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <img src={SlotEngineIcon} alt="" width={24} height={24} />
          <span className="font-bold">Slot Engine</span>
        </div>
        <div className="h-6 w-0.5 bg-ui-50"></div>
        <span>Panel</span>
      </div>
    </div>
  )
}