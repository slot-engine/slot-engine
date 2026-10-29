import crypto from "crypto"
import { AbstractStorage, type Bet, type Repository, type Session, type Wallet } from "."

export class MemoryRepository<T extends { id: Id }, Id extends string | number>
  implements Repository<T, Id>
{
  private readonly items = new Map<Id, T>()

  constructor(private readonly nextId: () => Id) {}

  async get(id: Id) {
    return this.items.get(id)
  }

  async create(data: Omit<T, "id">) {
    const item = { ...data, id: this.nextId() } as T
    this.items.set(item.id, item)
    return item
  }

  async update(id: Id, patch: Partial<Omit<T, "id">>) {
    const existing = this.items.get(id)
    if (!existing) throw new Error(`No record with id ${id}`)
    const updated = { ...existing, ...patch, id }
    this.items.set(id, updated)
    return updated
  }

  async delete(id: Id) {
    this.items.delete(id)
  }

  async find(predicate: (item: T) => boolean) {
    return [...this.items.values()].filter(predicate)
  }
}

function randomToken() {
  return crypto.randomBytes(24).toString("base64url")
}

function counter() {
  let last = 0
  return () => ++last
}

export class InMemoryStorage extends AbstractStorage {
  readonly wallets = new MemoryRepository<Wallet, string>(randomToken)
  readonly sessions = new MemoryRepository<Session, string>(randomToken)
  readonly bets = new MemoryRepository<Bet, number>(counter())
}
