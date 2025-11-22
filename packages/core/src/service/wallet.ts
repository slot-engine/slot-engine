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
   * Adds the given amount to the wallet state.
   *
   * After calculating the win for a board, call this method to update the wallet state.\
   * If your game has tumbling mechanics, you should call this method again after every new tumble and win calculation.
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
  confirmSpinWin() {
    this.ensureWallet()
    this.wallet.confirmSpinWin(this.ctx().state.currentSpinType)
  }
}
