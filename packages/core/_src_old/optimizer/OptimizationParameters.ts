export class OptimizationParameters {
  protected parameters: OptimizationParametersOpts

  constructor(opts?: OptimizationParametersOpts) {
    this.parameters = {
      ...OptimizationParameters.DEFAULT_PARAMETERS,
      ...opts,
    }
  }

  static DEFAULT_PARAMETERS: OptimizationParametersOpts = {
    numShowPigs: 5000,
    numPigsPerFence: 10000,
    threadsFenceConstruction: 16,
    threadsShowConstruction: 16,
    testSpins: [50, 100, 200],
    testSpinsWeights: [0.3, 0.4, 0.3],
    simulationTrials: 5000,
    graphIndexes: [],
    run1000Batch: false,
    minMeanToMedian: 4,
    maxMeanToMedian: 8,
    pmbRtp: 1.0,
    scoreType: "rtp",
  }

  getParameters() {
    return this.parameters
  }
}

export interface OptimizationParametersOpts {
  readonly numShowPigs: number
  readonly numPigsPerFence: number
  readonly threadsFenceConstruction: number
  readonly threadsShowConstruction: number
  readonly testSpins: number[]
  readonly testSpinsWeights: number[]
  readonly simulationTrials: number
  readonly graphIndexes: number[]
  readonly run1000Batch: false
  readonly minMeanToMedian: number
  readonly maxMeanToMedian: number
  readonly pmbRtp: number
  readonly scoreType: "rtp"
}
