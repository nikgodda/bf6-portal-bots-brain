import { CoreAI_ASensor } from './ASensor'
import { CoreAI_TickContext } from '../../../TickContext'

/**
 * VehicleToDriveSensor:
 * Finds the closest vehicle with a free driver seat within radius.
 *
 * Writes:
 * - memory.vehicleToDrive
 */
export class CoreAI_CapturePointSensor extends CoreAI_ASensor {
    constructor(
        // private readonly radius: number = 30,
        intervalMs: number = 1000,
        private readonly ttlMs: number = 3000
    ) {
        super(intervalMs)
    }

    protected update(ctx: CoreAI_TickContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        const capturePoints = mod.AllCapturePoints()
        const count = mod.CountOf(capturePoints)

        let closest: mod.CapturePoint | null = null
        let closestDist = Infinity

        for (let i = 0; i < count; i++) {
            const cp = mod.ValueInArray(capturePoints, i) as mod.CapturePoint

            // console.log(mod.GetObjId(cp))
            // console.log(mod.GetCapturePoint(mod.GetObjId(cp)))

            /* const pos = mod.GetObjectPosition(cp)
            console.log(
                mod.XComponentOf(pos),
                ' ',
                mod.YComponentOf(pos),
                ' ',
                mod.ZComponentOf(pos),
                ' '
            ) */

            /* if (mod.IsVehicleSeatOccupied(v, 0)) {
                continue
            }

            const vPos = mod.GetVehicleState(
                v,
                mod.VehicleStateVector.VehiclePosition
            )
            const dist = mod.DistanceBetween(myPos, vPos)
            if (dist > this.radius) continue

            if (dist < closestDist) {
                closestDist = dist
                closest = v
            } */
        }

        if (closest) {
            ctx.memory.set('capturePoint', closest, this.ttlMs)
        } else {
            ctx.memory.set('capturePoint', null)
        }
    }
}



