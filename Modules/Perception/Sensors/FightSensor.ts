import { CoreAI_ASensor } from './ASensor'
import { CoreAI_TickContext } from '../../../TickContext'

/**
 * FightSensor:
 * Detects combat by raycasting toward nearby enemies.
 *
 * Writes:
 * - memory.isInBattle (TTL-based boolean)
 *
 * Notes:
 * - OnRayCastHit is used to confirm nearby enemy presence.
 * - No POIs.
 * - No behaviors spawned.
 * - TaskSelector checks memory.isInBattle to understand combat state.
 */
export class CoreAI_FightSensor extends CoreAI_ASensor {
    /* private targetWI: mod.WorldIcon
    private startWI: mod.WorldIcon
    private hitWI: mod.WorldIcon
    private hitClosestEnemyWI: mod.WorldIcon */

    private VEHICLE_OFFSET = 5.1

    constructor(
        intervalMs: number = 500,
        private readonly ttlMs: number = 10000
    ) {
        super(intervalMs)

        /* this.targetWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.targetWI, mod.GetTeam(1))
        mod.SetWorldIconImage(this.targetWI, mod.WorldIconImages.Skull)
        mod.SetWorldIconColor(this.targetWI, CoreUI_Colors.RedDark)

        this.startWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.startWI, mod.GetTeam(1))
        mod.SetWorldIconImage(this.startWI, mod.WorldIconImages.Cross)
        mod.SetWorldIconColor(this.startWI, CoreUI_Colors.RedDark)

        this.hitWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.hitWI, mod.GetTeam(1))
        mod.SetWorldIconImage(this.hitWI, mod.WorldIconImages.Eye)
        mod.SetWorldIconColor(this.hitWI, CoreUI_Colors.GreenDark)

        this.hitClosestEnemyWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.hitClosestEnemyWI, mod.GetTeam(1))
        mod.SetWorldIconImage(this.hitClosestEnemyWI, mod.WorldIconImages.Alert)
        mod.SetWorldIconColor(this.hitClosestEnemyWI, CoreUI_Colors.BlueDark) */
    }

    protected update(ctx: CoreAI_TickContext): void {
        if (ctx.memory.get('isInBattle')) {
            return
        }

        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        const isFiring = mod.GetSoldierState(
            player,
            mod.SoldierStateBool.IsFiring
        )
        if (isFiring) {
            ctx.memory.set('isInBattle', true, this.ttlMs)
            return
        }

        if (
            !mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle) ||
            mod.GetPlayerVehicleSeat(player) !== 0
        ) {
            /* mod.EnableWorldIconImage(this.targetWI, false)
            mod.EnableWorldIconImage(this.startWI, false)
            mod.EnableWorldIconImage(this.hitWI, false)
            mod.EnableWorldIconImage(this.hitClosestEnemyWI, false) */
            return
        }

        const myTeamId = mod.GetObjId(mod.GetTeam(player))

        const playerVehiclePos = mod.GetVehicleState(
            mod.GetVehicleFromPlayer(player),
            mod.VehicleStateVector.VehiclePosition
        )

        const startInitPos = mod.CreateVector(
            mod.XComponentOf(playerVehiclePos),
            mod.YComponentOf(playerVehiclePos) + 1,
            mod.ZComponentOf(playerVehiclePos)
        )

        const allPlayers = mod.AllPlayers()
        const count = mod.CountOf(allPlayers)

        for (let i = 0; i < count; i++) {
            const p = mod.ValueInArray(allPlayers, i) as mod.Player
            if (!mod.IsPlayerValid(p)) continue

            if (mod.GetObjId(mod.GetTeam(p)) === myTeamId) continue

            if (!mod.GetSoldierState(p, mod.SoldierStateBool.IsAlive)) continue

            let targetPos = mod.GetSoldierState(
                p,
                mod.SoldierStateVector.EyePosition
            )

            if (mod.GetSoldierState(p, mod.SoldierStateBool.IsInVehicle)) {
                const vehicle = mod.GetVehicleFromPlayer(p)

                const enemyVehiclePos = mod.GetVehicleState(
                    vehicle,
                    mod.VehicleStateVector.VehiclePosition
                )

                targetPos = mod.CreateVector(
                    mod.XComponentOf(enemyVehiclePos),
                    mod.YComponentOf(enemyVehiclePos) + 1,
                    mod.ZComponentOf(enemyVehiclePos)
                )
            }

            const dir = mod.DirectionTowards(startInitPos, targetPos)
            const startPos = mod.Add(
                startInitPos,
                mod.Multiply(dir, this.VEHICLE_OFFSET)
            )

            mod.RayCast(player, startPos, targetPos)

            /**
             *
             */
            /* mod.EnableWorldIconImage(this.startWI, true)
            mod.SetWorldIconPosition(this.startWI, startPos)

            mod.EnableWorldIconImage(this.targetWI, true)
            mod.SetWorldIconPosition(this.targetWI, targetPos) */
        }
    }

    override OnRayCastHit?(
        ctx: CoreAI_TickContext,
        eventPoint: mod.Vector,
        eventNormal: mod.Vector
    ): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        /**
         *
         */
        /* mod.EnableWorldIconImage(this.hitWI, true)
        mod.SetWorldIconPosition(this.hitWI, eventPoint) */

        const myTeamId = mod.GetObjId(mod.GetTeam(player))
        const enemyTeamId = mod.GetTeam(myTeamId === 1 ? 2 : 1)

        const enemy = mod.ClosestPlayerTo(eventPoint, enemyTeamId)

        if (!mod.IsPlayerValid(enemy)) return

        let enemyPos = mod.GetSoldierState(
            enemy,
            mod.SoldierStateVector.EyePosition
        )

        let maxHitDist = 0.4

        if (mod.GetSoldierState(enemy, mod.SoldierStateBool.IsInVehicle)) {
            maxHitDist = this.VEHICLE_OFFSET

            const ep = mod.GetSoldierState(
                enemy,
                mod.SoldierStateVector.GetPosition
            )
            enemyPos = mod.CreateVector(
                mod.XComponentOf(ep),
                mod.YComponentOf(ep) + 1,
                mod.ZComponentOf(ep)
            )
        }

        // mod.SetWorldIconPosition(this.hitClosestEnemyWI, enemyPos)
        // mod.EnableWorldIconImage(this.hitClosestEnemyWI, true)

        const hitDist = mod.DistanceBetween(eventPoint, enemyPos)

        // mod.DisplayHighlightedWorldLogMessage(mod.Message(hitDist))

        if (hitDist > maxHitDist) return

        ctx.memory.set('isInBattle', true, this.ttlMs)
    }

    override OnPlayerDamaged?(
        ctx: CoreAI_TickContext,
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {
        ctx.memory.set('isInBattle', true, this.ttlMs)
    }
}
