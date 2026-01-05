import { CoreAI_ABehavior } from './ABehavior'
import { CoreAI_Brain } from '../../../Brain'
import { CoreAI_BehaviorMode } from '../BehaviorController'

/**
 * FightBehavior:
 * Activated when the threat is high enough for combat.
 *
 * Engine handles all dynamic combat: aiming, targeting, firing, strafing, cover.
 * This behavior does not end by itself; TaskSelector decides when to exit.
 */
export class CoreAI_FightBehavior extends CoreAI_ABehavior {
    public name = 'fight'

    constructor(brain: CoreAI_Brain, mode: CoreAI_BehaviorMode = 'onFoot') {
        super(brain)
    }

    override async enter(): Promise<void> {
        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) {
            return
        }

        if (
            mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle) &&
            mod.GetPlayerVehicleSeat(player) === 0
        ) {
            const vehicle = mod.GetVehicleFromPlayer(player)
            if (!vehicle) return

            mod.ForcePlayerExitVehicle(player, vehicle)
            await mod.Wait(0)
            await mod.Wait(0)
            mod.ForcePlayerToSeat(player, vehicle, 0)
            
            mod.AIBattlefieldBehavior(player)
            return
        }

        mod.AIBattlefieldBehavior(player)
    }

    override update(): void {
        // Engine handles combat; nothing to update
    }

    override exit(): void {
        // No cleanup required for fight mode in this architecture
    }
}
