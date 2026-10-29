# Slot Engine LGS

Local gaming server. Test your game locally without uploading to Engine and save time during development.

[📖 Documentation](https://slot-engine.dev/docs/lgs)

## What it is

The LGS is a local stand-in for the RGS (remote game server) that a game front end talks to. `EngineLgs` serves the Engine RGS endpoints (`/wallet/authenticate`, `/wallet/balance`, `/wallet/play`, `/wallet/end-round`, `/bet/event`) with the same request and response shapes, money format and error codes.

Outcomes come from your simulated math: each play draws a book from the mode's published lookup table by weight and returns that book's events as `round.state`. Run the simulation for a game before you play it.

Sessions, wallets and bets live in the storage you pass in. `InMemoryStorage` keeps them until the process exits.

## Install

```sh
npm i @slot-engine/lgs
```

Requires `@slot-engine/core` >= 0.4.0 and Node >= 23.8.0. Your game must specify `rootDir: __dirname`.

## Standalone

```ts
import { EngineLgs, InMemoryStorage } from "@slot-engine/lgs"
import { game } from "./game"

new EngineLgs({ storage: new InMemoryStorage(), games: [game], port: 7771 }).start()
```

The LGS listens on port 7771 when you omit `port`.

## With the panel

```ts
import { createPanel } from "@slot-engine/panel"
import { EngineLgs, InMemoryStorage } from "@slot-engine/lgs"

createPanel({
  games: [game],
  lgs: new EngineLgs({ storage: new InMemoryStorage() }),
}).start()
```

The panel serves the LGS on its own port (7770) and registers its games with it. Do not set `port` on an LGS that you pass to the panel.

## Create a session

```sh
curl -X POST localhost:7770/lgs/sessions -H "content-type: application/json" -d "{\"gameId\":\"example-01\"}"
```

The body accepts `gameId` (required), `currency`, `language`, `balance` (in major units, for a new wallet), `walletId` (to reuse a wallet and its balance), `device`, `social` and `demo`. The response contains the `sessionID`, the `walletId`, the `launchParams` and a `launchQuery` string. `rgs_url` is the host that received the request, so it points back at the LGS.

## Launch a front end

Append the `launchQuery` to your front end's URL:

```
http://localhost:3000/?sessionID=...&rgs_url=localhost%3A7770&lang=en&currency=USD&device=desktop&social=false&demo=false
```

The LGS serves plain HTTP. The official Engine client defaults to HTTPS, so create it with the protocol set:

```ts
RGSClient({ url: window.location.href, protocol: "http" })
```

## Options

Money in the options is in major units (`1` is one unit of the currency). Over HTTP all amounts are integers with six decimals (`1000000` is 1.00).

| Option                                | Default                                       |
| ------------------------------------- | --------------------------------------------- |
| `balance.starting`                    | `10000`                                       |
| `bets.min` / `bets.max` / `bets.step` | `0.1` / `1000` / `0.01`                       |
| `bets.default`                        | `1`                                           |
| `languages` / `defaultLanguage`       | all 17 Engine languages / `"en"`              |
| `currencies` / `defaultCurrency`      | all Engine currencies / `"USD"`               |
| `jurisdiction` (`EngineLgs` only)     | every flag `false`, `minimumRoundDuration: 0` |

`GET /lgs` returns the resolved configuration, `GET /lgs/games` the registered games and modes, and `GET /lgs/sessions/:id` a session with its wallet and active bet.
