import { CoreAI_ASensor } from './ASensor'
import { CoreAI_SensorContext } from './SensorContext'

/**
 * VehicleToDriveSensor:
 * Finds the closest vehicle with a free driver seat within radius.
 *
 * Writes:
 * - memory.vehicleToDrive
 */
export class CoreAI_VehicleToDriveSensor extends CoreAI_ASensor {
    constructor(
        private readonly radius: number = 30,
        intervalMs: number = 1000,
        private readonly ttlMs: number = 3000
    ) {
        super(intervalMs)
    }

    protected update(ctx: CoreAI_SensorContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return
        if (mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle)) {
            ctx.memory.set('vehicleToDrive', null)
            return
        }

        const myPos = mod.GetObjectPosition(player)

        const vehicles = mod.AllVehicles()
        const count = mod.CountOf(vehicles)

        let closest: mod.Vehicle | null = null
        let closestDist = Infinity

        for (let i = 0; i < count; i++) {
            const v = mod.ValueInArray(vehicles, i) as mod.Vehicle

            if (mod.IsVehicleSeatOccupied(v, 0)) {
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
            }
        }

        if (closest) {
            ctx.memory.set('vehicleToDrive', closest, this.ttlMs)
        } else {
            ctx.memory.set('vehicleToDrive', null)
        }
    }
}
