---
"@slot-engine/core": patch
---

Improve simulation performance and reduce RAM usage

Previously, a noticable performance drop could be observed going into 400.000 completed simulations.
Slot Engine stored a lot of data in memory during simulations, which caused high RAM usage and slowdowns.
With this update, temporary data is now written to disk instead of being kept in memory,
which greatly improves performance and reduces RAM consumption during large simulation runs.

Simulation data handling has changed substantially,
so if you experience any issues after this update please open a bug report.