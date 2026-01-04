import { CoreAI_ASensor } from './ASensor'
import { CoreAI_SensorContext } from './SensorContext'

/**
 * ArrivalSensor:
 *
 * Detects when AI arrives inside ONE OR MORE special semantic points:
 * - defend positions
 * - objective markers
 * - interact zones
 * - rally points
 *
 * This DOES NOT handle MoveTo arrival.
 * MoveToSensor handles movement arrival internally.
 *
 * This sensor is for high-level AI logic only.
 */
export class CoreAI_ArrivalSensor extends CoreAI_ASensor {
    private lastTriggerTime = 0

    constructor(
        private readonly getPoints: () => mod.Vector[],
        intervalMs: number = 500,
        private readonly distanceThreshold: number = 3.0, // arrival radius
        private readonly ttl: number = 2000, // arrival memory duration
        private readonly cooldownMs: number = 4000 // prevent spam-triggering
    ) {
        super(intervalMs)
    }

    protected update(ctx: CoreAI_SensorContext): void {
        const memory = ctx.memory
        const player = ctx.player

        if (!mod.IsPlayerValid(player)) return

        const now = ctx.time
        const myPos = mod.GetObjectPosition(player)

        const points = this.getPoints()
        if (!points || points.length === 0) return

        // ------------------------------------------------------------
        // Cooldown - do not retrigger too frequently
        // ------------------------------------------------------------
        if (this.lastTriggerTime > 0) {
            if (now - this.lastTriggerTime < this.cooldownMs) {
                return
            }
        }

        // ------------------------------------------------------------
        // Only detect new arrival if arrival memory expired
        // ------------------------------------------------------------
        if (memory.get('arrivedPos')) {
            return
        }

        // ------------------------------------------------------------
        // MAIN ARRIVAL CHECK
        // ------------------------------------------------------------
        for (const p of points) {
            const dist = mod.DistanceBetween(myPos, p)

            if (dist <= this.distanceThreshold) {
                // AI arrived to a special semantic point
                memory.set('arrivedPos', p, this.ttl)
                this.lastTriggerTime = now
                return
            }
        }
    }
}
