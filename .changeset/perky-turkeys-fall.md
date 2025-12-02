---
"@slot-engine/core": patch
---

Fix check in optimizer

Previously, each optimization condition needed to have a corresponding `ResultSet` in a game mode.
This was wrong - it should be the other way around.

Instead, now an optimization condition is not bound to a specific `ResultSet`.
Each `ResultSet` however must have an optimization condition defined.