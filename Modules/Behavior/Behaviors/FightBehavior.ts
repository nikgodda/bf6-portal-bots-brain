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

    private readonly mode: CoreAI_BehaviorMode

    constructor(brain: CoreAI_Brain, mode: CoreAI_BehaviorMode = 'onFoot') {
        super(brain)
        this.mode = mode
    }

    override async enter(): Promise<void> {
        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) {
            return
        }

        if (this.mode === 'onDrive') {
            const vehicle = mod.GetVehicleFromPlayer(player)
            if (!vehicle) return

            mod.ForcePlayerExitVehicle(player, vehicle)
            await mod.Wait(0)
            await mod.Wait(0)
            mod.ForcePlayerToSeat(player, vehicle, 0)

            /* mod.AIDefendPositionBehavior(
                player,
                mod.GetSoldierState(player, mod.SoldierStateVector.GetPosition),
                0,
                10
            ) */
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
