---
"@slot-engine/core": patch
"@slot-engine/optimizer": patch
---

Fix one-shot math reliability: compare ResultSet multipliers at 0.01x precision, fail closed when sim workers crash (no broken publish files), and refuse optimizer LUTs that zero out the global max win.
