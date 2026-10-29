import { IconExternalLink, IconPlugConnectedX } from "@tabler/icons-react"

const SNIPPET = `import { EngineLgs, InMemoryStorage } from "@slot-engine/lgs"

createPanel({
  games: [MyGame],
  lgs: new EngineLgs({ storage: new InMemoryStorage() }),
})`

export const NoLgs = () => {
  return (
    <div className="flex justify-center gap-4 px-4 py-16">
      <div>
        <IconPlugConnectedX size={64} stroke={1} />
      </div>
      <div className="max-w-2xl">
        <h4 className="text-2xl mb-2">No LGS attached</h4>
        <p>
          Playing a game needs a local gaming server (LGS) that creates sessions and
          serves the RGS endpoints. Attach one with the <code>lgs</code> option of{" "}
          <code>createPanel</code>, then restart the panel.
        </p>
        <pre className="my-4 p-4 bg-ui-900 border border-ui-700 rounded-lg text-sm overflow-x-auto">
          {SNIPPET}
        </pre>
        <a className="link" href="https://slot-engine.dev/docs/lgs" target="_blank">
          LGS Quick Start
          <IconExternalLink size={20} />
        </a>
      </div>
    </div>
  )
}
