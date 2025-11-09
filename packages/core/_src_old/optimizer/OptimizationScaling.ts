export class OptimizationScaling {
  protected config: OptimizationScalingOpts

  constructor(opts: OptimizationScalingOpts) {
    this.config = opts
  }

  getConfig() {
    return this.config
  }
}

type OptimizationScalingOpts = Array<{
  criteria: string
  scaleFactor: number
  winRange: [number, number]
  probability: number
}>
