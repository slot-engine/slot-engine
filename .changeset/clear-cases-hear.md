---
"@slot-engine/core": patch
---

Adjust how `WinType.postProcess` works

`postProcess` now must return only the modified win combinations.
The total `payout` is automatically calculated from the modified win combinations
and must not be explicitly returned anymore.

```ts
const { payout, winCombinations } = lines
  .evaluateWins(reels)
  .postProcess(wins => {
    const newWins = wins.map(w => ({
      ...w,
      payout: w.payout * 2,
    }))
    
    return {
      winCombinations: newWins,
    }
  })
  .getWins()
```