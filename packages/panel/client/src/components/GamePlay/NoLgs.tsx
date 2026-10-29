import { IconExternalLink, IconPlugConnectedX } from "@tabler/icons-react"

const SNIPPET = `import { EngineLgs, InMemoryStorage } from "@slot-engine/lgs"

createPanel({
  games: [MyGame],
  lgs: new EngineLgs({ storage: new InMemoryStorage() }),
})`

export const NoLgs = () => {
  return (
    <div className="flex justify-center gap-4 px-6 py-16">
      <div className="size-14 shrink-0 flex items-center justify-center rounded-xl bg-ui-800">
        <IconPlugConnectedX size={32} stroke={1.5} aria-hidden />
      </div>
      <div className="max-w-2xl min-w-0">
        <h3 className="mb-2">No LGS attached</h3>
        <p className="text-ui-100">
          Playing a game needs a local gaming server (LGS) that creates sessions and
          serves the RGS endpoints. Attach one with the <code>lgs</code> option of{" "}
          <code>createPanel</code>, then restart the panel.
        </p>
        <pre className="my-4 p-4 rounded-2xl bg-ui-900 shadow-card overflow-x-auto scrollbar-thin">
          {SNIPPET}
        </pre>
        <a className="link" href="https://slot-engine.dev/docs/lgs" target="_blank">
          LGS Quick Start
          <IconExternalLink size={20} stroke={1.5} aria-hidden />
        </a>
      </div>
    </div>
  )
}
