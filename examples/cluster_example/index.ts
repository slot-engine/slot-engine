import {
  GameMode,
  GameSymbol,
  InferGameType,
  OptimizationConditions,
  OptimizationParameters,
  OptimizationScaling,
  ResultSet,
  createSlotGame,
  defineGameModes,
  defineSymbols,
  defineUserState,
  SPIN_TYPE,
} from "@slot-engine/core"
import { GENERATORS } from "./src/reels"
import { onHandleGameFlow } from "./src/onHandleGameFlow"
import { maxwinReelsEvaluation } from "./src/evaluations"

export const userState = defineUserState({
  boardMultis: [] as number[][],
})

export type UserStateType = typeof userState

export const symbols = defineSymbols({
  S: new GameSymbol({
    id: "S",
    properties: {
      isScatter: true,
    },
  }),
  W: new GameSymbol({
    id: "W",
    pays: {
      5: 1,
      6: 1.5,
      7: 1.75,
      8: 2,
      9: 2.5,
      10: 5,
      11: 7.5,
      12: 15,
      13: 35,
      14: 70,
      15: 150,
    },
    properties: { isWild: true },
  }),
  H1: new GameSymbol({
    id: "H1",
    pays: {
      5: 1,
      6: 1.5,
      7: 1.75,
      8: 2,
      9: 2.5,
      10: 5,
      11: 7.5,
      12: 15,
      13: 35,
      14: 70,
      15: 150,
    },
  }),
  H2: new GameSymbol({
    id: "H2",
    pays: {
      5: 0.75,
      6: 1,
      7: 1.25,
      8: 1.5,
      9: 2,
      10: 4,
      11: 6,
      12: 12.5,
      13: 30,
      14: 60,
      15: 100,
    },
  }),
  H3: new GameSymbol({
    id: "H3",
    pays: {
      5: 0.5,
      6: 0.75,
      7: 1,
      8: 1.25,
      9: 1.5,
      10: 3,
      11: 4.5,
      12: 10,
      13: 20,
      14: 40,
      15: 60,
    },
  }),
  H4: new GameSymbol({
    id: "H4",
    pays: {
      5: 0.4,
      6: 0.5,
      7: 0.75,
      8: 1,
      9: 1.25,
      10: 2,
      11: 3,
      12: 5,
      13: 10,
      14: 20,
      15: 40,
    },
  }),
  L1: new GameSymbol({
    id: "L1",
    pays: {
      5: 0.3,
      6: 0.4,
      7: 0.5,
      8: 0.75,
      9: 1,
      10: 1.5,
      11: 2.5,
      12: 3.5,
      13: 8,
      14: 15,
      15: 30,
    },
  }),
  L2: new GameSymbol({
    id: "L2",
    pays: {
      5: 0.25,
      6: 0.3,
      7: 0.4,
      8: 0.5,
      9: 0.75,
      10: 1.25,
      11: 2,
      12: 3,
      13: 6,
      14: 12,
      15: 25,
    },
  }),
  L3: new GameSymbol({
    id: "L3",
    pays: {
      5: 0.2,
      6: 0.25,
      7: 0.3,
      8: 0.4,
      9: 0.5,
      10: 1,
      11: 1.5,
      12: 2.5,
      13: 5,
      14: 10,
      15: 20,
    },
  }),
})

export type SymbolsType = typeof symbols

