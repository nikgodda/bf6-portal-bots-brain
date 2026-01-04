import { CoreAI_ABehavior } from './ABehavior'
import { CoreAI_Brain } from '../../../Brain'

/**
 * EnterVehicleBehavior:
 * Attempts to enter a specific vehicle seat when close enough.
 */
export class CoreAI_EnterVehicleBehavior extends CoreAI_ABehavior {
    public name = 'entervehicle'

    private readonly vehicle: mod.Vehicle
    private readonly seatIndex: number
    private readonly enterDist: number

    constructor(
        brain: CoreAI_Brain,
        vehicle: mod.Vehicle,
        seatIndex: number = 0,
        enterDist: number = 3.0
    ) {
        super(brain)
        this.vehicle = vehicle
        this.seatIndex = seatIndex
        this.enterDist = enterDist
        this.intervalMs = 500
    }

    override enter(): void {
        // this.tryEnter()
        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) return

        if (mod.IsVehicleSeatOccupied(this.vehicle, 0)) {
            return
        }

        mod.ForcePlayerToSeat(player, this.vehicle, this.seatIndex)

        this.brain.memory.set('vehicleToDrive', null)
    }

    override update(): void {
        // this.tryEnter()
    }

    private tryEnter(): void {
        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) return
        if (!this.vehicle) {
            this.brain.memory.set('vehicleToDrive', null)
            return
        }

        if (mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle)) {
            this.brain.memory.set('vehicleToDrive', null)
            return
        }

        const vPos = mod.GetVehicleState(
            this.vehicle,
            mod.VehicleStateVector.VehiclePosition
        )
        const dist = mod.DistanceBetween(mod.GetObjectPosition(player), vPos)
        if (dist > this.enterDist) {
            return
        }

        const occupant = mod.GetPlayerFromVehicleSeat(
            this.vehicle,
            this.seatIndex
        )
        if (mod.IsPlayerValid(occupant)) {
            this.brain.memory.set('vehicleToDrive', null)
            return
        }

        mod.ForcePlayerToSeat(player, this.vehicle, this.seatIndex)
    }
}
