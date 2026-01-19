---
"@slot-engine/core": minor
---

Omit generation of uncompressed book files. Generate compressed book chunks instead.

This will add some minor memory overhead during simulation, but significantly reduces the disk space required for storing book files.
Compressed books can be inspected with `@slot-engine/panel`.