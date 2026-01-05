import { CoreAI_TickContext } from '../../TickContext'
import { CoreAI_MemoryFields } from '../Memory/MemoryManager'

export type CoreAI_KeyedBehaviorKind = 'battlefield' | 'defend' | 'moveto'

export interface CoreAI_KeyedBehaviorProfile {
    weights: Partial<Record<keyof CoreAI_MemoryFields, number>>
}

/**
 * CoreAI_BehaviorSelector
 *
 * Minimal selector:
 * - Find the highest-weight memory key that is currently set.
 * - Run the engine behavior mapped to that key.
 *
 * Notes:
 * - No behavior instances or TaskSelector.
 * - It just picks one engine behavior per tick.
 * - Avoids restarts unless the behavior or target changes.
 */
export class CoreAI_BehaviorSelector {
    private static readonly POS_EPSILON = 0.5
    private cfg: CoreAI_KeyedBehaviorProfile
    private current: CoreAI_KeyedBehaviorKind | null = null
    private lastMoveToPos: mod.Vector | null = null
    private lastDefendPos: mod.Vector | null = null

    constructor(profile: CoreAI_KeyedBehaviorProfile) {
        this.cfg = profile
    }

    /**
     * Update the weight table without resetting runtime state.
     */
    setWeights(weights: CoreAI_KeyedBehaviorProfile['weights']): void {
        this.cfg = { weights }
    }

    /**
     * Select and apply the active engine behavior for this tick.
     */
    async update(ctx: CoreAI_TickContext): Promise<void> {
        const winner = this.getWinnerKey(ctx)
        if (!winner) return

        const behavior = this.getBehaviorForKey(winner)
        if (!behavior) return

        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        switch (behavior) {
            case 'battlefield': {
                if (this.current === 'battlefield') {
                    return
                }

                mod.AIBattlefieldBehavior(player)
                
                this.current = behavior
                this.lastMoveToPos = null
                this.lastDefendPos = null
                return
            }

            case 'defend': {
                const pos = this.resolveTargetPos(ctx, winner)
                if (!pos) return

                if (
                    this.current === 'defend' &&
                    this.lastDefendPos &&
                    mod.DistanceBetween(this.lastDefendPos, pos) <=
                        CoreAI_BehaviorSelector.POS_EPSILON
                ) {
                    return
                }

                mod.AIDefendPositionBehavior(player, pos, 2.0, 8.0)

                this.current = behavior
                this.lastDefendPos = pos
                this.lastMoveToPos = null
                return
            }

            case 'moveto': {
                const pos = this.resolveTargetPos(ctx, winner)
                if (!pos) return

                if (
                    this.current === 'moveto' &&
                    this.lastMoveToPos &&
                    mod.DistanceBetween(this.lastMoveToPos, pos) <=
                        CoreAI_BehaviorSelector.POS_EPSILON
                ) {
                    return
                }

                if (
                    mod.GetSoldierState(
                        player,
                        mod.SoldierStateBool.IsInVehicle
                    ) &&
                    mod.GetPlayerVehicleSeat(player) === 0
                ) {
                    const vehicle = mod.GetVehicleFromPlayer(player)
                    mod.ForcePlayerExitVehicle(player, vehicle)
                    await mod.Wait(0)
                    await mod.Wait(0)
                    mod.ForcePlayerToSeat(player, vehicle, 0)

                    mod.AIDefendPositionBehavior(player, pos, 10, 20)
                } else {
                    if (winner === 'vehicleToDrive') {
                        mod.AIMoveToBehavior(player, pos)
                    } else {
                        mod.AIValidatedMoveToBehavior(player, pos)
                    }
                }

                this.current = behavior
                this.lastMoveToPos = pos
                this.lastDefendPos = null
                return
            }
        }
    }

    /**
     * Pick the highest-weight memory key that is currently set.
     */
    private getWinnerKey(
        ctx: CoreAI_TickContext
    ): keyof CoreAI_MemoryFields | null {
        let bestKey: keyof CoreAI_MemoryFields | null = null
        let bestScore = -Infinity

        for (const key of Object.keys(this.cfg.weights) as Array<
            keyof CoreAI_MemoryFields
        >) {
            if (!ctx.memory.has(key)) continue

            const score = this.cfg.weights[key] ?? 0
            if (score > bestScore) {
                bestScore = score
                bestKey = key
            }
        }

        return bestKey
    }

    /**
     * Map memory keys to engine behaviors.
     */
    private getBehaviorForKey(
        key: keyof CoreAI_MemoryFields
    ): CoreAI_KeyedBehaviorKind | null {
        switch (key) {
            case 'isInBattle':
                return 'battlefield'

            case 'arrivedPos':
                return 'defend'

            case 'closestEnemy':
            case 'vehicleToDrive':
            case 'roamPos':
            case 'capturePoint':
                return 'moveto'

            default:
                return null
        }
    }

    /**
     * Resolve a target position for moveto/defend behavior.
     */
    private resolveTargetPos(
        ctx: CoreAI_TickContext,
        key: keyof CoreAI_MemoryFields
    ): mod.Vector | null {
        switch (key) {
            case 'closestEnemy': {
                const enemy = ctx.memory.get('closestEnemy')
                if (!enemy) return null

                return mod.GetSoldierState(
                    enemy,
                    mod.SoldierStateVector.GetPosition
                )
            }

            case 'vehicleToDrive': {
                const vehicle = ctx.memory.get('vehicleToDrive')
                if (!vehicle) return null

                return mod.GetVehicleState(
                    vehicle,
                    mod.VehicleStateVector.VehiclePosition
                )
            }

            case 'roamPos':
                return ctx.memory.get('roamPos')

            case 'arrivedPos':
                return ctx.memory.get('arrivedPos')

            case 'capturePoint': {
                const cp = ctx.memory.get('capturePoint')
                if (!cp) return null

                return mod.GetObjectPosition(cp)
            }

            default:
                return null
        }
    }

    /**
     * Expose the current engine behavior label (for debug/UI).
     */
    getCurrent(): CoreAI_KeyedBehaviorKind | null {
        return this.current
    }
}
