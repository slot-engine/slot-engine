/**
 * The mathematical core of the optimizer.
 *
 * The optimization problem solved here is:
 *
 *   minimize    KL(w || w0)                       (stay as close as possible to the prior shape)
 *   subject to  sum(w[c]) = p_c   for each criteria c   (hit rate constraints)
 *               sum(x * w) = rtp * cost                 (payout constraints)
 *               w >= 0
 *
 * The closed-form solution of this convex problem is an "exponential tilt" of
 * the prior distribution: `w_i = w0_i * exp(-mu * x_i) / Z`, where `mu` is the
 * Lagrange multiplier of the payout constraint and `Z` normalizes each criteria
 * to its target probability.
 *
 * This reduces the entire optimization to finding the root of a monotonically
 * decreasing 1-D function, which is solved deterministically via bracketed bisection.
 */

/**
 * A group of unique payouts with prior masses, belonging to one criteria.
 */
export interface PayoutGroup {
  /**
   * Unique payout multipliers, ascending.
   */
  xs: Float64Array
  /**
   * Prior mass per unique payout (sum of prior weights of all books sharing the payout).
   */
  ms: Float64Array
}

export class InfeasibleError extends Error {
  constructor(
    message: string,
    readonly achievableMin: number,
    readonly achievableMax: number,
    readonly target: number,
  ) {
    super(message)
    this.name = "InfeasibleError"
  }
}

/**
 * Computes the expected payout of a group under the exponential tilt `mu`,
 * using a numerically stable log-sum-exp formulation.
 */
export function tiltedMean(group: PayoutGroup, mu: number): number {
  const { xs, ms } = group
  const n = xs.length

  let maxExp = -Infinity
  for (let i = 0; i < n; i++) {
    const e = Math.log(ms[i]!) - mu * xs[i]!
    if (e > maxExp) maxExp = e
  }

  let sumU = 0
  let sumUx = 0
  for (let i = 0; i < n; i++) {
    const u = Math.exp(Math.log(ms[i]!) - mu * xs[i]! - maxExp)
    sumU += u
    sumUx += u * xs[i]!
  }

  return sumUx / sumU
}

/**
 * Computes the tilted distribution of a group, normalized to sum to `p`.
 */
export function tiltedDistribution(group: PayoutGroup, mu: number, p: number) {
  const { xs, ms } = group
  const n = xs.length
  const out = new Float64Array(n)

  let maxExp = -Infinity
  for (let i = 0; i < n; i++) {
    const e = Math.log(ms[i]!) - mu * xs[i]!
    if (e > maxExp) maxExp = e
  }

  let sumU = 0
  for (let i = 0; i < n; i++) {
    const u = Math.exp(Math.log(ms[i]!) - mu * xs[i]! - maxExp)
    out[i] = u
    sumU += u
  }

  for (let i = 0; i < n; i++) {
    out[i] = (out[i]! / sumU) * p
  }

  return out
}

/**
 * Returns the achievable range of `sum(p_c * E_c(mu))` over all tilts,
 * i.e. `[sum(p_c * min(x_c)), sum(p_c * max(x_c))]`.
 */
export function achievableRange(groups: Array<{ group: PayoutGroup; p: number }>) {
  let min = 0
  let max = 0
  for (const { group, p } of groups) {
    min += p * group.xs[0]!
    max += p * group.xs[group.xs.length - 1]!
  }
  return [min, max] as const
}

/**
 * Finds the tilt `mu` such that the combined expected payout
 * `sum(p_c * tiltedMean(c, mu))` equals `target`.
 *
 * The function is strictly decreasing in `mu` (unless all groups have a single
 * unique payout, in which case it is constant), so a bracketed bisection
 * converges deterministically.
 *
 * @throws {InfeasibleError} if `target` is not achievable.
 */
export function solveTilt(
  groups: Array<{ group: PayoutGroup; p: number }>,
  target: number,
): number {
  const [min, max] = achievableRange(groups)

  const f = (mu: number) => {
    let sum = 0
    for (const { group, p } of groups) {
      sum += p * tiltedMean(group, mu)
    }
    return sum - target
  }

  const span = Math.max(max - min, Math.abs(target), 1)
  const tol = span * 1e-13

  // Constant function (all groups have a single unique payout)
  if (max - min <= span * 1e-15) {
    if (Math.abs(f(0)) <= Math.max(span * 1e-9, 1e-12)) return 0
    throw new InfeasibleError(
      `Target payout sum ${target} is not achievable: all payouts are fixed at a sum of ${min}.`,
      min,
      max,
      target,
    )
  }

  if (target <= min || target >= max) {
    throw new InfeasibleError(
      `Target payout sum ${target} is outside the achievable range (${min}, ${max}).`,
      min,
      max,
      target,
    )
  }

  // Scale of mu: tilts act on exponents of size mu * x, so steps of ~1/xSpread are meaningful
  let xSpread = 0
  for (const { group } of groups) {
    xSpread = Math.max(xSpread, group.xs[group.xs.length - 1]! - group.xs[0]!)
  }
  const step = 1 / xSpread

  // f is decreasing: f(lo) >= 0 >= f(hi)
  let lo = 0
  let hi = 0
  const f0 = f(0)

  if (f0 === 0) return 0

  if (f0 > 0) {
    // Need a larger mu to decrease the mean
    let s = step
    hi = s
    while (f(hi) > 0) {
      s *= 2
      hi = s
      if (!Number.isFinite(hi) || s > step * 2 ** 80) {
        throw new InfeasibleError(
          `Failed to bracket the target payout sum ${target}; it is too close to the achievable bound.`,
          min,
          max,
          target,
        )
      }
    }
    lo = hi / 2 > 0 ? hi / 2 : 0
    if (f(lo) < 0) lo = 0
  } else {
    // Need a smaller (negative) mu to increase the mean
    let s = -step
    lo = s
    while (f(lo) < 0) {
      s *= 2
      lo = s
      if (!Number.isFinite(lo) || -s > step * 2 ** 80) {
        throw new InfeasibleError(
          `Failed to bracket the target payout sum ${target}; it is too close to the achievable bound.`,
          min,
          max,
          target,
        )
      }
    }
    hi = lo / 2 < 0 ? lo / 2 : 0
    if (f(hi) > 0) hi = 0
  }

  // Bisection
  let mu = 0
  for (let i = 0; i < 200; i++) {
    mu = (lo + hi) / 2
    const v = f(mu)
    if (Math.abs(v) <= tol) return mu
    if (v > 0) lo = mu
    else hi = mu
  }

  return mu
}
