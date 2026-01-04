import { CorePlayer_APlayer } from './APlayer'
import { CorePlayer_LogicalAIComponent as CorePlayer_LogicalAIComponent } from './Components/AI/LogicalAIComponent'

/**
 * CorePlayer_APlayerManager
 *
 * Manages the lifecycle and mapping of logical players (APlayer).
 * Converts raw engine mod.Player events into logical high-level events.
 *
 * Flow:
 *   Engine Event -> GameMode._internal -> PlayerManager -> APlayer.emit
 *
 * Notes:
 * - APlayer represents any logical player (human or AI).
 * - AI-specific data is stored via AIComponent attached to APlayer.
 * - NPCs that are not Logical Players are NOT handled here.
 */

type CorePlayer_PlayerCtor<T extends CorePlayer_APlayer = CorePlayer_APlayer> =
    new (player: mod.Player) => T

export class CorePlayer_APlayerManager<
    TPlayer extends CorePlayer_APlayer = CorePlayer_APlayer
> {
    protected players = new Map<number, TPlayer>()
    private readonly PlayerClass: CorePlayer_PlayerCtor<TPlayer>

    constructor(PlayerClass: CorePlayer_PlayerCtor<TPlayer>) {
        this.PlayerClass = PlayerClass
    }

    protected createPlayer(player: mod.Player): TPlayer {
        return new this.PlayerClass(player)
    }

    /* ------------------------------------------------------------
     *
     * ------------------------------------------------------------ */

    notifyGameModeOnLogicalPlayerJoin?: (lp: CorePlayer_APlayer) => void

    /* ------------------------------------------------------------
     * Player registration
     * ------------------------------------------------------------ */

    public async OnPlayerJoinGame(player: mod.Player): Promise<void> {
        // Ignore AI soldiers here.
        // Logical AI is handled in OnSpawnerSpawned.
        if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
            return
        }

        const lp = this.get(player)
        if (lp) {
            return // already logical
        }

        // Human player has team 0 on join. We wait till team init. After we can change team if need
        await mod.Wait(2)

        const logicalPlayer = this.createPlayer(player)
        this.players.set(mod.GetObjId(player), logicalPlayer)

        // Notify GameMode + observers
        this.notifyGameModeOnLogicalPlayerJoin?.(logicalPlayer)
    }

    removePlayer(playerId: number): void {
        const lp = this.players.get(playerId)
        if (lp) {
            lp.clearListeners()
        }
        this.players.delete(playerId)
    }

    /* ------------------------------------------------------------
     * Lookup helpers
     * ------------------------------------------------------------ */

    get(player: mod.Player): TPlayer | undefined {
        if (!mod.IsPlayerValid(player)) return undefined
        return this.players.get(mod.GetObjId(player))
    }

    getById(id: number): TPlayer | undefined {
        return this.players.get(id)
    }

    allPlayers(): TPlayer[] {
        return [...this.players.values()]
    }

    /* ------------------------------------------------------------
     * Ongoing
     * ------------------------------------------------------------ */

    tick(eventPlayer: mod.Player): void {
        const lp = this.get(eventPlayer)
        lp?.emit('OngoingPlayer')
    }

    /* ------------------------------------------------------------
     * Lifecycle events
     * ------------------------------------------------------------ */

    OnPlayerDeployed(lp: TPlayer): void {
        lp.emit('OnPlayerDeployed')
    }

    OnPlayerDied(
        lp: TPlayer,
        other: TPlayer | undefined,
        deathType: mod.DeathType,
        weapon: mod.WeaponUnlock
    ): void {
        lp.emit('OnPlayerDied', other, deathType, weapon)
    }

    OnPlayerUndeploy(lp: TPlayer): void {
        lp.emit('OnPlayerUndeploy')
    }

    /* ------------------------------------------------------------
     * Combat events
     * ------------------------------------------------------------ */

    OnPlayerDamaged(
        lp: TPlayer,
        other: TPlayer | undefined,
        damageType: mod.DamageType,
        weapon: mod.WeaponUnlock
    ): void {
        lp.emit('OnPlayerDamaged', other, damageType, weapon)
    }

    OnPlayerEarnedKill(
        lp: TPlayer,
        other: TPlayer | undefined,
        deathType: mod.DeathType,
        weapon: mod.WeaponUnlock
    ): void {
        lp.emit('OnPlayerEarnedKill', other, deathType, weapon)
    }

    OnPlayerEarnedKillAssist(lp: TPlayer, other: TPlayer | undefined): void {
        lp.emit('OnPlayerEarnedKillAssist', other)
    }

    OnMandown(lp: TPlayer, other: TPlayer | undefined): void {
        lp.emit('OnMandown', other)
    }

    OnRevived(lp: TPlayer, other: TPlayer | undefined): void {
        lp.emit('OnRevived', other)
    }

    /* ------------------------------------------------------------
     * Interaction events
     * ------------------------------------------------------------ */

    OnPlayerInteract(lp: TPlayer, interact: mod.InteractPoint): void {
        lp.emit('OnPlayerInteract', interact)
    }

    OnPlayerEnterAreaTrigger(lp: TPlayer, trigger: mod.AreaTrigger): void {
        lp.emit('OnPlayerEnterAreaTrigger', trigger)
    }

    OnPlayerExitAreaTrigger(lp: TPlayer, trigger: mod.AreaTrigger): void {
        lp.emit('OnPlayerExitAreaTrigger', trigger)
    }

    OnPlayerEnterCapturePoint(lp: TPlayer, cp: mod.CapturePoint): void {
        lp.emit('OnPlayerEnterCapturePoint', cp)
    }

    OnPlayerExitCapturePoint(lp: TPlayer, cp: mod.CapturePoint): void {
        lp.emit('OnPlayerExitCapturePoint', cp)
    }

    /* ------------------------------------------------------------
     * Vehicle events
     * ------------------------------------------------------------ */

    OnPlayerEnterVehicle(lp: TPlayer, veh: mod.Vehicle): void {
        lp.emit('OnPlayerEnterVehicle', veh)
    }

    OnPlayerExitVehicle(lp: TPlayer, veh: mod.Vehicle): void {
        lp.emit('OnPlayerExitVehicle', veh)
    }

    OnPlayerEnterVehicleSeat(
        lp: TPlayer,
        vehicle: mod.Vehicle,
        seat: mod.Object
    ): void {
        lp.emit('OnPlayerEnterVehicleSeat', vehicle, seat)
    }

    OnPlayerExitVehicleSeat(
        lp: TPlayer,
        vehicle: mod.Vehicle,
        seat: mod.Object
    ): void {
        lp.emit('OnPlayerExitVehicleSeat', vehicle, seat)
    }

    /* ------------------------------------------------------------
     * UI / Team
     * ------------------------------------------------------------ */

    OnPlayerSwitchTeam(lp: TPlayer, team: mod.Team): void {
        lp.emit('OnPlayerSwitchTeam', team)
    }

    OnPlayerUIButtonEvent(
        lp: TPlayer,
        widget: mod.UIWidget,
        evt: mod.UIButtonEvent
    ): void {
        lp.emit('OnPlayerUIButtonEvent', widget, evt)
    }

    /* ------------------------------------------------------------
     * Raycast
     * ------------------------------------------------------------ */

    OnRayCastHit(lp: TPlayer, point: mod.Vector, normal: mod.Vector): void {
        lp.emit('OnRayCastHit', point, normal)
    }

    OnRayCastMissed(lp: TPlayer): void {
        lp.emit('OnRayCastMissed')
    }

    /* ------------------------------------------------------------
     * AI Spawner Respawn System
     * ------------------------------------------------------------ */

    private spawnerMap = new Map<
        number,
        {
            lp?: TPlayer
            teamId: number
            soldierClass: mod.SoldierClass
            displayName: mod.Message
        }
    >()

    public OnSpawnerSpawned(
        eventPlayer: mod.Player,
        eventSpawner: mod.Spawner
    ): void {
        const spawnerId = mod.GetObjId(eventSpawner)
        const entry = this.spawnerMap.get(spawnerId)

        if (!entry) {
            return
        }

        let lp = entry.lp

        if (!lp) {
            // First spawn -> create LP
            lp = this.createPlayer(eventPlayer)

            // Attach AI identity
            lp.addComponent(
                new CorePlayer_LogicalAIComponent(
                    entry.soldierClass,
                    entry.displayName,
                    eventSpawner
                )
            )

            this.players.set(mod.GetObjId(eventPlayer), lp)

            this.notifyGameModeOnLogicalPlayerJoin?.(lp)
        } else {
            // Respawn -> rebind LP
            this.removeMappingFor(lp)
            lp.rebindTo(eventPlayer)
            this.players.set(mod.GetObjId(eventPlayer), lp)
        }

        this.spawnerMap.delete(spawnerId)
    }

    private removeMappingFor(lp: TPlayer): void {
        for (const [soldierId, mapped] of this.players.entries()) {
            if (mapped.id === lp.id) {
                this.players.delete(soldierId)
                break
            }
        }
    }

    /* ------------------------------------------------------------
     * Bot spawner API
     * ------------------------------------------------------------ */

    public spawnLogicalBot(
        soldierClass: mod.SoldierClass,
        teamId: number,
        pos: mod.Vector,
        displayName: mod.Message,
        unspawnDelay: number,
        lp?: TPlayer
    ): void {
        const spawner = mod.SpawnObject(
            mod.RuntimeSpawn_Common.AI_Spawner,
            pos,
            mod.CreateVector(0, 0, 0)
        )

        mod.AISetUnspawnOnDead(spawner, false)
        mod.SetUnspawnDelayInSeconds(spawner, unspawnDelay)

        const spawnerId = mod.GetObjId(spawner)

        this.spawnerMap.set(spawnerId, {
            lp,
            teamId,
            soldierClass,
            displayName,
        })

        mod.SpawnAIFromAISpawner(
            spawner,
            soldierClass,
            displayName,
            mod.GetTeam(teamId)
        )
    }

    public respawnLogicalBot(
        lp: TPlayer,
        spawnPos: mod.Vector,
        unspawnDelay: number
    ): void {
        if (!lp.logicalAIComp) {
            return
        }

        this.spawnLogicalBot(
            lp.logicalAIComp.soldierClass,
            lp.teamId,
            spawnPos,
            lp.logicalAIComp.displayName,
            unspawnDelay,
            lp
        )
    }

    /* ------------------------------------------------------------
     * AI compact movement events
     * ------------------------------------------------------------ */

    OnAIMoveToFailed(lp: TPlayer): void {
        lp.emit('OnAIMoveToFailed')
    }

    OnAIMoveToRunning(lp: TPlayer): void {
        lp.emit('OnAIMoveToRunning')
    }

    OnAIMoveToSucceeded(lp: TPlayer): void {
        lp.emit('OnAIMoveToSucceeded')
    }

    /* ------------------------------------------------------------
     * AI Parachute
     * ------------------------------------------------------------ */

    OnAIParachuteRunning(lp: TPlayer): void {
        lp.emit('OnAIParachuteRunning')
    }

    OnAIParachuteSucceeded(lp: TPlayer): void {
        lp.emit('OnAIParachuteSucceeded')
    }

    /* ------------------------------------------------------------
     * AI Waypoint Idle
     * ------------------------------------------------------------ */

    OnAIWaypointIdleFailed(lp: TPlayer): void {
        lp.emit('OnAIWaypointIdleFailed')
    }

    OnAIWaypointIdleRunning(lp: TPlayer): void {
        lp.emit('OnAIWaypointIdleRunning')
    }

    OnAIWaypointIdleSucceeded(lp: TPlayer): void {
        lp.emit('OnAIWaypointIdleSucceeded')
    }
}
