---
"@slot-engine/core": patch
---

Generate frontend config JSON file

A new configuration file is now always generated (even when no tasks are enabled).
This `frontend_config.json` file is useful for reading game information in the frontend, e.g. for displaying the paytable.

It has the following structure:

```json
{
  "name": "Example Cluster Game",
  "maxWin": 5000,
  "padSymbols": 1,
  "symbols": [
    {
      "id": "S"
    },
    {
      "id": "W",
      "pays": {
        "3": 1,
        "4": 1.5,
        "5": 1.75
      }
    }
    // ...
  ],
  "gameModes": [
    {
      "name": "base",
      "cost": 1,
      "rtp": 0.96
    }
    // ...
  ],
  "reelSets": {
    "base": [
      [
        "L3",
        "L3",
        "H4",
        "H4",
        "H1"
        // ...
      ]
    ]
    // ...
  }
}
```