export const gameModes = defineGameModes({
  base: new GameMode({
    name: "base",
    cost: 1,
    rtp: 0.96,
    reelsAmount: 7,
    symbolsPerReel: [7, 7, 7, 7, 7, 7, 7],
    isBonusBuy: false,
    reelSets: [...Object.values(GENERATORS)],
    resultSets: [
      new ResultSet({
        criteria: "0",
        quota: 0.4,
        multiplier: 0,
        reelWeights: {
          [SPIN_TYPE.BASE_GAME]: { base: 1 },
          [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
        },
      }),
      new ResultSet({
        criteria: "basegame",
        quota: 0.4,
        reelWeights: {
          [SPIN_TYPE.BASE_GAME]: { base: 1 },
          [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
        },
      }),
      new ResultSet({
        criteria: "freespins",
        quota: 0.1,
        forceFreespins: true,
        reelWeights: {
          [SPIN_TYPE.BASE_GAME]: { base: 1 },
          [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
        },
      }),
      new ResultSet({
        criteria: "maxwin",
        quota: 0.01,
        forceMaxWin: true,
        forceFreespins: true,
        reelWeights: {
          [SPIN_TYPE.BASE_GAME]: { base: 1 },
          [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
          evaluate: maxwinReelsEvaluation,
        },
      }),
    ],
  }),
  bonus: new GameMode({
    name: "bonus",
    cost: 100,
    rtp: 0.96,
    reelsAmount: 7,
    symbolsPerReel: [7, 7, 7, 7, 7, 7, 7],
    isBonusBuy: true,
    reelSets: [...Object.values(GENERATORS)],
    resultSets: [
      new ResultSet({
        criteria: "freespins",
        quota: 0.9,
        forceFreespins: true,
        reelWeights: {
          [SPIN_TYPE.BASE_GAME]: { base: 1 },
          [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
        },
      }),
      new ResultSet({
        criteria: "maxwin",
        quota: 0.01,
        forceMaxWin: true,
        forceFreespins: true,
        reelWeights: {
          [SPIN_TYPE.BASE_GAME]: { base: 1 },
          [SPIN_TYPE.FREE_SPINS]: { bonus: 1 },
          evaluate: maxwinReelsEvaluation,
        },
      }),
    ],
  }),
})

export type GameModesType = typeof gameModes

export type GameType = InferGameType<GameModesType, SymbolsType, UserStateType>

export const game = createSlotGame<GameType>({
  id: "example-02",
  name: "Example Cluster Game",
  maxWinX: 5000,
  gameModes,
  symbols,
  padSymbols: 1,
  scatterToFreespins: {
    [SPIN_TYPE.BASE_GAME]: {
      3: 10,
      4: 12,
      5: 15,
      6: 20,
      7: 30,
    },
    [SPIN_TYPE.FREE_SPINS]: {
      3: 10,
      4: 12,
      5: 15,
      6: 20,
      7: 30,
    },
  },
  userState,
  hooks: {
    onHandleGameFlow,
  },
})

game.configureSimulation({
  simRunsAmount: {
    base: 20000,
    bonus: 20000,
  },
  concurrency: 8,
})

game.configureOptimization({
  gameModes: {
    base: {
      conditions: {
        maxwin: new OptimizationConditions({
          rtp: 0.01,
          avgWin: 5000,
          searchConditions: {
            criteria: "maxwin",
          },
          priority: 8,
        }),
        "0": new OptimizationConditions({
          rtp: 0,
          avgWin: 0,
          searchConditions: 0,
          priority: 6,
        }),
        freespins: new OptimizationConditions({
          rtp: 0.38,
          hitRate: 150,
          searchConditions: {
            criteria: "freespins",
          },
          priority: 2,
        }),
        basegame: new OptimizationConditions({
          rtp: 0.57,
          hitRate: 4,
          priority: 1,
        }),
      },
      scaling: new OptimizationScaling([]),
      parameters: new OptimizationParameters(),
    },
    bonus: {
      conditions: {
        maxwin: new OptimizationConditions({
          rtp: 0.01,
          avgWin: 5000,
          searchConditions: 5000,
          priority: 2,
        }),
        freespins: new OptimizationConditions({
          rtp: 0.95,
          hitRate: "x",
          priority: 1,
        }),
      },
      scaling: new OptimizationScaling([]),
      parameters: new OptimizationParameters(),
    },
  },
})

game.runTasks({
  doSimulation: true,
  doOptimization: false,
  optimizationOpts: {
    gameModes: ["base", "bonus"],
  },
  doAnalysis: true,
  analysisOpts: {
    gameModes: ["base", "bonus"],
  },
})
