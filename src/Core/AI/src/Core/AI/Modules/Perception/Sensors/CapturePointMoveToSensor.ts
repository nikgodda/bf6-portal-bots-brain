import { CoreAI_ASensor } from './ASensor'
import { CoreAI_SensorContext } from './SensorContext'

/**
 * MoveToCapturePointSensor
 *
 * Purpose:
 * - Selects a movement target from a set of capture points.
 * - Chooses only capture points not owned by the player's team.
 *
 * Behavior:
 * - Evaluates distance to all valid capture points.
 * - Keeps the two closest candidates.
 * - Randomly selects between the closest and second-closest target
 *   to reduce AI clustering.
 *
 * Memory:
 * - Writes `roamPos` intent with a TTL.
 * - Does not reselect while a valid `roamPos` intent exists.
 *
 * Notes:
 * - No pathfinding or movement logic (sensor-only).
 * - Selection is distance-based only; higher-level pressure or
 *   role-based logic can be layered later.
 */
export class CoreAI_CapturePointMoveToSensor extends CoreAI_ASensor {
    private readonly ttlMs: number

    constructor(
        private readonly getCapturePoints: () => mod.CapturePoint[],
        intervalMs: number = 750,
        ttlMs: number = 6000
    ) {
        super(intervalMs)
        this.ttlMs = ttlMs
    }

    override reset(): void {}

    protected update(ctx: CoreAI_SensorContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        // Do not reselect while intent exists
        if (ctx.memory.get('roamPos')) return

        const capturePoints = this.getCapturePoints()
        if (!capturePoints || capturePoints.length === 0) return

        // ------------------------------------------------------------
        //
        // ------------------------------------------------------------

        const playerPos = mod.GetObjectPosition(player)

        const playerTeamId = mod.GetObjId(mod.GetTeam(player))

        // store up to two closest
        let closest: { pos: mod.Vector; dist: number } | null = null
        let secondClosest: { pos: mod.Vector; dist: number } | null = null

        for (const cp of capturePoints) {
            const owner = mod.GetCurrentOwnerTeam(cp)

            // exclude CPs already owned by player team
            if (mod.GetObjId(owner) === playerTeamId) {
                continue
            }

            const cpPos = mod.GetObjectPosition(cp)
            const dist = mod.DistanceBetween(playerPos, cpPos)

            if (!closest || dist < closest.dist) {
                secondClosest = closest
                closest = { pos: cpPos, dist }
            } else if (!secondClosest || dist < secondClosest.dist) {
                secondClosest = { pos: cpPos, dist }
            }
        }

        if (!closest) {
            return
        }

        // only one candidate
        if (!secondClosest) {
            ctx.memory.set('roamPos', closest.pos, this.ttlMs)
            return
        }

        // ------------------------------------------------------------
        // Commit
        // ------------------------------------------------------------

        ctx.memory.set(
            'roamPos',
            Math.random() < 1 ? closest.pos : secondClosest.pos,
            this.ttlMs
        )
    }
}
