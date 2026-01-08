import {
  IconAlertCircle,
  IconBusinessplan,
  IconInfoCircle,
  IconLoader2,
  IconMoodPuzzled,
  IconPlayerPlay,
  IconPlus,
  IconReport,
  IconReportAnalytics,
  IconReportMoney,
  IconSettings,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"
import { useGameContext } from "../../context/GameContext"
import { useEffect, useRef, useState } from "react"
import { Button } from "../Button"
import { NumberInput } from "../NumberInput"
import { mutation, query } from "../../lib/queries"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import type { BetSimulationConfig, BetSimulationStats } from "../../../../server/types"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs"
import { SimulationLoading } from "../Loading"
import { Statistics } from "../Statistics"

const DEFAULT_CONFIG: BetSimulationConfig = {
  id: "",
  players: {
    count: 100,
    startingBalance: 1000,
  },
  betGroups: [],
}

function makeDefaultConfig(): BetSimulationConfig {
  return {
    ...DEFAULT_CONFIG,
    id: crypto.randomUUID().split("-")[0],
  }
}

function makeDefaultBetGroup(mode: string) {
  return {
    id: crypto.randomUUID().split("-")[0],
    mode,
    betAmount: 1,
    spins: 500,
  }
}

export const GameBetSimulation = () => {
  const { gameId, game } = useGameContext()

  const { data, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ["game", "bet-sim-conf", gameId],
    queryFn: async () => {
      return await query.gameBetSimConf(gameId)
    },
    refetchOnWindowFocus: false,
  })

  const updateConfMutation = useMutation({
    mutationKey: ["game", "bet-sim-conf", gameId],
    mutationFn: async (data: BetSimulationConfig[]) => {
      return await mutation.gameBetSimConf(gameId, data)
    },
  })

  const [betConfigs, setBetConfigs] = useState<BetSimulationConfig[]>([])
  const lastDataTimestamp = useRef<number | null>(null)
  const isUserChange = useRef(false)

  useEffect(() => {
    if (!data) return
    if (lastDataTimestamp.current === dataUpdatedAt) return

    setBetConfigs(data.configs)
    lastDataTimestamp.current = dataUpdatedAt
  }, [data, dataUpdatedAt])

  useEffect(() => {
    if (!isUserChange.current) return
    if (!data) return

    updateConfMutation.mutate(betConfigs)
    isUserChange.current = false
  }, [betConfigs, data])

  useEffect(() => {
    lastDataTimestamp.current = null
    isUserChange.current = false
  }, [gameId])

  if (error) return <ErrorDisplay error={error} />

  if (!data || isFetching) {
    return (
      <div className="grid grid-cols-[2fr_1fr] gap-4 items-start">
        <div>
          <Skeleton className="h-32" />
          <Skeleton className="h-32 mt-4" />
          <Skeleton className="h-32 mt-4" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  function addBetSimConfig() {
    isUserChange.current = true
    setBetConfigs((prev) => [...prev, makeDefaultConfig()])
  }

  function onConfigChange(config: BetSimulationConfig) {
    isUserChange.current = true
    setBetConfigs((prev) => prev.map((c) => (c.id === config.id ? config : c)))
  }

  function removeSimulation(id: string) {
    isUserChange.current = true
    setBetConfigs((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-4 items-start">
      <div>
        {betConfigs.length > 0 ? (
          betConfigs.map((config, index) => (
            <BetSimulation
              config={config}
              onValueChange={onConfigChange}
              removeSimulation={removeSimulation}
              key={index}
              isSaving={updateConfMutation.isPending}
            />
          ))
        ) : (
          <div className="p-8 rounded-lg border border-ui-700 bg-ui-900 flex flex-col items-center">
            <div className="text-xl mb-2">No simulation configured</div>
            <div className="mb-4 text-ui-100">
              See how your game might perform with your current results
            </div>
            <Button onClick={() => addBetSimConfig()}>
              <IconSettings />
              Configure
            </Button>
          </div>
        )}
        {betConfigs.length > 0 && (
          <Button className="mt-4" onClick={() => addBetSimConfig()}>
            <IconPlus />
            Add another Simulation
          </Button>
        )}
      </div>
      <div className="p-6 rounded-lg bg-ui-900 border border-ui-700 sticky top-16">
        <div className="flex items-center gap-2 mb-2">
          <IconInfoCircle />
          <h4>How does this work?</h4>
        </div>
        <p>
          This module simulates game behavior with multiple players betting on the game
          under equal circumstances. For each "spin" a virtual player does, a random
          weighted result from the lookup table is chosen, similar to real Stake RGS
          functionality.
        </p>
        <p>
          After simulation you'll be presented with the results and how your game performs
          on average.
        </p>
        <p>
          You can configure and run as many simultaneous simulations as you like. Your
          configuration will be saved.
        </p>
      </div>
    </div>
  )
}

interface BetSimulationProps {
  config: BetSimulationConfig
  onValueChange: (config: BetSimulationConfig) => void
  removeSimulation: (id: string) => void
  isSaving: boolean
}

const BetSimulation = ({
  config,
  onValueChange,
  removeSimulation,
  isSaving,
}: BetSimulationProps) => {
  const { game, gameId } = useGameContext()
  const avgRtps =
    game.modes.map((m) => m.rtp).reduce((a, b) => a + b, 0) / game.modes.length

  const [tab, setTab] = useState("config")

  function updatePlayerCount(count: number | null) {
    const newConfig = {
      ...config,
      players: { ...config.players, count: count ?? config.players.count },
    }
    onValueChange(newConfig)
  }

  function updateStartingBalance(balance: number | null) {
    const newConfig = {
      ...config,
      players: {
        ...config.players,
        startingBalance: balance ?? config.players.startingBalance,
      },
    }
    onValueChange(newConfig)
  }

  function addBetGroup() {
    const newConfig = {
      ...config,
      betGroups: [...config.betGroups, makeDefaultBetGroup(game.modes[0]?.name || "")],
    }
    onValueChange(newConfig)
  }

  function changeGroupMode(id: string, mode: string) {
    const newConfig = {
      ...config,
      betGroups: config.betGroups.map((bg) => (bg.id === id ? { ...bg, mode } : bg)),
    }
    onValueChange(newConfig)
  }

  function updateGroupSpins(id: string, spins: number | null) {
    const newConfig = {
      ...config,
      betGroups: config.betGroups.map((bg) =>
        bg.id === id ? { ...bg, spins: spins ?? bg.spins } : bg,
      ),
    }
    onValueChange(newConfig)
  }

  function updateGroupBetAmnt(id: string, betAmount: number | null) {
    const newConfig = {
      ...config,
      betGroups: config.betGroups.map((bg) =>
        bg.id === id ? { ...bg, betAmount: betAmount ?? bg.betAmount } : bg,
      ),
    }
    onValueChange(newConfig)
  }

  function removeBetGroup(id: string) {
    const newConfig = {
      ...config,
      betGroups: config.betGroups.filter((bg) => bg.id !== id),
    }
    onValueChange(newConfig)
  }

  const betGroupModes = game.modes.map((m) => ({
    label: `${m.name} (Cost: ${m.cost}x)`,
    value: m.name,
  }))

  function getModeRtp(modeName: string) {
    const mode = game.modes.find((m) => m.name === modeName)
    return mode ? mode.rtp * 100 : 0
  }

  function getModeCost(modeName: string) {
    const mode = game.modes.find((m) => m.name === modeName)
    return mode ? mode.cost : 1
  }

  const [results, setResults] = useState<BetSimulationStats | null>(null)

  const simulationMutation = useMutation({
    mutationKey: ["game", "bet-simulation", gameId, config.id],
    mutationFn: async () => {
      return await mutation.startBetSimulation(gameId, config)
    },
    onSuccess(data, _, __, context) {
      setTab("results")
      setResults(data.results)
    },
  })

  const frmt = new Intl.NumberFormat("en-DE").format

  const canNotSimulate =
    config.betGroups.length === 0 || isSaving || simulationMutation.isPending

  const isBusy = isSaving || simulationMutation.isPending

  return (
    <div className="mb-4 rounded-lg overflow-clip bg-ui-900 border border-ui-700">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="config" className="rounded-none">
            <IconSettings />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="results" className="rounded-none">
            <IconReportAnalytics />
            Results
          </TabsTrigger>
          <div className="ml-auto flex items-center">
            <Button
              variant="ghost"
              className="rounded-none"
              disabled={canNotSimulate}
              onClick={() => simulationMutation.mutate()}
            >
              {isBusy ? <IconLoader2 className="animate-spin" /> : <IconPlayerPlay />}
              Start Simulation
            </Button>
            <Button
              variant="ghost-destructive"
              className="rounded-none"
              onClick={() => removeSimulation(config.id)}
            >
              <IconTrash />
              Remove Simulation
            </Button>
          </div>
        </TabsList>
        <TabsContent value="config" className="p-6 relative">
          {simulationMutation.isPending && (
            <div className="absolute z-1 w-full h-full top-0 left-0 bg-ui-800/75 backdrop-blur-sm flex items-center justify-center">
              <SimulationLoading isLoading={true} />
            </div>
          )}

          <h5 className="flex items-center gap-2">
            <IconUsers />
            Virtual Players
          </h5>
          <div className="flex gap-4 mt-2 mb-6">
            <NumberInput
              label="Player Count"
              step={1}
              min={1}
              max={2000}
              inputMode="numeric"
              className="w-full"
              value={config.players.count}
              onValueChange={(v) => updatePlayerCount(v)}
            />
            <NumberInput
              label="Starting Balance"
              step={50}
              min={1}
              max={20_000}
              inputMode="numeric"
              className="w-full"
              value={config.players.startingBalance}
              onValueChange={(v) => updateStartingBalance(v)}
            />
          </div>
          <div className="flex items-center gap-4">
            <h5 className="flex items-center gap-2">
              <IconBusinessplan />
              Bet Groups ({config.betGroups.length})
            </h5>
            <Button variant="secondary" size="sm" onClick={addBetGroup}>
              <IconPlus />
              Add Bet Group
            </Button>
          </div>
          <div className="mt-2 mb-4 text-ui-100">
            Bet groups are played sequentially for each player, reflecting a virtual
            betting session.
          </div>
          <div className="grid grid-cols-2 gap-4 max-h-96 pr-2 scrollbar-thin overflow-y-auto">
            {config.betGroups.map((bg, index) => (
              <div
                key={index}
                className="relative p-4 rounded-lg bg-ui-950 flex flex-col gap-2"
              >
                <div className="text-xs text-ui-500 absolute top-2 right-2">{bg.id}</div>
                <Select
                  label="Mode"
                  value={bg.mode}
                  multiple={false}
                  onValueChange={(v) => changeGroupMode(bg.id, v || "")}
                  items={betGroupModes}
                >
                  <SelectTrigger className="w-full" />
                  <SelectContent>
                    {betGroupModes.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-4">
                  <NumberInput
                    label="Number of Bets"
                    step={10}
                    min={1}
                    max={5000}
                    inputMode="numeric"
                    className="w-full"
                    value={bg.spins}
                    onValueChange={(v) => updateGroupSpins(bg.id, v)}
                  />
                  <NumberInput
                    label="Bet"
                    step={0.1}
                    min={0.1}
                    max={1000}
                    inputMode="decimal"
                    className="w-full"
                    value={bg.betAmount}
                    onValueChange={(v) => updateGroupBetAmnt(bg.id, v)}
                  />
                </div>
                <div className="mt-2 flex gap-4 justify-between items-end">
                  <div className="text-sm">
                    <div>Estimated Balance Loss:</div>
                    <div className="flex gap-2">
                      <span className="font-bold">0% RTP:</span>
                      <span>{frmt(bg.betAmount * bg.spins * getModeCost(bg.mode))}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold">50% RTP:</span>
                      <span>
                        {frmt((bg.betAmount * bg.spins * getModeCost(bg.mode)) / 2)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold">{getModeRtp(bg.mode)}% RTP:</span>
                      <span>
                        {frmt(
                          (bg.betAmount *
                            bg.spins *
                            getModeCost(bg.mode) *
                            (100 - getModeRtp(bg.mode))) /
                            100,
                        )}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost-destructive"
                    isIconButton
                    onClick={() => removeBetGroup(bg.id)}
                  >
                    <IconTrash />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="results" className="relative p-6">
          {simulationMutation.isPending && (
            <div className="absolute z-1 w-full h-full top-0 left-0 bg-ui-800/75 backdrop-blur-sm flex items-center justify-center">
              <SimulationLoading isLoading={true} />
            </div>
          )}

          {!results && (
            <div className="flex flex-col justify-center items-center">
              <IconMoodPuzzled size={64} stroke={1} />
              <h5>No Results available</h5>
              <div className="text-ui-100">Start the simulation to see results</div>
            </div>
          )}
          {results && (
            <div className="max-h-124 overflow-y-auto pr-2">
              {results.warnings.map((w, i) => (
                <div
                  key={i}
                  className="pl-2 pr-4 py-2 rounded-lg border border-orange-500 bg-orange-950 mb-4 flex gap-2"
                >
                  <IconAlertCircle className="text-orange-500" />
                  {w}
                </div>
              ))}

              <h5 className="flex items-center gap-2 mb-4">
                <IconReportAnalytics />
                Bet Results
              </h5>
              <div className="grid grid-cols-3 gap-2">
                <Statistics label="Total Bets" value={frmt(results.totalBets)} />
                <Statistics label="Average Bets" value={frmt(results.avgBets)} />
                <Statistics label="Median Bets" value={frmt(results.medianBets)} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Statistics label="P20 Bets" value={frmt(results.low20PercentileBets)} />
                <Statistics label="P80 Bets" value={frmt(results.high20PercentileBets)} />
              </div>

              <h5 className="flex items-center gap-2 mt-6 mb-4">
                <IconReportMoney />
                Profit Results
              </h5>
              <div className="grid grid-cols-2 gap-2">
                <Statistics label="Total Wager" value={frmt(results.totalWager)} />
                <Statistics
                  label="Total Profit"
                  value={frmt(results.totalProfit)}
                  description="Should be negative. This (positive) amount would go to the casino"
                  isSuccess={results.totalProfit < 0}
                  successText={`${(frmt(Math.abs(results.totalProfit)))} goes to the casino`}
                  isDanger={results.totalProfit > 0}
                  dangerText={`${frmt(results.totalProfit)} profit for players!`}
                  isWarning={!results.totalProfit}
                  warningText="An error occurred, try again"
                />
                <Statistics label="Num Bets Profit" value={frmt(results.numBetsProfit)} />
                <Statistics label="Num Bets Loss" value={frmt(results.numBetsLoss)} />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <Statistics
                  label="Average Profit"
                  value={frmt(results.avgProfit)}
                  isSuccess={results.totalProfit < 0}
                  successText="Avg. amount per player goes to the casino"
                  isDanger={results.totalProfit > 0}
                  dangerText="Avg. amount per player is profit!"
                />
                <Statistics label="Median Profit" value={frmt(results.medianProfit)} />
                <Statistics
                  label="Min Profit"
                  value={frmt(results.minProfit)}
                  description="Of player at end of simulations"
                />
                <Statistics
                  label="Max Profit"
                  value={frmt(results.maxProfit)}
                  description="Of player at end of simulations"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Statistics
                  label="P20 Profit"
                  value={frmt(results.low20PercentileProfit)}
                />
                <Statistics
                  label="P80 Profit"
                  value={frmt(results.high20PercentileProfit)}
                />
                <Statistics
                  label="Standard Deviation"
                  value={frmt(results.payoutStdDev)}
                  description="This value might vary strongly. It's best to run multiple simulations to get a better idea of this value"
                />
              </div>

              <h5 className="flex items-center gap-2 mt-6 mb-4">
                <IconReportMoney />
                Miscellaneous
              </h5>
              <div className="grid grid-cols-3 gap-2">
                <Statistics
                  label="Longest Win Streak"
                  value={frmt(results.longestWinStreak)}
                />
                <Statistics
                  label="Longest Lose Streak"
                  value={frmt(results.longestLoseStreak)}
                  isWarning={results.longestLoseStreak >= 50}
                  warningText="Value is quite high"
                />
                <Statistics
                  label="Longest 0-Win Streak"
                  value={frmt(results.longest0Streak)}
                  isWarning={results.longest0Streak >= 25}
                  warningText="Value is quite high"
                />
                <Statistics
                  label="Nice Wins"
                  value={frmt(results.hits15)}
                  description=">= 15x, < 40x"
                />
                <Statistics
                  label="Mega Wins"
                  value={frmt(results.hits40)}
                  description=">= 40x, < 90x"
                />
                <Statistics
                  label="Sensational Wins"
                  value={frmt(results.hits90)}
                  description=">= 90x"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Statistics
                  label="Highest Balance"
                  value={frmt(results.highestBalance)}
                  description="Of player at end of simulations"
                />
                <Statistics
                  label="Lowest Balance"
                  value={frmt(results.lowestBalance)}
                  description="Of player at end of simulations"
                />
              </div>

              <h5 className="flex items-center gap-2 mt-6 mb-4">
                <IconReport />
                RTP Results
              </h5>
              <div className="grid grid-cols-2 gap-2">
                <Statistics
                  label="Average RTP"
                  value={frmt(results.avgRtp)}
                  description="Might be inaccurate for smaller simulations"
                  isWarning={Math.abs(results.avgRtp - avgRtps) >= 7}
                  warningText="RTP deviates significantly"
                  isSuccess={Math.abs(results.avgRtp - avgRtps) < 7}
                  successText="RTP is within expected range"
                />
                <Statistics
                  label="Median RTP"
                  value={frmt(results.medianRtp)}
                  description="Might be inaccurate for smaller simulations"
                  isWarning={Math.abs(results.avgRtp - avgRtps) >= 7}
                  warningText="RTP deviates significantly"
                  isSuccess={Math.abs(results.avgRtp - avgRtps) < 7}
                  successText="RTP is within expected range"
                />
                <Statistics label="Highest RTP" value={frmt(results.highestRtp)} />
                <Statistics label="Lowest RTP" value={frmt(results.lowestRtp)} />
              </div>

              <h5 className="flex items-center gap-2 mt-6 mb-4">
                <IconReport />
                ResultSet Criteria
              </h5>
              <div>
                {Object.entries(results.visualization.criteriaPerGroup).map(
                  ([groupId, criteria]) => (
                    <div key={groupId} className="mt-4">
                      <h6 className="font-bold mb-2">Group {groupId}</h6>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(criteria).map(([crit, count]) => (
                          <Statistics key={crit} label={crit} value={frmt(count)} />
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
