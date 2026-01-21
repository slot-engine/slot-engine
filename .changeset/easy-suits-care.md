---
"@slot-engine/core": patch
---

Add `ctx.services.data.log()` method for logging messages to the TUI

Developer note:
- Since `console.log` was not working reliably in worker threads, this service method was added
