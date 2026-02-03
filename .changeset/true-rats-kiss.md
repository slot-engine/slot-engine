---
"@slot-engine/core": patch
---

Symbols on the board are now auto-assigned the `position` property to retrieve reel index and row index

This is useful if you need to retrieve the position on the board directly from a `GameSymbol` instance.
