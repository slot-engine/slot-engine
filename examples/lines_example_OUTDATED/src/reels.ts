import { GeneratedReelSet } from "@slot-engine/core"

const SYM_WEIGHTS = {
  base: {
    SS: 1,
    S: 5,
    W: 7,
    H1: 10,
    H2: 10,
    H3: 25,
    H4: 20,
    L1: 50,
    L2: 70,
    L3: 80,
    L4: 90,
    L5: 90,
  },
  bonus: {
    SS: 1,
    S: 5,
    W: 20,
    H1: 40,
    H2: 50,
    H3: 60,
    H4: 70,
    L1: 80,
    L2: 90,
    L3: 100,
    L4: 90,
    L5: 80,
  },
  superBonus: {
    SS: 0,
    S: 5,
    W: 30,
    H1: 60,
    H2: 60,
    H3: 70,
    H4: 80,
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
  base1: new GeneratedReelSet({
    id: "base1",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.base,
  }),
  bonus1: new GeneratedReelSet({
    id: "bonus1",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.bonus,
    symbolStacks: {
      W: { chance: { "1": 20, "2": 20, "3": 20, "4": 5 }, min: 3, max: 3 },
    },
  }),
  bonus2: new GeneratedReelSet({
    id: "bonus2",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.bonus,
    symbolStacks: {
      W: { chance: { "1": 30, "2": 30, "3": 25, "4": 10 }, min: 3, max: 3 },
    },
  }),
  superbonus: new GeneratedReelSet({
    id: "superbonus",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.superBonus,
    symbolStacks: {
      W: { chance: { "1": 40, "2": 40, "3": 25, "4": 15 }, min: 3, max: 3 },
    },
  }),
  maxwin: new GeneratedReelSet({
    id: "maxwin",
    ...defaultSettings,
    symbolWeights: SYM_WEIGHTS.maxwin,
    symbolStacks: {
      W: { chance: { "1": 90, "2": 90, "3": 90, "4": 90 }, min: 3, max: 5 },
    },
  }),
} as const
