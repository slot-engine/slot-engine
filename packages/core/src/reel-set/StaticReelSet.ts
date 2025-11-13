import { ReelSet, ReelSetOptions } from ".";

export class StaticReelSet extends ReelSet {
  constructor(opts: StaticReelSetOptions) {
    super(opts);
  }
}

interface StaticReelSetOptions extends ReelSetOptions {
  
}