import { useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useDebouncedCallback, useLocalStorage } from "@mantine/hooks"
import { IconExternalLink, IconPlayerPlay, IconRefresh } from "@tabler/icons-react"
import type { ForcedOutcome, LgsInfoResponse } from "@slot-engine/lgs"
import { useGameContext } from "@/context/GameContext"
import { createSession, lgsInfo, setForce } from "@/lib/lgs"
import { query } from "@/lib/queries"
import { Button } from "../Button"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { ForceOutcome } from "./ForceOutcome"
import { NO_FORCE, toForce, type ForceFields } from "./force"
import { NoLgs } from "./NoLgs"
import { SessionInfo } from "./SessionInfo"
import { SettingsBar } from "./SettingsBar"
import { launchSrc, parseGameUrl, resolveSettings, type PlaySettings } from "./settings"

type PlayState =
  | { status: "idle" }
  | { status: "launching" }
  | { status: "playing"; sessionId: string; src: string }
  | { status: "error"; message: string }

export const GamePlay = () => {
  const { gameId } = useGameContext()
  const status = useQuery({ queryKey: ["status"], queryFn: query.status })
  const info = useQuery({
    queryKey: ["lgs", "info"],
    queryFn: lgsInfo,
    enabled: !!status.data?.lgs,
  })

  const error = status.error ?? info.error
  if (error) return <ErrorDisplay error={error} />
  if (status.data && !status.data.lgs) return <NoLgs />
  if (!info.data) return <Skeleton className="h-content-height rounded-none" />
  return <Player key={gameId} gameId={gameId} info={info.data} />
}

interface PlayerProps {
  gameId: string
  info: LgsInfoResponse
}

const Player = ({ gameId, info }: PlayerProps) => {
  const [stored, setStored] = useLocalStorage<unknown>({
    key: `panel.play.${gameId}`,
    defaultValue: {},
    getInitialValueInEffect: false,
  })
  const settings = resolveSettings(stored, info)
  const [url, setUrl] = useState(settings.url)
  const [play, setPlay] = useState<PlayState>({ status: "idle" })
  const [forceFields, setForceFields] = useState<ForceFields>(NO_FORCE)
  const force = toForce(forceFields)
  const latestLaunch = useRef(0)

  async function launch(next: PlaySettings) {
    const id = ++latestLaunch.current
    const gameUrl = parseGameUrl(next.url)
    if (!gameUrl) {
      setPlay({
        status: "error",
        message:
          "Enter the http:// or https:// URL of your game, e.g. http://localhost:3000",
      })
      return
    }

    setPlay({ status: "launching" })
    try {
      const { sessionID, launchQuery } = await createSession({
        gameId,
        currency: next.currency,
        language: next.language,
        balance: next.balance,
        social: next.social,
        force,
      })
      if (id !== latestLaunch.current) return
      setPlay({
        status: "playing",
        sessionId: sessionID,
        src: launchSrc(gameUrl, launchQuery),
      })
    } catch (error) {
      if (id !== latestLaunch.current) return
      setPlay({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const relaunchSoon = useDebouncedCallback(() => launch(settings), 500)

  function launchFromUrl() {
    const next = { ...settings, url: url.trim() }
    setStored(next)
    relaunchSoon.cancel()
    void launch(next)
  }

  function changeSettings(patch: Partial<PlaySettings>) {
    const next = { ...settings, ...patch }
    setStored(next)
    if (play.status === "idle") return
    relaunchSoon.cancel()
    void launch(next)
  }

  function changeBalance(balance: number) {
    setStored({ ...settings, balance })
    if (play.status !== "idle") relaunchSoon()
  }

  const forceMutation = useMutation({
    mutationFn: (args: { sessionId: string; force: ForcedOutcome | null }) =>
      setForce(args.sessionId, args.force),
  })
  const syncForce = useDebouncedCallback(() => {
    if (play.status === "playing")
      forceMutation.mutate({ sessionId: play.sessionId, force })
  }, 400)

  function changeForce(fields: ForceFields) {
    setForceFields(fields)
    syncForce()
  }

  return (
    <div className="h-content-height grid grid-cols-[minmax(0,1fr)_24rem] grid-rows-[auto_minmax(0,1fr)_auto]">
      <form
        className="flex items-center gap-2 px-4 py-3 border-b border-ui-700"
        onSubmit={(event) => {
          event.preventDefault()
          launchFromUrl()
        }}
      >
        <input
          aria-label="Game URL"
          className="grow px-4 py-2 border border-ui-700 rounded-lg"
          placeholder="http://localhost:3000"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button type="submit" disabled={play.status === "launching"}>
          {play.status === "playing" ? <IconRefresh /> : <IconPlayerPlay />}
          {play.status === "playing" ? "Reload" : "Launch"}
        </Button>
        {play.status === "playing" && (
          <a
            className="flex items-center gap-1 px-2 text-sm text-ui-500 hover:text-ui-100 underline"
            href={play.src}
            target="_blank"
          >
            Open in new tab
            <IconExternalLink size={18} />
          </a>
        )}
      </form>

      <div className="row-start-2 bg-ui-900">
        <Stage play={play} />
      </div>

      <div className="row-start-3">
        <SettingsBar
          info={info}
          settings={settings}
          onChange={changeSettings}
          onBalanceChange={changeBalance}
        />
      </div>

      <aside className="col-start-2 row-span-3 row-start-1 px-4 py-8 border-l border-ui-700 overflow-y-auto">
        <ForceOutcome
          fields={forceFields}
          error={forceMutation.error}
          onChange={changeForce}
        />
        <h5 className="pb-2 mt-8 mb-2 border-b border-ui-700">Session</h5>
        {play.status === "playing" ? (
          <SessionInfo sessionId={play.sessionId} />
        ) : (
          <div className="text-sm text-ui-500">Launch the game to start a session.</div>
        )}
      </aside>
    </div>
  )
}

const Stage = ({ play }: { play: PlayState }) => {
  switch (play.status) {
    case "idle":
      return (
        <div className="h-full flex items-center justify-center p-8 text-center text-ui-500">
          Start your game's front end, enter its URL above and launch it.
        </div>
      )
    case "launching":
      return <Skeleton className="h-full rounded-none" />
    case "playing":
      return (
        <iframe
          key={play.src}
          title="Game"
          src={play.src}
          allow="autoplay; fullscreen"
          className="w-full h-full"
        />
      )
    case "error":
      return (
        <div className="h-full flex items-center justify-center p-8 text-center text-red-500">
          {play.message}
        </div>
      )
  }
}
