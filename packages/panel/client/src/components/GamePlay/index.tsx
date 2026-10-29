import { useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useDebouncedCallback, useLocalStorage } from "@mantine/hooks"
import { IconExternalLink, IconPlayerPlay, IconRefresh } from "@tabler/icons-react"
import type { ForcedOutcome, LgsInfoResponse } from "@slot-engine/lgs"
import { useGameContext } from "@/context/GameContext"
import { createReplay, createSession, lgsInfo, setForce } from "@/lib/lgs"
import { query } from "@/lib/queries"
import { Button } from "../Button"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs"
import { ForceOutcome } from "./ForceOutcome"
import { NO_FORCE, toForce, type ForceFields } from "./force"
import { NoLgs } from "./NoLgs"
import { ReplayBook } from "./ReplayBook"
import { initialReplayFields, type ReplayFields, type ReplayRequest } from "./replay"
import { SessionInfo } from "./SessionInfo"
import { SettingsBar } from "./SettingsBar"
import { launchSrc, parseGameUrl, resolveSettings, type PlaySettings } from "./settings"

type PlayState =
  | { status: "idle" }
  | { status: "launching" }
  | { status: "playing"; launchId: number; sessionId: string; src: string }
  | ({ status: "replaying"; launchId: number; src: string } & ReplayRequest)
  | { status: "error"; message: string }

const INVALID_URL =
  "Enter the http:// or https:// URL of your game, e.g. http://localhost:3000"

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
  const { game } = useGameContext()
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
  const [replayFields, setReplayFields] = useState<ReplayFields>(() =>
    initialReplayFields(game.modes, info),
  )
  const latestLaunch = useRef(0)

  async function launch(next: PlaySettings) {
    const id = ++latestLaunch.current
    replayMutation.reset()
    const gameUrl = parseGameUrl(next.url)
    if (!gameUrl) {
      setPlay({ status: "error", message: INVALID_URL })
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
        launchId: id,
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

  const replayMutation = useMutation({
    mutationFn: async (args: {
      launchId: number
      settings: PlaySettings
      request: ReplayRequest
    }): Promise<PlayState> => {
      const { launchId, settings, request } = args
      const gameUrl = parseGameUrl(settings.url)
      if (!gameUrl) throw new Error(INVALID_URL)
      const { launchQuery } = await createReplay({
        gameId,
        mode: request.mode,
        event: request.event,
        amount: request.amount ?? undefined,
        currency: settings.currency,
        language: settings.language,
        social: settings.social,
        device: "desktop",
      })
      return {
        ...request,
        status: "replaying",
        launchId,
        src: launchSrc(gameUrl, launchQuery),
      }
    },
  })

  function replay(next: PlaySettings, request: ReplayRequest) {
    const id = ++latestLaunch.current
    replayMutation.mutate(
      { launchId: id, settings: next, request },
      {
        onSuccess: (replaying) => {
          if (id === latestLaunch.current) setPlay(replaying)
        },
      },
    )
  }

  const relaunchSoon = useDebouncedCallback(() => launch(settings), 500)

  function launchFromUrl() {
    const next = { ...settings, url: url.trim() }
    setStored(next)
    relaunchSoon.cancel()
    void launch(next)
  }

  function replayFromUrl(request: ReplayRequest) {
    const next = { ...settings, url: url.trim() }
    setStored(next)
    relaunchSoon.cancel()
    replay(next, request)
  }

  function changeSettings(patch: Partial<PlaySettings>) {
    const next = { ...settings, ...patch }
    setStored(next)
    if (play.status === "idle") return
    relaunchSoon.cancel()
    if (play.status === "replaying") {
      replay(next, { mode: play.mode, event: play.event, amount: play.amount })
    } else {
      void launch(next)
    }
  }

  function changeBalance(balance: number) {
    setStored({ ...settings, balance })
    if (play.status !== "idle" && play.status !== "replaying") relaunchSoon()
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
        className="flex items-center gap-2 px-6 py-3 bg-ui-900 border-b border-ui-800"
        onSubmit={(event) => {
          event.preventDefault()
          launchFromUrl()
        }}
      >
        <input
          aria-label="Game URL"
          inputMode="url"
          spellCheck={false}
          className="grow min-w-0 h-10 px-3 rounded-lg bg-ui-800 outline-1 -outline-offset-1 outline-transparent transition-[outline-color] duration-150 focus:outline-accent-500 placeholder:text-ui-500"
          placeholder="http://localhost:3000"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
        <Button type="submit" disabled={play.status === "launching"}>
          {play.status === "playing" ? (
            <IconRefresh size={20} stroke={1.5} aria-hidden />
          ) : (
            <IconPlayerPlay size={20} stroke={1.5} aria-hidden />
          )}
          {play.status === "playing" ? "Reload" : "Launch"}
        </Button>
        {"src" in play && (
          <a
            className="link mb-0 shrink-0 px-2 whitespace-nowrap"
            href={play.src}
            target="_blank"
          >
            Open in new tab
            <IconExternalLink size={20} stroke={1.5} aria-hidden />
          </a>
        )}
      </form>

      <div className="row-start-2 bg-ui-950">
        <Stage play={play} />
      </div>

      <div className="row-start-3 bg-ui-900 border-t border-ui-800">
        <SettingsBar
          info={info}
          settings={settings}
          onChange={changeSettings}
          onBalanceChange={changeBalance}
        />
      </div>

      <aside className="col-start-2 row-span-3 row-start-1 p-6 bg-ui-900 border-l border-ui-800 overflow-y-auto scrollbar-thin">
        <Tabs defaultValue="force">
          <TabsList>
            <TabsTrigger value="force">Force outcome</TabsTrigger>
            <TabsTrigger value="replay">Replay</TabsTrigger>
          </TabsList>
          <TabsContent value="force" className="pt-6">
            <ForceOutcome
              fields={forceFields}
              error={forceMutation.error}
              onChange={changeForce}
            />
          </TabsContent>
          <TabsContent value="replay" className="pt-6">
            <ReplayBook
              info={info}
              fields={replayFields}
              pending={replayMutation.isPending || play.status === "launching"}
              error={replayMutation.error}
              onChange={setReplayFields}
              onReplay={replayFromUrl}
            />
          </TabsContent>
        </Tabs>
        <h4 className="mt-8 mb-3">Session</h4>
        <SessionDetails play={play} />
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
    case "replaying":
      return (
        <iframe
          key={play.launchId}
          title="Game"
          src={play.src}
          allow="autoplay; fullscreen"
          className="w-full h-full"
        />
      )
    case "error":
      return (
        <div className="h-full flex items-center justify-center p-8 text-center text-danger-500">
          {play.message}
        </div>
      )
  }
}

const SessionDetails = ({ play }: { play: PlayState }) => {
  switch (play.status) {
    case "playing":
      return <SessionInfo sessionId={play.sessionId} />
    case "replaying":
      return (
        <div className="text-sm text-ui-500">
          Replay of book {play.event} in mode {play.mode}. No session.
        </div>
      )
    default:
      return (
        <div className="text-sm text-ui-500">Launch the game to start a session.</div>
      )
  }
}
