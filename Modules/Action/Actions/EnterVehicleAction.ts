import { CoreAI_AAction } from '../AAction'
import { CoreAI_TickContext } from '../../../TickContext'

export class CoreAI_EnterVehicleAction extends CoreAI_AAction {
    // private lastEnterTime = 0

    constructor() {
        super(500)
    }

    protected update(ctx: CoreAI_TickContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        if (mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle)) {
            return
        }

        const vehicle = ctx.memory.get('vehicleToDrive')
        if (!vehicle) return

        if (mod.IsVehicleSeatOccupied(vehicle, 0)) {
            return
        }

        const vPos = mod.GetVehicleState(
            vehicle,
            mod.VehicleStateVector.VehiclePosition
        )
        const pPos = mod.GetSoldierState(
            player,
            mod.SoldierStateVector.GetPosition
        )

        const dist = mod.DistanceBetween(pPos, vPos)

        if (dist > 5.0) return

        /* if (ctx.time - this.lastEnterTime < 5000) {
            return
        } */

        mod.DisplayHighlightedWorldLogMessage(mod.Message(222))

        mod.ForcePlayerToSeat(player, vehicle, 0)
        // this.lastEnterTime = ctx.time
    }
}
