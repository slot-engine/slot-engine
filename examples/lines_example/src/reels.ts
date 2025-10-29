import { ReelGenerator } from "@slot-engine/core"

const SYM_WEIGHTS = {
  base: {
    SS: 1,
    S: 5,
    W: 15,
    H1: 40,
    H2: 40,
    H3: 50,
    H4: 60,
    L1: 70,
    L2: 80,
    L3: 80,
    L4: 90,
    L5: 90,
  },
  bonus: {
    SS: 1,
    S: 5,
    W: 20,
    H1: 50,
    H2: 60,
    H3: 70,
    H4: 80,
    L1: 80,
    L2: 90,
    L3: 100,
    L4: 90,
    L5: 80,
  },
  superBonus: {
    SS: 0,
    S: 5,
    W: 70,
    H1: 70,
    H2: 70,
    H3: 80,
    H4: 90,
    L1: 90,
    L2: 80,
    L3: 70,
    L4: 70,
    L5: 60,
  },
  maxwin: {
    SS: 0,
    S: 3,
    W: 90,
    H1: 80,
    H2: 80,
    H3: 80,
    H4: 70,
    L1: 70,
    L2: 80,
    L3: 80,
    L4: 60,
    L5: 60,
  },
} as const

const defaultSettings = {
  outputDir: __dirname,
  overrideExisting: false,
  limitSymbolsToReels: {
    W: [1, 2, 3, 4],
  },
  symbolQuotas: {
    S: 0.001,
    SS: 0.001,
  },
  spaceBetweenSameSymbols: 4,
  spaceBetweenSymbols: {
    S: { SS: 5 },
  },
}

export const GENERATORS = {
  base1: new ReelGenerator({
    id: "base1",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.base,
  }),
  bonus1: new ReelGenerator({
    id: "bonus1",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.bonus,
    symbolStacks: {
      W: { chance: { "1": 25, "2": 50, "3": 25, "4": 10 }, min: 3, max: 3 },
    },
  }),
  bonus2: new ReelGenerator({
    id: "bonus2",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.bonus,
    symbolStacks: {
      W: { chance: { "1": 25, "2": 50, "3": 10, "4": 10 }, min: 3, max: 3 },
    },
  }),
  superbonus: new ReelGenerator({
    id: "superbonus",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.superBonus,
    symbolStacks: {
      W: { chance: { "1": 50, "2": 50, "3": 50, "4": 50 }, min: 3, max: 3 },
    },
  }),
  maxwin: new ReelGenerator({
    id: "maxwin",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.maxwin,
    symbolStacks: {
      W: { chance: { "1": 100, "2": 100, "3": 100, "4": 100 }, min: 3, max: 5 },
    },
  }),
} as const
