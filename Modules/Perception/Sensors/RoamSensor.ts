import { CoreAI_ASensor } from './ASensor'
import { CoreAI_TickContext } from '../../../TickContext'

/**
 * RoamSensor:
 * Picks a movement target from a list of points.
 *
 * Design:
 * - Direction-driven, no historical recents.
 * - While moving, backward targets are forbidden.
 * - Velocity is preferred when speed > threshold.
 * - Intent direction stabilizes steering across replans.
 */
export class CoreAI_RoamSensor extends CoreAI_ASensor {
    private readonly ttlMs: number

    private coldStart: boolean = true

    // Cached movement intent direction
    private lastIntentDir: mod.Vector | null = null

    constructor(
        private readonly getPoints: () => mod.Vector[],
        intervalMs: number = 750,
        ttlMs: number = 2000
    ) {
        super(intervalMs)
        this.ttlMs = ttlMs
    }

    override reset(): void {
        this.coldStart = true
        this.lastIntentDir = null
    }

    protected update(ctx: CoreAI_TickContext): void {
        // Do not reselect while intent exists
        if (ctx.memory.get('roamPos')) {
            return
        }

        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        const points = this.getPoints()
        if (!points || points.length === 0) return

        const myPos = mod.GetObjectPosition(player)

        // ------------------------------------------------------------
        // Resolve forward direction
        // ------------------------------------------------------------

        const speed = mod.GetSoldierState(player, mod.SoldierStateNumber.Speed)

        let forward: mod.Vector | null = null

        // 1. True movement direction
        if (speed > 0.3) {
            const vel = mod.GetSoldierState(
                player,
                mod.SoldierStateVector.GetLinearVelocity
            )
            const lenSq = mod.DotProduct(vel, vel)

            if (lenSq > 0.1) {
                forward = mod.Normalize(vel)
                this.lastIntentDir = forward
            }
        }

        // 2. Cached intent
        if (!forward && this.lastIntentDir) {
            forward = this.lastIntentDir
        }

        // 3. Facing fallback
        if (!forward) {
            const face = mod.GetSoldierState(
                player,
                mod.SoldierStateVector.GetFacingDirection
            )
            forward = mod.Normalize(face)
            this.lastIntentDir = forward
        }

        // ------------------------------------------------------------
        // Build candidates
        // ------------------------------------------------------------

        const candidates: {
            pos: mod.Vector
            dist: number
            dot: number
        }[] = []

        const ARRIVAL_EXCLUDE_DIST = 3.0

        for (const pos of points) {
            const dist = mod.DistanceBetween(myPos, pos)

            // Already here, do not reselect
            if (dist < ARRIVAL_EXCLUDE_DIST) {
                continue
            }

            const dir = mod.DirectionTowards(myPos, pos)
            const dot = mod.DotProduct(forward, dir)

            candidates.push({ pos, dist, dot })
        }

        if (candidates.length === 0) return

        // ------------------------------------------------------------
        // While moving, forbid backward choices
        // ------------------------------------------------------------

        let usable = candidates

        if (speed > 0.5) {
            usable = candidates.filter((c) => c.dot > 0)
        }

        if (usable.length === 0) return

        // ------------------------------------------------------------
        // Pick best candidate
        // ------------------------------------------------------------

        let best = usable[0]
        let bestScore = -Infinity

        for (const c of usable) {
            const score = this.scoreCandidate(c)
            if (score > bestScore) {
                bestScore = score
                best = c
            }
        }

        // ------------------------------------------------------------
        // Commit
        // ------------------------------------------------------------

        ctx.memory.set('roamPos', best.pos, this.ttlMs)
        this.lastIntentDir = mod.DirectionTowards(myPos, best.pos)
        this.coldStart = false
    }

    private scoreCandidate(c: {
        pos: mod.Vector
        dist: number
        dot: number
    }): number {
        // Distance band scoring
        let distScore = 0
        if (c.dist <= 15) {
            distScore = c.dist / 15
        } else if (c.dist <= 40) {
            distScore = 1
        } else {
            const over = c.dist - 40
            distScore = over >= 20 ? 0 : 1 - over / 20
        }

        const dirScore = Math.max(0, c.dot)

        const jitterMax = this.coldStart ? 0.8 : 0.4
        const jitter = Math.random() * jitterMax

        return distScore * 0.7 + dirScore * 0.3 + jitter
    }
}
