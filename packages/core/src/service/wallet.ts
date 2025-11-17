import assert from "assert"
import { AbstractService } from "."
import { GameContext } from "../game-context"
import { AnyGameModes, AnySymbols, AnyUserData, SpinType } from "../types"
import { Wallet } from "../wallet"

export class WalletService<
  TGameModes extends AnyGameModes = AnyGameModes,
  TSymbols extends AnySymbols = AnySymbols,
  TUserState extends AnyUserData = AnyUserData,
> extends AbstractService {
  private wallet!: Wallet

  constructor(ctx: () => GameContext<TGameModes, TSymbols, TUserState>) {
    // @ts-ignore TODO: Fix type errors with AnyTypes
    super(ctx)
  }

  private ensureWallet() {
    assert(this.wallet, "Wallet not set in WalletService. Call setWallet() first.")
  }

  /**
   * Intended for internal use only.
   */
  _getWallet() {
    this.ensureWallet()
    return this.wallet
  }

  /**
   * Intended for internal use only.
   */
  _setWallet(wallet: Wallet) {
    this.wallet = wallet
  }

  /**
   * Updates the win for the current spin.
   *
   * Should be called after each tumble event, if applicable.\
   * Or generally call this to add wins during a spin.
   *
   * After each (free) spin, this amount should be added to `currentWinPerSpinType` via `confirmSpinWin()`
   */
  addSpinWin(amount: number) {
    this.ensureWallet()
    this.wallet.addSpinWin(amount)
  }

  /**
   * Assigns a win amount to the given spin type.
   *
   * Should be called after `addSpinWin()`, and after your tumble events are played out,\
   * and after a (free) spin is played out to finalize the win.
   */
  confirmSpinWin(spinType: SpinType) {
    this.ensureWallet()
    this.wallet.confirmSpinWin(spinType)
  }
}
