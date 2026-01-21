---
"@slot-engine/core": patch
---

Fix non-maxwin result sets being able to hit max wins.

Developer note:
- A result set _without_ explicit `multiplier` (and `maxwin: false`), will _always_ accept results with payouts > 0 and < max win.
