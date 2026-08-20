---
"@slot-engine/core": patch
"@slot-engine/optimizer": patch
---

Fix one-shot math reliability and follow-on gaps: ResultSet multipliers at 0.01x precision; fail-closed sim workers; refuse optimizer LUTs that zero max win or an entire target; compare triggeredMaxWin in cent units; Hamilton quota/chunk allocation (no hang when ResultSets > sims); weight win-range analysis from publish LUT; 0-based book event indices; safe maxwin hit-rate when weight is 0.
