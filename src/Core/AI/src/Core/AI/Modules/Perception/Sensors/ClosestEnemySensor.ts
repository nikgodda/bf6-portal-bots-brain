import { CoreAI_ASensor } from './ASensor'
import { CoreAI_SensorContext } from './SensorContext'

/**
 * ClosestEnemySensor:
 * Detects the closest visible enemy and writes raw data into memory.
 *
 * Writes:
 * - memory.closestEnemy
 * - memory.roamPos
 *
 * Notes:
 * - No POIs are created.
 * - No behaviors are spawned.
 * - TaskSelector evaluates this memory to decide behavior.
 */
export class CoreAI_ClosestEnemySensor extends CoreAI_ASensor {
    constructor(
        private readonly sensitivity: number = 1,
        intervalMs: number = 2000,
        private readonly ttlMs: number = 8000 // parametric TTL
    ) {
        super(intervalMs)
    }

    protected update(ctx: CoreAI_SensorContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        const myPos = mod.GetObjectPosition(player)

        // Determine enemy team
        const myTeam = mod.GetObjId(mod.GetTeam(player))
        const enemyTeamId = myTeam === 1 ? 2 : 1
        const enemyTeamObj = mod.GetTeam(enemyTeamId)

        // Find closest visible enemy
        const newEnemy = mod.ClosestPlayerTo(myPos, enemyTeamObj)
        if (!mod.IsPlayerValid(newEnemy)) {
            // Clear enemy memory (TTL = immediate)
            ctx.memory.set('closestEnemy', null)
            // ctx.memory.set('roamPos', null)
            return
        }

        // Same enemy -> nothing to update
        if (ctx.memory.get('closestEnemy') === newEnemy) {
            return
        }

        // Probabilistic detection
        const enemyPos = mod.GetObjectPosition(newEnemy)

        const dist = mod.DistanceBetween(myPos, enemyPos)
        const prob = Math.exp(-0.12 * dist * (1.0 / this.sensitivity))
        if (Math.random() > prob) return

        // Write memory with TTL
        ctx.memory.set('closestEnemy', newEnemy, this.ttlMs)
    }
}
