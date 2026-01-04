import { CoreAI_ABehavior } from './ABehavior'
import { CoreAI_Brain } from '../../../Brain'
import { CoreAI_BehaviorMode } from '../BehaviorController'

/**
 * MoveToBehavior:
 * - Starts movement in enter()
 * - Runs as long as memory.roamPos exists
 * - Stopped automatically when TTL clears roamPos
 * - Optional target enables AISetTarget during movement
 * - Mode selects on-foot or driver logic (never both)
 *
 * TTL-driven memory replaces durationMs logic.
 */
export class CoreAI_MoveToBehavior extends CoreAI_ABehavior {
    public name = 'moveto'

    private roamPos: mod.Vector
    private readonly speed: mod.MoveSpeed
    private readonly isValidated: boolean

    constructor(
        brain: CoreAI_Brain,
        pos: mod.Vector,
        speed: mod.MoveSpeed = mod.MoveSpeed.Run,
        isValidated: boolean = true
    ) {
        super(brain)
        this.roamPos = pos
        this.speed = speed
        this.isValidated = isValidated
    }

    public getTargetPos(): mod.Vector {
        return this.roamPos
    }

    override enter(): void {
        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) {
            return
        }

        if (
            mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle) &&
            mod.GetPlayerVehicleSeat(player) === 0
        ) {
            this.enterOnDriveMove(player)
            return
        }

        this.enterOnFootMove(player)
    }

    private async enterOnDriveMove(player: mod.Player): Promise<void> {
        const vehicle = mod.GetVehicleFromPlayer(player)

        mod.ForcePlayerExitVehicle(player, vehicle)
        await mod.Wait(0)
        await mod.Wait(0)
        mod.ForcePlayerToSeat(player, vehicle, 0)
        mod.AISetMoveSpeed(player, mod.MoveSpeed.Sprint)
        // mod.AIBattlefieldBehavior(player)
        mod.AIDefendPositionBehavior(player, this.roamPos, 0, 4)
        // mod.AIValidatedMoveToBehavior(player, this.targetPos)
    }

    private enterOnFootMove(player: mod.Player): void {
        mod.AISetMoveSpeed(player, this.speed)
        this.isValidated
            ? mod.AIValidatedMoveToBehavior(player, this.roamPos)
            : mod.AIMoveToBehavior(player, this.roamPos)
    }

    override update(): void {
        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) return

        const memPos = this.brain.memory.get('roamPos')
        if (!memPos) return

        /* 
        // Conflicts with other Scores
        if (!mod.Equals(memPos, this.roamPos)) {
            this.roamPos = memPos
            this.enter()
        } */

        const myPos = mod.GetObjectPosition(player)
        const dist = mod.DistanceBetween(myPos, this.roamPos)

        if (dist < 3) {
            this.brain.memory.set('roamPos', null)
        }
    }

    override exit(): void {
        // No target cleanup here; targeting is managed by the brain.
    }
}
