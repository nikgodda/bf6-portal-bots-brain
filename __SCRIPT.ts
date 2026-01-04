import * as modlib from 'modlib'

// -------- FILE: src\Core\Player\IPlayerEvents.ts --------
export interface CorePlayer_IPlayerEvents {
    // Lifecycle
    OnPlayerJoinGame?(joinedPlayer: CorePlayer_APlayer): void
    OnPlayerLeaveGame?(): void

    OnPlayerDeployed?(): void
    OnPlayerDied?(
        eventOtherPlayer: CorePlayer_APlayer | undefined,
        eventDeathType: mod.DeathType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void
    OnPlayerUndeploy?(): void

    // Damage / kills
    OnPlayerDamaged?(
        eventOtherPlayer: CorePlayer_APlayer | undefined,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void
    OnPlayerEarnedKill?(
        eventOtherPlayer: CorePlayer_APlayer | undefined,
        eventDeathType: mod.DeathType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void
    OnPlayerEarnedKillAssist?(
        eventOtherPlayer: CorePlayer_APlayer | undefined
    ): void
    OnMandown?(eventOtherPlayer: CorePlayer_APlayer | undefined): void
    OnRevived?(eventOtherPlayer: CorePlayer_APlayer | undefined): void

    // Interactions / triggers
    OnPlayerInteract?(eventInteractPoint: mod.InteractPoint): void
    OnPlayerEnterAreaTrigger?(eventAreaTrigger: mod.AreaTrigger): void
    OnPlayerExitAreaTrigger?(eventAreaTrigger: mod.AreaTrigger): void
    OnPlayerEnterCapturePoint?(eventCapturePoint: mod.CapturePoint): void
    OnPlayerExitCapturePoint?(eventCapturePoint: mod.CapturePoint): void

    // Vehicles
    OnPlayerEnterVehicle?(eventVehicle: mod.Vehicle): void
    OnPlayerExitVehicle?(eventVehicle: mod.Vehicle): void
    OnPlayerEnterVehicleSeat?(
        eventVehicle: mod.Vehicle,
        eventSeat: mod.Object
    ): void
    OnPlayerExitVehicleSeat?(
        eventVehicle: mod.Vehicle,
        eventSeat: mod.Object
    ): void

    // Team / UI
    OnPlayerSwitchTeam?(eventTeam: mod.Team): void
    OnPlayerUIButtonEvent?(
        eventUIWidget: mod.UIWidget,
        eventUIButtonEvent: mod.UIButtonEvent
    ): void

    // Raycast
    OnRayCastHit?(eventPoint: mod.Vector, eventNormal: mod.Vector): void
    OnRayCastMissed?(): void

    // Spawner
    // OnSpawnerSpawned?(eventSpawner: mod.Spawner): void

    // AI movement
    OnAIMoveToFailed?(): void
    OnAIMoveToRunning?(): void
    OnAIMoveToSucceeded?(): void

    // Waypoint idle
    OnAIWaypointIdleFailed?(): void
    OnAIWaypointIdleRunning?(): void
    OnAIWaypointIdleSucceeded?(): void

    // Parachute
    OnAIParachuteRunning?(): void
    OnAIParachuteSucceeded?(): void

    // Ongoing tick
    OngoingPlayer?(): void

    /*
     *
     */
    OnLogicalPlayerJoinGame?(lp: CorePlayer_APlayer): void
}

// -------- FILE: src\Core\Player\Components\AI\LogicalAIComponent.ts --------
export class CorePlayer_LogicalAIComponent implements CorePlayer_IComponent {
    public soldierClass: mod.SoldierClass
    public displayName: mod.Message
    public spawner: mod.Spawner

    private ap!: CorePlayer_APlayer

    constructor(
        classType: mod.SoldierClass,
        displayName: mod.Message,
        spawner: mod.Spawner
    ) {
        this.soldierClass = classType
        this.displayName = displayName
        this.spawner = spawner
    }

    onAttach(ap: CorePlayer_APlayer): void {
        this.ap = ap
    }

    onDetach(ap: CorePlayer_APlayer): void {
        // No cleanup needed for now
    }

    public get player(): mod.Player {
        return this.ap.player
    }
}

// -------- FILE: src\Core\Player\APlayer.ts --------
/**
 * CorePlayer_APlayer
 *
 * Logical player abstraction.
 * Represents a persistent identity across soldier respawns.
 *
 * - Used for both human players and AI bots
 * - Does NOT know about AI or brains
 * - Extended via components
 */
export abstract class CorePlayer_APlayer {
    public player: mod.Player
    public readonly id: number

    public teamId: number = 0

    protected listeners: CorePlayer_IPlayerEvents[] = []
    protected components: CorePlayer_IComponent[] = []

    private static nextId: number = 1

    constructor(player: mod.Player) {
        this.player = player
        this.id = CorePlayer_APlayer.nextId++

        this.teamId = mod.GetObjId(mod.GetTeam(player))
    }

    isAI(): boolean {
        return mod.GetSoldierState(
            this.player,
            mod.SoldierStateBool.IsAISoldier
        )
    }

    isLogicalAI(): boolean {
        return !!this.logicalAIComp
    }

    /* ------------------------------------------------------------
     * Common component shortcuts
     * ------------------------------------------------------------ */

    public get logicalAIComp():
        | CorePlayer_LogicalAIComponent
        | undefined {
        return this.getComponent(CorePlayer_LogicalAIComponent)
    }

    /* ------------------------------------------------------------
     * Event system
     * ------------------------------------------------------------ */

    public addListener(listener: CorePlayer_IPlayerEvents): void {
        this.listeners.push(listener)
    }

    public removeListener(listener: CorePlayer_IPlayerEvents): void {
        this.listeners = this.listeners.filter((l) => l !== listener)
    }

    public clearListeners(): void {
        this.listeners = []
    }

    public emit<E extends keyof CorePlayer_IPlayerEvents>(
        event: E,
        ...args: Parameters<NonNullable<CorePlayer_IPlayerEvents[E]>>
    ): void {
        for (const listener of this.listeners) {
            const fn = listener[event]
            if (typeof fn === 'function') {
                ;(fn as (...a: any[]) => void).call(listener, ...args)
            }
        }
    }

    /* ------------------------------------------------------------
     * Component system
     * ------------------------------------------------------------ */

    public addComponent(component: CorePlayer_IComponent): void {
        this.components.push(component)
        component.onAttach(this)
    }

    public removeComponent<T extends CorePlayer_IComponent>(
        ctor: new (...args: any[]) => T
    ): void {
        this.components = this.components.filter((c) => {
            if (c instanceof ctor) {
                c.onDetach(this)
                return false
            }
            return true
        })
    }

    public getComponent<T extends CorePlayer_IComponent>(
        ctor: new (...args: any[]) => T
    ): T | undefined {
        return this.components.find((c) => c instanceof ctor) as T | undefined
    }

    public getComponents(): readonly CorePlayer_IComponent[] {
        return this.components
    }

    /* ------------------------------------------------------------
     * Soldier rebinding
     * ------------------------------------------------------------ */

    public rebindTo(newPlayer: mod.Player): void {
        this.player = newPlayer
        this.teamId = mod.GetObjId(mod.GetTeam(newPlayer))

        for (const component of this.components) {
            const anyComp = component as any
            if (typeof anyComp.onRebind === 'function') {
                anyComp.onRebind(newPlayer)
            }
        }
    }
}

/* ------------------------------------------------------------
 * Component interface
 * ------------------------------------------------------------ */

export interface CorePlayer_IComponent {
    onAttach(ap: CorePlayer_APlayer): void
    onDetach(ap: CorePlayer_APlayer): void
}

// -------- FILE: src\Core\IGameModeEngineEvents.ts --------
export interface CorePlayer_IGameModeCustomEvents {}

export interface CorePlayer_IGameModeEngineEvents {
    OngoingGlobal?(): void
    OngoingAreaTrigger?(eventAreaTrigger: mod.AreaTrigger): void
    OngoingCapturePoint?(eventCapturePoint: mod.CapturePoint): void
    OngoingEmplacementSpawner?(
        eventEmplacementSpawner: mod.EmplacementSpawner
    ): void
    OngoingHQ?(eventHQ: mod.HQ): void
    OngoingInteractPoint?(eventInteractPoint: mod.InteractPoint): void
    OngoingLootSpawner?(eventLootSpawner: mod.LootSpawner): void
    OngoingMCOM?(eventMCOM: mod.MCOM): void
    OngoingPlayer?(eventPlayer: mod.Player): void
    OngoingRingOfFire?(eventRingOfFire: mod.RingOfFire): void
    OngoingSector?(eventSector: mod.Sector): void
    OngoingSpawner?(eventSpawner: mod.Spawner): void
    OngoingSpawnPoint?(eventSpawnPoint: mod.SpawnPoint): void
    OngoingTeam?(eventTeam: mod.Team): void
    OngoingVehicle?(eventVehicle: mod.Vehicle): void
    OngoingVehicleSpawner?(eventVehicleSpawner: mod.VehicleSpawner): void
    OngoingWaypointPath?(eventWaypointPath: mod.WaypointPath): void
    OngoingWorldIcon?(eventWorldIcon: mod.WorldIcon): void

    OnAIMoveToFailed?(eventPlayer: mod.Player): void
    OnAIMoveToRunning?(eventPlayer: mod.Player): void
    OnAIMoveToSucceeded?(eventPlayer: mod.Player): void
    OnAIParachuteRunning?(eventPlayer: mod.Player): void
    OnAIParachuteSucceeded?(eventPlayer: mod.Player): void
    OnAIWaypointIdleFailed?(eventPlayer: mod.Player): void
    OnAIWaypointIdleRunning?(eventPlayer: mod.Player): void
    OnAIWaypointIdleSucceeded?(eventPlayer: mod.Player): void

    OnCapturePointCaptured?(eventCapturePoint: mod.CapturePoint): void
    OnCapturePointCapturing?(eventCapturePoint: mod.CapturePoint): void
    OnCapturePointLost?(eventCapturePoint: mod.CapturePoint): void

    OnGameModeEnding?(): void
    OnGameModeStarted?(): void

    OnMandown?(eventPlayer: mod.Player, eventOtherPlayer: mod.Player): void

    OnMCOMArmed?(eventMCOM: mod.MCOM): void
    OnMCOMDefused?(eventMCOM: mod.MCOM): void
    OnMCOMDestroyed?(eventMCOM: mod.MCOM): void

    OnPlayerDamaged?(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void

    OnPlayerDeployed?(eventPlayer: mod.Player): void

    OnPlayerDied?(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player,
        eventDeathType: mod.DeathType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void

    OnPlayerEarnedKill?(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player,
        eventDeathType: mod.DeathType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void

    OnPlayerEarnedKillAssist?(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player
    ): void

    OnPlayerEnterAreaTrigger?(
        eventPlayer: mod.Player,
        eventAreaTrigger: mod.AreaTrigger
    ): void

    OnPlayerEnterCapturePoint?(
        eventPlayer: mod.Player,
        eventCapturePoint: mod.CapturePoint
    ): void

    OnPlayerEnterVehicle?(
        eventPlayer: mod.Player,
        eventVehicle: mod.Vehicle
    ): void

    OnPlayerEnterVehicleSeat?(
        eventPlayer: mod.Player,
        eventVehicle: mod.Vehicle,
        eventSeat: mod.Object
    ): void

    OnPlayerExitAreaTrigger?(
        eventPlayer: mod.Player,
        eventAreaTrigger: mod.AreaTrigger
    ): void

    OnPlayerExitCapturePoint?(
        eventPlayer: mod.Player,
        eventCapturePoint: mod.CapturePoint
    ): void

    OnPlayerExitVehicle?(
        eventPlayer: mod.Player,
        eventVehicle: mod.Vehicle
    ): void

    OnPlayerExitVehicleSeat?(
        eventPlayer: mod.Player,
        eventVehicle: mod.Vehicle,
        eventSeat: mod.Object
    ): void

    OnPlayerInteract?(
        eventPlayer: mod.Player,
        eventInteractPoint: mod.InteractPoint
    ): void

    OnPlayerJoinGame?(eventPlayer: mod.Player): void
    OnPlayerLeaveGame?(eventNumber: number): void

    OnPlayerSwitchTeam?(eventPlayer: mod.Player, eventTeam: mod.Team): void

    OnPlayerUIButtonEvent?(
        eventPlayer: mod.Player,
        eventUIWidget: mod.UIWidget,
        eventUIButtonEvent: mod.UIButtonEvent
    ): void

    OnPlayerUndeploy?(eventPlayer: mod.Player): void

    OnRayCastHit?(
        eventPlayer: mod.Player,
        eventPoint: mod.Vector,
        eventNormal: mod.Vector
    ): void

    OnRayCastMissed?(eventPlayer: mod.Player): void

    OnRevived?(eventPlayer: mod.Player, eventOtherPlayer: mod.Player): void

    OnRingOfFireZoneSizeChange?(
        eventRingOfFire: mod.RingOfFire,
        eventNumber: number
    ): void

    OnSpawnerSpawned?(eventPlayer: mod.Player, eventSpawner: mod.Spawner): void

    OnTimeLimitReached?(): void

    OnVehicleDestroyed?(eventVehicle: mod.Vehicle): void
    OnVehicleSpawned?(eventVehicle: mod.Vehicle): void

    /**
     * Fired when a logical AI player identity becomes active.
     *
     * This mirrors human OnPlayerJoinGame semantics,
     * but ONLY for logical AI.
     *
     * This is NOT an engine event.
     */
    OnLogicalPlayerJoinGame?(lp: CorePlayer_APlayer): void
}

// -------- FILE: src\Core\Player\APlayerManager.ts --------
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

// -------- FILE: src\Core\AGameMode.ts --------
// Routes all engine events through Core_AGameMode hooks and emits them for observers, mirroring the engine API 1:1.
type GameModeEventFn = (...args: any[]) => void

export abstract class Core_AGameMode<
    TCustomEvents extends {
        [K in keyof TCustomEvents]: GameModeEventFn | undefined
    } = {}
> {
    protected playerManager!: CorePlayer_APlayerManager

    constructor() {}

    protected abstract createPlayerManager(): CorePlayer_APlayerManager

    /** Helper: map engine player to logical player, or undefined if invalid. */
    protected lp(eventPlayer: mod.Player): CorePlayer_APlayer | undefined {
        return this.playerManager.get(eventPlayer)
    }

    protected lpId(eventNumber: number): CorePlayer_APlayer | undefined {
        return this.playerManager.getById(eventNumber)
    }

    /* ------------------------------------------------------------
     * Protected hooks (to be overridden in game modes)
     * ------------------------------------------------------------ */

    // Ongoing
    protected OngoingGlobal(): void {}
    protected OngoingAreaTrigger(eventAreaTrigger: mod.AreaTrigger): void {}
    protected OngoingCapturePoint(eventCapturePoint: mod.CapturePoint): void {}
    protected OngoingEmplacementSpawner(
        eventEmplacementSpawner: mod.EmplacementSpawner
    ): void {}
    protected OngoingHQ(eventHQ: mod.HQ): void {}
    protected OngoingInteractPoint(
        eventInteractPoint: mod.InteractPoint
    ): void {}
    protected OngoingLootSpawner(eventLootSpawner: mod.LootSpawner): void {}
    protected OngoingMCOM(eventMCOM: mod.MCOM): void {}
    protected OngoingPlayer(eventPlayer: mod.Player): void {}
    protected OngoingRingOfFire(eventRingOfFire: mod.RingOfFire): void {}
    protected OngoingSector(eventSector: mod.Sector): void {}
    protected OngoingSpawner(eventSpawner: mod.Spawner): void {}
    protected OngoingSpawnPoint(eventSpawnPoint: mod.SpawnPoint): void {}
    protected OngoingTeam(eventTeam: mod.Team): void {}
    protected OngoingVehicle(eventVehicle: mod.Vehicle): void {}
    protected OngoingVehicleSpawner(
        eventVehicleSpawner: mod.VehicleSpawner
    ): void {}
    protected OngoingWaypointPath(eventWaypointPath: mod.WaypointPath): void {}
    protected OngoingWorldIcon(eventWorldIcon: mod.WorldIcon): void {}

    // AI movement and waypoint events
    protected OnAIMoveToFailed(eventPlayer: mod.Player): void {}
    protected OnAIMoveToRunning(eventPlayer: mod.Player): void {}
    protected OnAIMoveToSucceeded(eventPlayer: mod.Player): void {}

    protected OnAIParachuteRunning(eventPlayer: mod.Player): void {}
    protected OnAIParachuteSucceeded(eventPlayer: mod.Player): void {}

    protected OnAIWaypointIdleFailed(eventPlayer: mod.Player): void {}
    protected OnAIWaypointIdleRunning(eventPlayer: mod.Player): void {}
    protected OnAIWaypointIdleSucceeded(eventPlayer: mod.Player): void {}

    // CapturePoint events
    protected OnCapturePointCaptured(
        eventCapturePoint: mod.CapturePoint
    ): void {}
    protected OnCapturePointCapturing(
        eventCapturePoint: mod.CapturePoint
    ): void {}
    protected OnCapturePointLost(eventCapturePoint: mod.CapturePoint): void {}

    // Game mode lifecycle
    protected OnGameModeEnding(): void {}
    protected OnGameModeStarted(): void {}

    // Player state events (undefined-only for "other" player)
    protected OnMandown(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player
    ): void {}

    protected OnPlayerDamaged(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {}

    protected OnPlayerDeployed(eventPlayer: mod.Player): void {}

    protected OnPlayerDied(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player,
        eventDeathType: mod.DeathType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {}

    protected OnPlayerEarnedKill(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player,
        eventDeathType: mod.DeathType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {}

    protected OnPlayerEarnedKillAssist(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player
    ): void {}

    protected OnRevived(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player
    ): void {}

    // Interaction and triggers
    protected OnPlayerInteract(
        eventPlayer: mod.Player,
        eventInteractPoint: mod.InteractPoint
    ): void {}

    protected OnPlayerEnterAreaTrigger(
        eventPlayer: mod.Player,
        eventAreaTrigger: mod.AreaTrigger
    ): void {}

    protected OnPlayerExitAreaTrigger(
        eventPlayer: mod.Player,
        eventAreaTrigger: mod.AreaTrigger
    ): void {}

    protected OnPlayerEnterCapturePoint(
        eventPlayer: mod.Player,
        eventCapturePoint: mod.CapturePoint
    ): void {}

    protected OnPlayerExitCapturePoint(
        eventPlayer: mod.Player,
        eventCapturePoint: mod.CapturePoint
    ): void {}

    // Vehicles
    protected OnPlayerEnterVehicle(
        eventPlayer: mod.Player,
        eventVehicle: mod.Vehicle
    ): void {}

    protected OnPlayerExitVehicle(
        eventPlayer: mod.Player,
        eventVehicle: mod.Vehicle
    ): void {}

    protected OnPlayerEnterVehicleSeat(
        eventPlayer: mod.Player,
        eventVehicle: mod.Vehicle,
        eventSeat: mod.Object
    ): void {}

    protected OnPlayerExitVehicleSeat(
        eventPlayer: mod.Player,
        eventVehicle: mod.Vehicle,
        eventSeat: mod.Object
    ): void {}

    // Team / UI
    protected OnPlayerSwitchTeam(
        eventPlayer: mod.Player,
        eventTeam: mod.Team
    ): void {}

    protected OnPlayerUIButtonEvent(
        eventPlayer: mod.Player,
        eventUIWidget: mod.UIWidget,
        eventUIButtonEvent: mod.UIButtonEvent
    ): void {}

    // Spawner / raycast / misc
    protected OnSpawnerSpawned(
        eventPlayer: mod.Player,
        eventSpawner: mod.Spawner
    ): void {}

    protected OnRayCastHit(
        eventPlayer: mod.Player,
        eventPoint: mod.Vector,
        eventNormal: mod.Vector
    ): void {}

    protected OnRayCastMissed(eventPlayer: mod.Player): void {}

    // Player join/leave/undeploy
    protected OnPlayerJoinGame(eventPlayer: mod.Player): void {}
    protected OnPlayerLeaveGame(eventNumber: number): void {}
    protected OnPlayerUndeploy(eventPlayer: mod.Player): void {}

    // Ring of Fire / time limit / vehicles / MCOM
    protected OnRingOfFireZoneSizeChange(
        eventRingOfFire: mod.RingOfFire,
        eventNumber: number
    ): void {}

    protected OnTimeLimitReached(): void {}

    protected OnVehicleDestroyed(eventVehicle: mod.Vehicle): void {}
    protected OnVehicleSpawned(eventVehicle: mod.Vehicle): void {}

    protected OnMCOMArmed(eventMCOM: mod.MCOM): void {}
    protected OnMCOMDefused(eventMCOM: mod.MCOM): void {}
    protected OnMCOMDestroyed(eventMCOM: mod.MCOM): void {}

    /*
     *
     */

    protected OnLogicalPlayerJoinGame(lp: CorePlayer_APlayer): void {}

    /* ------------------------------------------------------------
     * Internal router: main.ts -> _internal -> PlayerManager + hooks + emit
     * ------------------------------------------------------------ */

    public readonly _internal = {
        // Ongoing
        OngoingGlobal: (): void => {
            this.OngoingGlobal()
            this.emitEngine('OngoingGlobal')
        },

        OngoingAreaTrigger: (eventAreaTrigger: mod.AreaTrigger): void => {
            this.OngoingAreaTrigger(eventAreaTrigger)
            this.emitEngine('OngoingAreaTrigger', eventAreaTrigger)
        },

        OngoingCapturePoint: (eventCapturePoint: mod.CapturePoint): void => {
            this.OngoingCapturePoint(eventCapturePoint)
            this.emitEngine('OngoingCapturePoint', eventCapturePoint)
        },

        OngoingEmplacementSpawner: (
            eventEmplacementSpawner: mod.EmplacementSpawner
        ): void => {
            this.OngoingEmplacementSpawner(eventEmplacementSpawner)
            this.emitEngine(
                'OngoingEmplacementSpawner',
                eventEmplacementSpawner
            )
        },

        OngoingHQ: (eventHQ: mod.HQ): void => {
            this.OngoingHQ(eventHQ)
            this.emitEngine('OngoingHQ', eventHQ)
        },

        OngoingInteractPoint: (eventInteractPoint: mod.InteractPoint): void => {
            this.OngoingInteractPoint(eventInteractPoint)
            this.emitEngine('OngoingInteractPoint', eventInteractPoint)
        },

        OngoingLootSpawner: (eventLootSpawner: mod.LootSpawner): void => {
            this.OngoingLootSpawner(eventLootSpawner)
            this.emitEngine('OngoingLootSpawner', eventLootSpawner)
        },

        OngoingMCOM: (eventMCOM: mod.MCOM): void => {
            this.OngoingMCOM(eventMCOM)
            this.emitEngine('OngoingMCOM', eventMCOM)
        },

        OngoingPlayer: (eventPlayer: mod.Player): void => {
            if (!this.playerManager) return
            const lp = this.lp(eventPlayer)
            if (lp) {
                this.playerManager.tick(eventPlayer)
            }
            this.OngoingPlayer(eventPlayer)
            this.emitEngine('OngoingPlayer', eventPlayer)
        },

        OngoingRingOfFire: (eventRingOfFire: mod.RingOfFire): void => {
            this.OngoingRingOfFire(eventRingOfFire)
            this.emitEngine('OngoingRingOfFire', eventRingOfFire)
        },

        OngoingSector: (eventSector: mod.Sector): void => {
            this.OngoingSector(eventSector)
            this.emitEngine('OngoingSector', eventSector)
        },

        OngoingSpawner: (eventSpawner: mod.Spawner): void => {
            this.OngoingSpawner(eventSpawner)
            this.emitEngine('OngoingSpawner', eventSpawner)
        },

        OngoingSpawnPoint: (eventSpawnPoint: mod.SpawnPoint): void => {
            this.OngoingSpawnPoint(eventSpawnPoint)
            this.emitEngine('OngoingSpawnPoint', eventSpawnPoint)
        },

        OngoingTeam: (eventTeam: mod.Team): void => {
            this.OngoingTeam(eventTeam)
            this.emitEngine('OngoingTeam', eventTeam)
        },

        OngoingVehicle: (eventVehicle: mod.Vehicle): void => {
            this.OngoingVehicle(eventVehicle)
            this.emitEngine('OngoingVehicle', eventVehicle)
        },

        OngoingVehicleSpawner: (
            eventVehicleSpawner: mod.VehicleSpawner
        ): void => {
            this.OngoingVehicleSpawner(eventVehicleSpawner)
            this.emitEngine('OngoingVehicleSpawner', eventVehicleSpawner)
        },

        OngoingWaypointPath: (eventWaypointPath: mod.WaypointPath): void => {
            this.OngoingWaypointPath(eventWaypointPath)
            this.emitEngine('OngoingWaypointPath', eventWaypointPath)
        },

        OngoingWorldIcon: (eventWorldIcon: mod.WorldIcon): void => {
            this.OngoingWorldIcon(eventWorldIcon)
            this.emitEngine('OngoingWorldIcon', eventWorldIcon)
        },

        // AI movement and waypoint events
        OnAIMoveToFailed: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnAIMoveToFailed(lp)
            this.OnAIMoveToFailed(eventPlayer)
            this.emitEngine('OnAIMoveToFailed', eventPlayer)
        },

        OnAIMoveToRunning: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnAIMoveToRunning(lp)
            this.OnAIMoveToRunning(eventPlayer)
            this.emitEngine('OnAIMoveToRunning', eventPlayer)
        },

        OnAIMoveToSucceeded: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnAIMoveToSucceeded(lp)
            this.OnAIMoveToSucceeded(eventPlayer)
            this.emitEngine('OnAIMoveToSucceeded', eventPlayer)
        },

        OnAIParachuteRunning: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnAIParachuteRunning(lp)
            this.OnAIParachuteRunning(eventPlayer)
            this.emitEngine('OnAIParachuteRunning', eventPlayer)
        },

        OnAIParachuteSucceeded: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnAIParachuteSucceeded(lp)
            this.OnAIParachuteSucceeded(eventPlayer)
            this.emitEngine('OnAIParachuteSucceeded', eventPlayer)
        },

        OnAIWaypointIdleFailed: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnAIWaypointIdleFailed(lp)
            this.OnAIWaypointIdleFailed(eventPlayer)
            this.emitEngine('OnAIWaypointIdleFailed', eventPlayer)
        },

        OnAIWaypointIdleRunning: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnAIWaypointIdleRunning(lp)
            this.OnAIWaypointIdleRunning(eventPlayer)
            this.emitEngine('OnAIWaypointIdleRunning', eventPlayer)
        },

        OnAIWaypointIdleSucceeded: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnAIWaypointIdleSucceeded(lp)
            this.OnAIWaypointIdleSucceeded(eventPlayer)
            this.emitEngine('OnAIWaypointIdleSucceeded', eventPlayer)
        },

        // CapturePoint events
        OnCapturePointCaptured: (eventCapturePoint: mod.CapturePoint): void => {
            this.OnCapturePointCaptured(eventCapturePoint)
            this.emitEngine('OnCapturePointCaptured', eventCapturePoint)
        },

        OnCapturePointCapturing: (
            eventCapturePoint: mod.CapturePoint
        ): void => {
            this.OnCapturePointCapturing(eventCapturePoint)
            this.emitEngine('OnCapturePointCapturing', eventCapturePoint)
        },

        OnCapturePointLost: (eventCapturePoint: mod.CapturePoint): void => {
            this.OnCapturePointLost(eventCapturePoint)
            this.emitEngine('OnCapturePointLost', eventCapturePoint)
        },

        // Game mode lifecycle
        OnGameModeEnding: (): void => {
            this.OnGameModeEnding()
            this.emitEngine('OnGameModeEnding')
        },

        OnGameModeStarted: (): void => {
            this.OnGameModeStarted()
            this.emitEngine('OnGameModeStarted')
        },

        // Player state events
        OnMandown: (
            eventPlayer: mod.Player,
            eventOtherPlayer: mod.Player
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) {
                const other = this.lp(eventOtherPlayer)
                this.playerManager.OnMandown(lp, other)
            }
            this.OnMandown(eventPlayer, eventOtherPlayer)
            this.emitEngine('OnMandown', eventPlayer, eventOtherPlayer)
        },

        OnPlayerDamaged: (
            eventPlayer: mod.Player,
            eventOtherPlayer: mod.Player,
            eventDamageType: mod.DamageType,
            eventWeaponUnlock: mod.WeaponUnlock
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) {
                const other = this.lp(eventOtherPlayer)
                this.playerManager.OnPlayerDamaged(
                    lp,
                    other,
                    eventDamageType,
                    eventWeaponUnlock
                )
            }
            this.OnPlayerDamaged(
                eventPlayer,
                eventOtherPlayer,
                eventDamageType,
                eventWeaponUnlock
            )
            this.emitEngine(
                'OnPlayerDamaged',
                eventPlayer,
                eventOtherPlayer,
                eventDamageType,
                eventWeaponUnlock
            )
        },

        OnPlayerDeployed: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnPlayerDeployed(lp)
            this.OnPlayerDeployed(eventPlayer)
            this.emitEngine('OnPlayerDeployed', eventPlayer)
        },

        OnPlayerDied: (
            eventPlayer: mod.Player,
            eventOtherPlayer: mod.Player,
            eventDeathType: mod.DeathType,
            eventWeaponUnlock: mod.WeaponUnlock
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) {
                const other = this.lp(eventOtherPlayer)
                this.playerManager.OnPlayerDied(
                    lp,
                    other,
                    eventDeathType,
                    eventWeaponUnlock
                )
            }
            this.OnPlayerDied(
                eventPlayer,
                eventOtherPlayer,
                eventDeathType,
                eventWeaponUnlock
            )
            this.emitEngine(
                'OnPlayerDied',
                eventPlayer,
                eventOtherPlayer,
                eventDeathType,
                eventWeaponUnlock
            )
        },

        OnPlayerEarnedKill: (
            eventPlayer: mod.Player,
            eventOtherPlayer: mod.Player,
            eventDeathType: mod.DeathType,
            eventWeaponUnlock: mod.WeaponUnlock
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) {
                const other = this.lp(eventOtherPlayer)
                this.playerManager.OnPlayerEarnedKill(
                    lp,
                    other,
                    eventDeathType,
                    eventWeaponUnlock
                )
            }
            this.OnPlayerEarnedKill(
                eventPlayer,
                eventOtherPlayer,
                eventDeathType,
                eventWeaponUnlock
            )
            this.emitEngine(
                'OnPlayerEarnedKill',
                eventPlayer,
                eventOtherPlayer,
                eventDeathType,
                eventWeaponUnlock
            )
        },

        OnPlayerEarnedKillAssist: (
            eventPlayer: mod.Player,
            eventOtherPlayer: mod.Player
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) {
                const other = this.lp(eventOtherPlayer)
                this.playerManager.OnPlayerEarnedKillAssist(lp, other)
            }
            this.OnPlayerEarnedKillAssist(eventPlayer, eventOtherPlayer)
            this.emitEngine(
                'OnPlayerEarnedKillAssist',
                eventPlayer,
                eventOtherPlayer
            )
        },

        OnRevived: (
            eventPlayer: mod.Player,
            eventOtherPlayer: mod.Player
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) {
                const other = this.lp(eventOtherPlayer)
                this.playerManager.OnRevived(lp, other)
            }
            this.OnRevived(eventPlayer, eventOtherPlayer)
            this.emitEngine('OnRevived', eventPlayer, eventOtherPlayer)
        },

        // MCOM events
        OnMCOMArmed: (eventMCOM: mod.MCOM): void => {
            this.OnMCOMArmed(eventMCOM)
            this.emitEngine('OnMCOMArmed', eventMCOM)
        },

        OnMCOMDefused: (eventMCOM: mod.MCOM): void => {
            this.OnMCOMDefused(eventMCOM)
            this.emitEngine('OnMCOMDefused', eventMCOM)
        },

        OnMCOMDestroyed: (eventMCOM: mod.MCOM): void => {
            this.OnMCOMDestroyed(eventMCOM)
            this.emitEngine('OnMCOMDestroyed', eventMCOM)
        },

        // Interaction and triggers
        OnPlayerInteract: (
            eventPlayer: mod.Player,
            eventInteractPoint: mod.InteractPoint
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnPlayerInteract(lp, eventInteractPoint)
            this.OnPlayerInteract(eventPlayer, eventInteractPoint)
            this.emitEngine('OnPlayerInteract', eventPlayer, eventInteractPoint)
        },

        OnPlayerEnterAreaTrigger: (
            eventPlayer: mod.Player,
            eventAreaTrigger: mod.AreaTrigger
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp)
                this.playerManager.OnPlayerEnterAreaTrigger(
                    lp,
                    eventAreaTrigger
                )
            this.OnPlayerEnterAreaTrigger(eventPlayer, eventAreaTrigger)
            this.emitEngine(
                'OnPlayerEnterAreaTrigger',
                eventPlayer,
                eventAreaTrigger
            )
        },

        OnPlayerExitAreaTrigger: (
            eventPlayer: mod.Player,
            eventAreaTrigger: mod.AreaTrigger
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp)
                this.playerManager.OnPlayerExitAreaTrigger(lp, eventAreaTrigger)
            this.OnPlayerExitAreaTrigger(eventPlayer, eventAreaTrigger)
            this.emitEngine(
                'OnPlayerExitAreaTrigger',
                eventPlayer,
                eventAreaTrigger
            )
        },

        OnPlayerEnterCapturePoint: (
            eventPlayer: mod.Player,
            eventCapturePoint: mod.CapturePoint
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp)
                this.playerManager.OnPlayerEnterCapturePoint(
                    lp,
                    eventCapturePoint
                )
            this.OnPlayerEnterCapturePoint(eventPlayer, eventCapturePoint)
            this.emitEngine(
                'OnPlayerEnterCapturePoint',
                eventPlayer,
                eventCapturePoint
            )
        },

        OnPlayerExitCapturePoint: (
            eventPlayer: mod.Player,
            eventCapturePoint: mod.CapturePoint
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp)
                this.playerManager.OnPlayerExitCapturePoint(
                    lp,
                    eventCapturePoint
                )
            this.OnPlayerExitCapturePoint(eventPlayer, eventCapturePoint)
            this.emitEngine(
                'OnPlayerExitCapturePoint',
                eventPlayer,
                eventCapturePoint
            )
        },

        // Vehicle events
        OnPlayerEnterVehicle: (
            eventPlayer: mod.Player,
            eventVehicle: mod.Vehicle
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnPlayerEnterVehicle(lp, eventVehicle)
            this.OnPlayerEnterVehicle(eventPlayer, eventVehicle)
            this.emitEngine('OnPlayerEnterVehicle', eventPlayer, eventVehicle)
        },

        OnPlayerExitVehicle: (
            eventPlayer: mod.Player,
            eventVehicle: mod.Vehicle
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnPlayerExitVehicle(lp, eventVehicle)
            this.OnPlayerExitVehicle(eventPlayer, eventVehicle)
            this.emitEngine('OnPlayerExitVehicle', eventPlayer, eventVehicle)
        },

        OnPlayerEnterVehicleSeat: (
            eventPlayer: mod.Player,
            eventVehicle: mod.Vehicle,
            eventSeat: mod.Object
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp)
                this.playerManager.OnPlayerEnterVehicleSeat(
                    lp,
                    eventVehicle,
                    eventSeat
                )
            this.OnPlayerEnterVehicleSeat(eventPlayer, eventVehicle, eventSeat)
            this.emitEngine(
                'OnPlayerEnterVehicleSeat',
                eventPlayer,
                eventVehicle,
                eventSeat
            )
        },

        OnPlayerExitVehicleSeat: (
            eventPlayer: mod.Player,
            eventVehicle: mod.Vehicle,
            eventSeat: mod.Object
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp)
                this.playerManager.OnPlayerExitVehicleSeat(
                    lp,
                    eventVehicle,
                    eventSeat
                )
            this.OnPlayerExitVehicleSeat(eventPlayer, eventVehicle, eventSeat)
            this.emitEngine(
                'OnPlayerExitVehicleSeat',
                eventPlayer,
                eventVehicle,
                eventSeat
            )
        },

        OnPlayerJoinGame: (eventPlayer: mod.Player): void => {
            if (!this.playerManager) {
                this.playerManager = this.createPlayerManager()

                this.playerManager.notifyGameModeOnLogicalPlayerJoin = (lp) => {
                    this._internal.OnLogicalPlayerJoinGame(lp)
                }
            }

            // Semantic layer
            this.playerManager.OnPlayerJoinGame(eventPlayer)

            // Gameplay hook
            this.OnPlayerJoinGame(eventPlayer)

            // Observers (VO, UI, debug, etc.)
            this.emitEngine('OnPlayerJoinGame', eventPlayer)
        },

        // ------------------------------------------------------------
        // Player leaves match
        // ------------------------------------------------------------
        OnPlayerLeaveGame: (eventNumber: number): void => {
            // Engine truth only.
            // Core does not attempt to resolve or validate logical players here.
            // GameMode is fully responsible for interpreting this event.
            this.OnPlayerLeaveGame(eventNumber)
            this.emitEngine('OnPlayerLeaveGame', eventNumber)
        },

        // Team / UI
        OnPlayerSwitchTeam: (
            eventPlayer: mod.Player,
            eventTeam: mod.Team
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnPlayerSwitchTeam(lp, eventTeam)
            this.OnPlayerSwitchTeam(eventPlayer, eventTeam)
            this.emitEngine('OnPlayerSwitchTeam', eventPlayer, eventTeam)
        },

        OnPlayerUIButtonEvent: (
            eventPlayer: mod.Player,
            eventUIWidget: mod.UIWidget,
            eventUIButtonEvent: mod.UIButtonEvent
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp)
                this.playerManager.OnPlayerUIButtonEvent(
                    lp,
                    eventUIWidget,
                    eventUIButtonEvent
                )
            this.OnPlayerUIButtonEvent(
                eventPlayer,
                eventUIWidget,
                eventUIButtonEvent
            )
            this.emitEngine(
                'OnPlayerUIButtonEvent',
                eventPlayer,
                eventUIWidget,
                eventUIButtonEvent
            )
        },

        // Undeploy
        OnPlayerUndeploy: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnPlayerUndeploy(lp)
            this.OnPlayerUndeploy(eventPlayer)
            this.emitEngine('OnPlayerUndeploy', eventPlayer)
        },

        // Raycast
        OnRayCastHit: (
            eventPlayer: mod.Player,
            eventPoint: mod.Vector,
            eventNormal: mod.Vector
        ): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnRayCastHit(lp, eventPoint, eventNormal)
            this.OnRayCastHit(eventPlayer, eventPoint, eventNormal)
            this.emitEngine(
                'OnRayCastHit',
                eventPlayer,
                eventPoint,
                eventNormal
            )
        },

        OnRayCastMissed: (eventPlayer: mod.Player): void => {
            const lp = this.lp(eventPlayer)
            if (lp) this.playerManager.OnRayCastMissed(lp)
            this.OnRayCastMissed(eventPlayer)
            this.emitEngine('OnRayCastMissed', eventPlayer)
        },

        // Spawner
        OnSpawnerSpawned: (
            eventPlayer: mod.Player,
            eventSpawner: mod.Spawner
        ): void => {
            // PlayerManager owns the spawner-respawn flow and will call back into
            // _notifyOnAIJoinGame / _notifyOnSpawnerSpawned to avoid double-calls.
            this.playerManager.OnSpawnerSpawned(eventPlayer, eventSpawner)
        },

        // Ring of fire / time limit / vehicles
        OnRingOfFireZoneSizeChange: (
            eventRingOfFire: mod.RingOfFire,
            eventNumber: number
        ): void => {
            this.OnRingOfFireZoneSizeChange(eventRingOfFire, eventNumber)
            this.emitEngine(
                'OnRingOfFireZoneSizeChange',
                eventRingOfFire,
                eventNumber
            )
        },

        OnTimeLimitReached: (): void => {
            this.OnTimeLimitReached()
            this.emitEngine('OnTimeLimitReached')
        },

        OnVehicleDestroyed: (eventVehicle: mod.Vehicle): void => {
            this.OnVehicleDestroyed(eventVehicle)
            this.emitEngine('OnVehicleDestroyed', eventVehicle)
        },

        OnVehicleSpawned: (eventVehicle: mod.Vehicle): void => {
            this.OnVehicleSpawned(eventVehicle)
            this.emitEngine('OnVehicleSpawned', eventVehicle)
        },

        /*
         *
         */

        OnLogicalPlayerJoinGame: (lp: CorePlayer_APlayer): void => {
            this.OnLogicalPlayerJoinGame(lp)
            this.emitEngine('OnLogicalPlayerJoinGame', lp)
        },
    }

    /* ------------------------------------------------------------
     * Simple event bus for observers (AI, debug, UI)
     *
     * - Engine events are always available
     * - Custom events are gamemode-specific
     * ------------------------------------------------------------ */

    protected listeners: Array<
        CorePlayer_IGameModeEngineEvents & TCustomEvents
    > = []

    public addListener(
        listener: CorePlayer_IGameModeEngineEvents & TCustomEvents
    ): void {
        this.listeners.push(listener)
    }

    public removeListener(
        listener: CorePlayer_IGameModeEngineEvents & TCustomEvents
    ): void {
        this.listeners = this.listeners.filter((l) => l !== listener)
    }

    protected emitEngine<E extends keyof CorePlayer_IGameModeEngineEvents>(
        event: E,
        ...args: Parameters<NonNullable<CorePlayer_IGameModeEngineEvents[E]>>
    ): void {
        for (const listener of this.listeners) {
            listener[event]?.(...args)
        }
    }

    protected emitCustom<E extends keyof TCustomEvents>(
        event: E,
        ...args: Parameters<NonNullable<TCustomEvents[E]>>
    ): void {
        for (const listener of this.listeners) {
            listener[event]?.(...args)
        }
    }
}

// -------- FILE: src\Core\AI\Modules\Memory\MemoryManager.ts --------
/**
 * CoreAI_MemoryManager:
 * Typed TTL-based memory storage for AI.
 *
 * Memory fields are strictly typed via CoreAI_MemoryFields.
 * TTL expiration handled internally via prune().
 */

export type CoreAI_MemoryFields = {
    closestEnemy: mod.Player | null
    vehicleToDrive: mod.Vehicle | null
    isInBattle: boolean
    roamPos: mod.Vector | null // movement target
    arrivedPos: mod.Vector | null // semantic arrival
    capturePoint: mod.CapturePoint | null
}

export class CoreAI_MemoryManager {
    /** Unified tick timestamp updated by the Brain */
    public time: number = 0

    /** All memory values live here */
    public data: CoreAI_MemoryFields = {
        closestEnemy: null,
        vehicleToDrive: null,
        isInBattle: false,
        roamPos: null,
        arrivedPos: null,
        capturePoint: null,
    }

    /** TTL expiration registry */
    private expirations: Map<keyof CoreAI_MemoryFields, number> = new Map()

    /**
     * Set a memory field with optional TTL.
     * TTL <= 0 or value null means no expiration.
     */
    public set<K extends keyof CoreAI_MemoryFields>(
        key: K,
        value: CoreAI_MemoryFields[K],
        ttlMs?: number
    ): void {
        this.data[key] = value

        if (value == null || !ttlMs || ttlMs <= 0) {
            this.expirations.delete(key)
            return
        }

        this.expirations.set(key, this.time + ttlMs)
    }

    /**
     * Return the value of a memory field.
     */
    public get<K extends keyof CoreAI_MemoryFields>(
        key: K
    ): CoreAI_MemoryFields[K] {
        return this.data[key]
    }

    /**
     * Check if a field has a non-null, non-false value.
     */
    public has<K extends keyof CoreAI_MemoryFields>(key: K): boolean {
        const v = this.data[key]
        return v !== null && v !== false && v !== undefined
    }

    /**
     * Clear a memory field and remove expiration.
     */
    public clear<K extends keyof CoreAI_MemoryFields>(key: K): void {
        this.data[key] = null as any
        this.expirations.delete(key)
    }

    /**
     * Get expiration timestamp for a field (0 if unset).
     */
    public expiresAt<K extends keyof CoreAI_MemoryFields>(key: K): number {
        return this.expirations.get(key) ?? 0
    }

    /**
     * Time remaining before expiration (0 if none).
     */
    public getTimeRemaining<K extends keyof CoreAI_MemoryFields>(
        key: K
    ): number {
        const exp = this.expirations.get(key)
        if (exp === undefined) return 0
        const rem = exp - this.time
        return rem > 0 ? rem : 0
    }

    /**
     * Remove all expired memory entries.
     */
    public prune(): void {
        const now = this.time

        for (const [key, exp] of this.expirations) {
            if (now >= exp) {
                this.data[key] = null as any
                this.expirations.delete(key)
            }
        }
    }

    /**
     * Full reset on death or undeploy.
     */
    public reset(): void {
        this.time = 0

        this.data = {
            closestEnemy: null,
            vehicleToDrive: null,
            isInBattle: false,
            roamPos: null,
            arrivedPos: null,
            capturePoint: null,
        }

        this.expirations.clear()
    }
}

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\SensorContext.ts --------
/**
 * CoreAI_SensorContext:
 * Immutable per-tick context passed to all sensors.
 *
 * Sensors must ONLY:
 * - read from ctx.player / world
 * - write into ctx.memory
 *
 * Sensors must NOT:
 * - control behaviors
 * - reference Brain
 * - trigger actions directly
 */
export interface CoreAI_SensorContext {
    /** AI-controlled player */
    player: mod.Player

    /** Shared AI memory for this brain */
    memory: CoreAI_MemoryManager

    /** Unified tick time (copied from memory.time) */
    time: number
}

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\ASensor.ts --------
/**
 * ASensor:
 * Base class for all perception sensors.
 *
 * Responsibilities:
 * - Throttles sensor execution using updateRate (ms) based on ctx.time.
 * - tick(ctx) is called by Perception each tick.
 * - update(ctx) is implemented by concrete sensors.
 *
 * Notes:
 * - Sensors must always check player validity.
 * - Sensors do NOT store Brain internally.
 * - Sensors MUST use ctx.time, not Date.now().
 */
export abstract class CoreAI_ASensor {
    private lastUpdate = 0

    constructor(
        private readonly updateRate: number // milliseconds
    ) {}

    /**
     * Called by Perception each tick.
     * Applies throttling logic and calls update().
     */
    tick(ctx: CoreAI_SensorContext): void {
        const now = ctx.time // unified tick time

        if (now - this.lastUpdate < this.updateRate) {
            return
        }

        if (!mod.IsPlayerValid(ctx.player)) {
            return
        }

        this.lastUpdate = now
        this.update(ctx)
    }

    /**
     * To be implemented by concrete sensors.
     */
    protected abstract update(ctx: CoreAI_SensorContext): void

    /**
     * Optional event hooks for sensors that react to game events.
     * (FightSensor overrides onDamaged)
     */
    onDamaged?(
        ctx: CoreAI_SensorContext,
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {}

    onRayCastHit?(
        ctx: CoreAI_SensorContext,
        eventPoint: mod.Vector,
        eventNormal: mod.Vector
    ): void {}

    reset(): void {
        this.lastUpdate = 0
    }
}

// -------- FILE: src\Core\AI\Modules\Perception\Perception.ts --------
// src/Core/AI/Modules/Perception/Perception.ts
/**
 * Perception:
 * Holds sensors, updates them every tick.
 *
 * Sensors are installed dynamically by profiles, squad brain,
 * or any system using Brain.useSensor().
 *
 * replace-sensor architecture:
 * - addSensor(sensor) replaces existing sensor with same constructor
 * - removeSensor() removes by type
 * - clearSensors() wipes all sensors
 */
export class CoreAI_Perception {
    private sensors: CoreAI_ASensor[] = []

    constructor() {}

    /** Called every tick by Brain. */
    update(ctx: CoreAI_SensorContext): void {
        for (const s of this.sensors) {
            s.tick(ctx)
        }
    }

    /** Reset internal sensor tick state. */
    reset(): void {
        for (const s of this.sensors) {
            s.reset()
        }
    }

    /** Return immutable sensor list. */
    getSensors(): readonly CoreAI_ASensor[] {
        return this.sensors
    }

    /**
     * Add or replace a sensor instance.
     * If a sensor of the same type already exists, it is replaced.
     */
    addSensor(sensor: CoreAI_ASensor): void {
        const ctor = sensor.constructor as Function

        const idx = this.sensors.findIndex((s) => s.constructor === ctor)
        if (idx !== -1) {
            this.sensors[idx] = sensor
        } else {
            this.sensors.push(sensor)
        }
    }

    /** Remove all sensors of a given constructor. */
    removeSensor(ctor: Function): void {
        this.sensors = this.sensors.filter((s) => s.constructor !== ctor)
    }

    /** Find first sensor instance of a given type. */
    getSensor<T extends CoreAI_ASensor>(
        ctor: new (...args: any[]) => T
    ): T | undefined {
        return this.sensors.find((s) => s instanceof ctor) as T | undefined
    }

    /** Remove all sensors from this brain. */
    clearSensors(): void {
        this.sensors = []
    }
}

// -------- FILE: src\Core\AI\Modules\Behavior\Behaviors\ABehavior.ts --------
/**
 * CoreAI_ABehavior:
 * Base class for all AI behaviors.
 *
 * - enter(): called once when behavior becomes active
 * - update(): called when throttling allows
 * - exit(): called once when behavior is replaced
 *
 * Throttling:
 * - If intervalMs > 0, update() is called no more often than intervalMs
 * - If intervalMs <= 0, update() is called every tick
 */
export abstract class CoreAI_ABehavior {
    protected brain: CoreAI_Brain

    public abstract name: string

    // Throttling interval. Zero means no throttling.
    protected intervalMs: number = 1000

    private lastUpdateTime: number = 0

    constructor(brain: CoreAI_Brain) {
        this.brain = brain
    }

    /** Called by BehaviorController once per tick. */
    tick(): void {
        const now = this.brain.memory.time

        if (this.intervalMs > 0) {
            if (now - this.lastUpdateTime < this.intervalMs) {
                return
            }
            this.lastUpdateTime = now
        }

        this.update()
    }

    enter(): void {}
    update(): void {}
    exit(): void {}
}

// -------- FILE: src\Core\AI\Modules\Behavior\Behaviors\IdleBehavior.ts --------
/**
 * IdleBehavior:
 * Infinite fallback behavior issued when nothing else has score.
 * Simply triggers AIIdleBehavior and lets the engine handle animations.
 */
export class CoreAI_IdleBehavior extends CoreAI_ABehavior {
    public name = 'idle'

    constructor(brain: CoreAI_Brain) {
        super(brain)
    }

    override enter(): void {
        const player = this.brain.player

        if (mod.IsPlayerValid(player)) {
            mod.AIIdleBehavior(player)
        }
    }

    override update(): void {
        // No logic needed.
        // Engine handles stance + idle behavior.
    }

    override exit(): void {
        // No cleanup required.
    }
}

// -------- FILE: src\Core\AI\Modules\Behavior\BehaviorController.ts --------
// src/Core/AI/Modules/Behavior/BehaviorController.ts
export type CoreAI_BehaviorMode = 'onFoot' | 'onDrive'

/**
 * BehaviorController:
 *
 * - Always holds exactly one active behavior instance.
 * - TaskSelector constructs new behaviors when chosen.
 * - Controller simply switches and runs them.
 *
 * Notes:
 * - Behaviors no longer own lifecycle state.
 * - Behaviors do NOT decide completion.
 * - Switching happens every tick based on scoring.
 */

export class CoreAI_BehaviorController {
    private current: CoreAI_ABehavior

    constructor(private readonly brain: CoreAI_Brain) {
        // Start with Idle behavior
        this.current = new CoreAI_IdleBehavior(brain)
        this.current.enter()
    }

    /**
     * Switch to a new behavior instance.
     * Called by CoreAI_Brain.tick() after TaskSelector picks behavior.
     */
    change(next: CoreAI_ABehavior): void {
        // If it's the exact same instance, do nothing.
        // (May happen temporarily if TaskSelector picks same behavior two ticks in a row.)
        if (this.current === next) return

        // Exit previous behavior
        this.current.exit()

        // Enter the new behavior
        this.current = next
        this.current.enter()
    }

    /** Returns current active behavior */
    currentBehavior(): CoreAI_ABehavior {
        return this.current
    }

    /** Called every tick by the brain */
    update(): void {
        this.current.tick()
    }

    /**
     * Reset everything (on undeploy or profile switch).
     * Returns to pure Idle behavior.
     */
    resetAll(): void {
        this.current.exit()
        this.current = new CoreAI_IdleBehavior(this.brain)
        this.current.enter()
    }
}

// -------- FILE: src\Core\AI\Modules\Task\ITaskScoringEntry.ts --------
// src/Core/AI/Modules/Task/ITaskScoringEntry.ts
/**
 * CoreAI_ITaskScoringEntry:
 * - score(brain): returns utility score for this behavior.
 * - factory(brain): creates a ready-to-run behavior instance.
 *
 * TaskSelector:
 * - picks the entry with highest score
 * - calls factory(brain) to get the behavior instance
 */
export interface CoreAI_ITaskScoringEntry {
    score: (brain: CoreAI_Brain) => number
    factory: (brain: CoreAI_Brain) => CoreAI_ABehavior
}

// -------- FILE: src\Core\AI\Profiles\AProfile.ts --------
/**
 * CoreAI_AProfile:
 * Base AI profile.
 *
 * Contains:
 *  - scoring: list of behavior scoring entries
 *  - sensors: list of sensor factory functions
 *
 * Each sensor factory returns a new sensor instance:
 *    () => new SomeSensor(...)
 *
 * This ensures every AI brain receives fresh, isolated sensors.
 */
export abstract class CoreAI_AProfile {
    /** Task scoring table for behaviors. */
    scoring: CoreAI_ITaskScoringEntry[] = []

    /** Sensor factories. Each returns a new CoreAI_ASensor instance. */
    sensors: (() => CoreAI_ASensor)[] = []

    protected addSensorIf(
        condition: unknown,
        factory: () => CoreAI_ASensor
    ): void {
        if (condition) {
            this.sensors.push(factory)
        }
    }
}

export interface CoreAI_FightSensorOptions {
    intervalMs?: number
    ttlMs?: number
}

export interface CoreAI_ClosestEnemySensorOptions {
    sensitivity?: number
    intervalMs?: number
    ttlMs?: number
}

export interface CoreAI_VehicleToDriveSensorOptions {
    intervalMs?: number
    radius?: number
    ttlMs?: number
}

export interface CoreAI_ArrivalSensorOptions {
    getWPs?: () => mod.Vector[]
    intervalMs?: number
    distanceThreshold?: number
    ttlMs?: number
    cooldownMs?: number
}

export interface CoreAI_MoveToSensorOptions {
    getWPs?: () => mod.Vector[]
    intervalMs?: number
    ttlMs?: number
}

export interface CoreAI_CapturePointSensorOptions {
    getCapturePoints?: () => mod.CapturePoint[]
    intervalMs?: number
    ttlMs?: number
}

export interface CoreAI_SensorOptions {
    fightSensor?: CoreAI_FightSensorOptions
    closestEnemySensor?: CoreAI_ClosestEnemySensorOptions
    vehicleToDriveSensor?: CoreAI_VehicleToDriveSensorOptions
    arrivalSensor?: CoreAI_ArrivalSensorOptions
    roamSensor?: CoreAI_MoveToSensorOptions
    onDriveMoveToSensor?: CoreAI_MoveToSensorOptions
    capturePointSensor?: CoreAI_CapturePointSensorOptions
    moveToCapturePointSensor?: CoreAI_CapturePointSensorOptions
}

// -------- FILE: src\Core\AI\Modules\Behavior\Behaviors\MoveToBehavior.ts --------
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
    private readonly mode: CoreAI_BehaviorMode
    private readonly arrivalDist: number
    private readonly isValidated: boolean

    constructor(
        brain: CoreAI_Brain,
        pos: mod.Vector,
        speed: mod.MoveSpeed = mod.MoveSpeed.Run,
        mode: CoreAI_BehaviorMode = 'onFoot',
        arrivalDist: number = 3,
        isValidated: boolean = true
    ) {
        super(brain)
        this.roamPos = pos
        this.speed = speed
        this.mode = mode
        this.arrivalDist = arrivalDist
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

        if (this.mode === 'onDrive') {
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
        const arrivalDist = this.arrivalDist

        if (dist < arrivalDist) {
            this.brain.memory.set('roamPos', null)
        }
    }

    override exit(): void {
        // No target cleanup here; targeting is managed by the brain.
    }
}

// -------- FILE: src\Core\AI\Modules\Task\TaskSelector.ts --------
export class CoreAI_TaskSelector {
    private brain: CoreAI_Brain
    private profile: CoreAI_AProfile

    constructor(brain: CoreAI_Brain, profile: CoreAI_AProfile) {
        this.brain = brain
        this.profile = profile
    }

    setProfile(profile: CoreAI_AProfile): void {
        this.profile = profile
    }

    chooseNextBehavior() {
        const current = this.brain.behaviorController.currentBehavior()

        let bestEntry: CoreAI_ITaskScoringEntry | null = null
        let bestScore = -Infinity

        // Evaluate profile scoring
        for (let i = 0; i < this.profile.scoring.length; i++) {
            const entry = this.profile.scoring[i]
            const score = entry.score(this.brain)
            if (score > bestScore) {
                bestScore = score
                bestEntry = entry
            }
        }

        // If nothing scores above zero -> idle
        if (!bestEntry || bestScore <= 0) {
            if (current instanceof CoreAI_IdleBehavior) {
                return current
            }
            return new CoreAI_IdleBehavior(this.brain)
        }

        // TEMP instance only to inspect class
        const temp = bestEntry.factory(this.brain)
        const nextClass = temp.constructor

        // If same class -> don't switch (no restarts), except MoveTo when target changes.
        if (current && current.constructor === nextClass) {
            if (
                current instanceof CoreAI_MoveToBehavior &&
                temp instanceof CoreAI_MoveToBehavior
            ) {
                const currentPos = current.getTargetPos()
                const nextPos = temp.getTargetPos()
                if (mod.DistanceBetween(currentPos, nextPos) <= 0) {
                    return current
                }
            } else {
                return current
            }
        }

        // Switch to new instance
        return temp
    }
}

// -------- FILE: src\Core\UI\UIColors.ts --------
/*
 * Shared UI color palette.
 * Colors are normalized RGB mod.Vector values.
 * Do not mutate at runtime.
 */
export const CoreUI_Colors = {
    White: mod.CreateVector(1, 1, 1),
    Black: mod.CreateVector(0.031, 0.043, 0.043),

    GreyLight: mod.CreateVector(0.835, 0.922, 0.976), // d5ebf9
    Grey: mod.CreateVector(0.329, 0.369, 0.388), // 545e63
    GreyDark: mod.CreateVector(0.212, 0.224, 0.235), // 36393c

    BlueLight: mod.CreateVector(0.439, 0.922, 1), // 70ebff
    BlueDark: mod.CreateVector(0.075, 0.184, 0.247), // 132f3f

    RedLight: mod.CreateVector(1, 0.514, 0.38), // ff8361
    RedDark: mod.CreateVector(0.251, 0.094, 0.067), // 401811

    GreenLight: mod.CreateVector(0.678, 0.992, 0.525), // adfd86
    GreenDark: mod.CreateVector(0.278, 0.447, 0.212), // 477236

    YellowLight: mod.CreateVector(1, 0.988, 0.612), // fffc9c
    YellowDark: mod.CreateVector(0.443, 0.376, 0), // 716000
}

// -------- FILE: src\Core\AI\Modules\Debug\DebugWI.ts --------
// @stringkeys core.ai.debug.brain.memory: closestEnemy {}, vehicleToDrive {}, isInBattle {}, roamPos {}, arrivedPos {}

// @stringkeys core.ai.debug.brain.behaviors: fight, defend, idle, moveto, entervehicle

export interface CoreAI_IDebugWI {
    index: number
    worldIcon: mod.WorldIcon
}

export class CoreAI_DebugWI {
    /* private behavior: CoreAI_IDebugWI
    private stats: CoreAI_IDebugWI
    private battle: CoreAI_IDebugWI
    private calm: CoreAI_IDebugWI */

    private receiver: mod.Player
    private brain: CoreAI_Brain

    private behaviorWI: mod.WorldIcon
    private behaviorColorsMap: Map<string, mod.Vector> = new Map([
        ['fight', mod.CreateVector(1, 0, 0)],
        ['defend', mod.CreateVector(1, 1, 0)],
        ['idle', mod.CreateVector(1, 1, 1)],
        ['moveto', mod.CreateVector(0, 1, 1)],
        ['entervehicle', mod.CreateVector(0, 1, 0)],
    ])

    private roamPosWI: mod.WorldIcon
    private vehicleToDriveWI: mod.WorldIcon

    private memoryWIs: Map<keyof CoreAI_MemoryFields, mod.WorldIcon> = new Map()

    constructor(receiver: mod.Player, brain: CoreAI_Brain) {
        this.receiver = receiver
        this.brain = brain

        this.behaviorWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.behaviorWI, receiver)

        let i = 1
        for (const key of Object.keys(this.brain.memory.data) as Array<
            keyof typeof this.brain.memory.data
        >) {
            const wi = mod.SpawnObject(
                mod.RuntimeSpawn_Common.WorldIcon,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(0, 0, 0)
            )
            mod.SetWorldIconOwner(wi, receiver)

            this.memoryWIs.set(key, wi)
            i++
        }

        this.roamPosWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.roamPosWI, receiver)
        mod.SetWorldIconImage(this.roamPosWI, mod.WorldIconImages.Flag)
        mod.EnableWorldIconImage(this.roamPosWI, true)
        mod.SetWorldIconColor(this.roamPosWI, mod.CreateVector(0, 1, 1))

        this.vehicleToDriveWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.vehicleToDriveWI, receiver)
        mod.SetWorldIconImage(this.vehicleToDriveWI, mod.WorldIconImages.Assist)
        mod.EnableWorldIconImage(this.vehicleToDriveWI, true)
        mod.SetWorldIconColor(this.vehicleToDriveWI, mod.CreateVector(1, 1, 0))
    }

    update() {
        const isValid =
            mod.IsPlayerValid(this.brain.player) &&
            mod.GetSoldierState(this.brain.player, mod.SoldierStateBool.IsAlive)

        /**
         * Behavior
         */
        if (isValid) {
            mod.EnableWorldIconText(this.behaviorWI, true)
            mod.SetWorldIconPosition(
                this.behaviorWI,
                mod.CreateVector(
                    mod.XComponentOf(mod.GetObjectPosition(this.brain.player)),
                    mod.YComponentOf(mod.GetObjectPosition(this.brain.player)) +
                        this.getStackedIconOffset(
                            mod.DistanceBetween(
                                mod.GetObjectPosition(this.brain.player),
                                mod.GetObjectPosition(this.receiver)
                            ),
                            0,
                            0.6
                        ),
                    mod.ZComponentOf(mod.GetObjectPosition(this.brain.player))
                )
            )
            mod.SetWorldIconText(
                this.behaviorWI,
                mod.Message(
                    `core.ai.debug.brain.behaviors.${
                        this.brain.behaviorController.currentBehavior().name
                    }`
                )
            )
            mod.SetWorldIconColor(
                this.behaviorWI,
                this.behaviorColorsMap.get(
                    this.brain.behaviorController.currentBehavior().name
                )!
            )
        } else {
            mod.EnableWorldIconText(this.behaviorWI, false)
        }

        /**
         * Memory
         */
        let i = 1
        for (const [key, wi] of this.memoryWIs) {
            if (!isValid) {
                mod.EnableWorldIconText(wi, false)
                continue
            }

            mod.SetWorldIconColor(
                wi,
                this.brain.memory.getTimeRemaining(key) === 0
                    ? mod.CreateVector(1, 1, 1)
                    : mod.CreateVector(1, 1, 0)
            )
            mod.EnableWorldIconText(wi, true)
            mod.SetWorldIconPosition(
                wi,
                mod.CreateVector(
                    mod.XComponentOf(mod.GetObjectPosition(this.brain.player)),
                    mod.YComponentOf(mod.GetObjectPosition(this.brain.player)) +
                        this.getStackedIconOffset(
                            mod.DistanceBetween(
                                mod.GetObjectPosition(this.brain.player),
                                mod.GetObjectPosition(this.receiver)
                            ),
                            i,
                            0.6
                        ),
                    mod.ZComponentOf(mod.GetObjectPosition(this.brain.player))
                )
            )
            mod.SetWorldIconText(
                wi,
                mod.Message(
                    `core.ai.debug.brain.memory.${key}`,
                    this.brain.memory.getTimeRemaining(key)
                )
            )

            i++
        }

        /**
         * Roam navigation
         */
        if (this.brain.memory.get('roamPos')) {
            mod.SetWorldIconPosition(
                this.roamPosWI,
                this.brain.memory.get('roamPos')!
            )
            mod.EnableWorldIconImage(this.roamPosWI, true)
            mod.SetWorldIconText(
                this.roamPosWI,
                mod.Message(this.brain.memory.getTimeRemaining('roamPos'))
            )
            mod.EnableWorldIconText(this.roamPosWI, true)
        } else {
            mod.EnableWorldIconImage(this.roamPosWI, false)
            mod.EnableWorldIconText(this.roamPosWI, false)
        }

        /**
         * Vehicle to Drive navigation
         */
        if (this.brain.memory.get('vehicleToDrive')) {
            mod.SetWorldIconPosition(
                this.vehicleToDriveWI,
                mod.GetVehicleState(
                    this.brain.memory.get('vehicleToDrive')!,
                    mod.VehicleStateVector.VehiclePosition
                )
            )
            mod.EnableWorldIconImage(this.vehicleToDriveWI, true)
            mod.SetWorldIconText(
                this.vehicleToDriveWI,
                mod.Message(
                    this.brain.memory.getTimeRemaining('vehicleToDrive')
                )
            )
            mod.EnableWorldIconText(this.vehicleToDriveWI, true)
        } else {
            mod.EnableWorldIconImage(this.vehicleToDriveWI, false)
            mod.EnableWorldIconText(this.vehicleToDriveWI, false)
        }
    }

    private round2decimal(num: number): number {
        const factor = 10 /* * 10 // 100 */
        return Math.round(num * factor) / factor
    }

    private getIconOffset(d: number): number {
        const base = 1.9
        const upStart = 2
        const upEnd = 40
        const downEnd = 70
        const peakDelta = 0.9 // 2.8 - 1.9

        if (d <= upStart) return base
        if (d >= downEnd) return base

        // rising part: 2..40
        if (d < upEnd) {
            const t = (d - upStart) / (upEnd - upStart) // 0..1
            const bump = Math.pow(t, 0.5) // sqrt: fast early rise
            return base + peakDelta * bump
        }

        // falling part: 40..70
        const t = (d - upEnd) / (downEnd - upEnd) // 0..1
        const bump = Math.pow(1 - t, 0.8) // slower fall
        return base + peakDelta * bump
    }

    /**
     * Returns the vertical world offset for stacked icons.
     *
     * index = 0 -> base icon
     * index = 1 -> first icon above it
     * index = 2 -> second icon above it
     *
     * The gap is scaled by distance so icons appear visually snapped.
     */
    private getStackedIconOffset(d: number, index: number, gap = 0.4): number {
        // Base icon offset using your existing curve
        const baseOffset = this.getIconOffset(d)

        // Reference distance at which gap looks correct visually.
        // 20m is a good default for human-readable marker stacking.
        const reference = 20

        // Scale gap according to distance to compensate for perspective shrinking
        const scale = d / reference

        // Index=0 gives base offset
        if (index === 0) return baseOffset

        // Each stacked icon sits on top of the previous one
        return baseOffset + index * gap * scale
    }
}

// -------- FILE: src\Core\AI\IBrainEvents.ts --------
export interface CoreAI_IBrainEvents {
    // Lifecycle
    OnMoveFinished?(success: boolean): void
    OnBehaviorChanged?(previous: CoreAI_ABehavior, next: CoreAI_ABehavior): void
}

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\FightSensor.ts --------
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

    protected update(ctx: CoreAI_SensorContext): void {
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

    override onRayCastHit?(
        ctx: CoreAI_SensorContext,
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

    override onDamaged?(
        ctx: CoreAI_SensorContext,
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {
        ctx.memory.set('isInBattle', true, this.ttlMs)
    }
}

// -------- FILE: src\Core\AI\Brain.ts --------
/**
 * CoreAI_Brain
 *
 * Pure AI logic unit.
 *
 * Responsibilities:
 * - Perception
 * - Memory
 * - Behavior selection
 * - Behavior execution
 *
 * Does NOT:
 * - Attach itself to players
 * - Listen to player events directly
 * - Manage lifecycle bindings
 *
 * All player integration is handled by BrainComponent.
 */

// @stringkeys core.ai.bots: 1..32

export class CoreAI_Brain {
    public player: mod.Player

    public perception: CoreAI_Perception
    public memory: CoreAI_MemoryManager
    public behaviorController: CoreAI_BehaviorController
    public taskSelector: CoreAI_TaskSelector

    private debugWI: CoreAI_DebugWI | null = null
    private listeners: CoreAI_IBrainEvents[] = []

    constructor(
        player: mod.Player,
        profile: CoreAI_AProfile,
        enableDebug: boolean = false
    ) {
        this.player = player

        this.memory = new CoreAI_MemoryManager()
        this.perception = new CoreAI_Perception()
        this.behaviorController = new CoreAI_BehaviorController(this)
        this.taskSelector = new CoreAI_TaskSelector(this, profile)

        if (enableDebug)
            this.debugWI = new CoreAI_DebugWI(
                mod.FirstOf(mod.AllPlayers()),
                this
            )

        this.installProfile(profile)
    }

    /* ------------------------------------------------------------
     * Profile installation
     * ------------------------------------------------------------ */

    installProfile(profile: CoreAI_AProfile): void {
        this.taskSelector.setProfile(profile)

        this.perception.clearSensors()

        for (const factory of profile.sensors) {
            this.perception.addSensor(factory())
        }
    }

    /* ------------------------------------------------------------
     * Sensor API
     * ------------------------------------------------------------ */

    useSensor<T extends CoreAI_ASensor>(sensor: T): T {
        const ctor = sensor.constructor as Function
        this.perception.removeSensor(ctor)
        this.perception.addSensor(sensor)
        return sensor
    }

    removeSensor(ctor: Function): void {
        this.perception.removeSensor(ctor)
    }

    getSensor<T extends CoreAI_ASensor>(
        ctor: new (...args: any[]) => T
    ): T | undefined {
        return this.perception.getSensor(ctor)
    }

    getSensors(): readonly CoreAI_ASensor[] {
        return this.perception.getSensors()
    }

    /* ------------------------------------------------------------
     * Player lifecycle hooks (called by BrainComponent)
     * ------------------------------------------------------------ */

    onDeployed(): void {}

    reset(): void {
        this.perception.reset()
        this.memory.reset()
        this.behaviorController.resetAll()

        if (mod.IsPlayerValid(this.player)) {
            mod.AISetTarget(this.player)
        }
    }

    onUndeploy(): void {}

    /* ------------------------------------------------------------
     * Movement finished
     * ------------------------------------------------------------ */

    onMoveFinished(success: boolean): void {
        this.memory.set('roamPos', null)
        this.emit('OnMoveFinished', success)
    }

    /* ------------------------------------------------------------
     * Damage event
     * ------------------------------------------------------------ */

    onDamaged(
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {
        const fightSensor = this.getSensor(CoreAI_FightSensor)
        if (!fightSensor) return

        const sensorCtx: CoreAI_SensorContext = {
            player: this.player,
            memory: this.memory,
            time: this.memory.time,
        }

        fightSensor.onDamaged?.(
            sensorCtx,
            eventOtherPlayer,
            eventDamageType,
            eventWeaponUnlock
        )
    }

    /* ------------------------------------------------------------
     * Raycast hit event
     * ------------------------------------------------------------ */

    onRayCastHit(eventPoint: mod.Vector, eventNormal: mod.Vector): void {
        const fightSensor = this.getSensor(CoreAI_FightSensor)
        if (!fightSensor) return

        const sensorCtx: CoreAI_SensorContext = {
            player: this.player,
            memory: this.memory,
            time: this.memory.time,
        }

        fightSensor.onRayCastHit?.(sensorCtx, eventPoint, eventNormal)
    }

    /* ------------------------------------------------------------
     * Tick (called by BrainComponent)
     * ------------------------------------------------------------ */

    tick(): void {
        this.debugWI?.update()

        this.memory.time = Date.now()
        this.memory.prune()

        if (
            !mod.IsPlayerValid(this.player) ||
            !mod.GetSoldierState(this.player, mod.SoldierStateBool.IsAlive)
        ) {
            return
        }

        const enemy = this.memory.get('closestEnemy')
        if (enemy && mod.IsPlayerValid(enemy)) {
            mod.AISetTarget(this.player, enemy)
        } else {
            mod.AISetTarget(this.player)
        }

        const sensorCtx: CoreAI_SensorContext = {
            player: this.player,
            memory: this.memory,
            time: this.memory.time,
        }

        this.perception.update(sensorCtx)

        const before = this.behaviorController.currentBehavior()
        const next = this.taskSelector.chooseNextBehavior()

        this.behaviorController.change(next)

        const after = this.behaviorController.currentBehavior()
        if (after !== before) {
            this.emit('OnBehaviorChanged', before, after)
        }

        this.behaviorController.update()
    }

    /* ------------------------------------------------------------
     * Cleanup
     * ------------------------------------------------------------ */

    destroy(): void {
        this.memory.reset()
        this.behaviorController.resetAll()
        this.perception.clearSensors()
    }

    /* ------------------------------------------------------------
     * Brain event system
     * ------------------------------------------------------------ */

    addListener(listener: CoreAI_IBrainEvents): void {
        this.listeners.push(listener)
    }

    removeListener(listener: CoreAI_IBrainEvents): void {
        this.listeners = this.listeners.filter((l) => l !== listener)
    }

    emit<E extends keyof CoreAI_IBrainEvents>(
        event: E,
        ...args: Parameters<NonNullable<CoreAI_IBrainEvents[E]>>
    ): void {
        for (const listener of this.listeners) {
            const fn = listener[event]
            if (typeof fn === 'function') {
                ;(fn as (...a: any[]) => void)(...args)
            }
        }
    }
}

// -------- FILE: src\Core\AI\Modules\Behavior\Behaviors\FightBehavior.ts --------
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

// -------- FILE: src\Core\AI\Modules\Behavior\Behaviors\DefendBehavior.ts --------
/**
 * DefendBehavior:
 * Triggered when memory.defendPos has a value (set by DefendSensor or game logic).
 *
 * Behavior:
 * - Executes AIDefendPositionBehavior
 * - Continues as long as memory.defendPos exists
 * - Ends naturally when TTL clears defendPos and selector chooses another behavior
 *
 * NOTE:
 * - No internal timers
 * - No cleanup of memory.defendPos
 * - Pure execution-only behavior
 */
export class CoreAI_DefendBehavior extends CoreAI_ABehavior {
    public name = 'defend'

    private readonly defendPos: mod.Vector
    private readonly minDist: number
    private readonly maxDist: number

    constructor(
        brain: CoreAI_Brain,
        defendPos: mod.Vector,
        minDist: number,
        maxDist: number
    ) {
        super(brain)
        this.defendPos = defendPos
        this.minDist = minDist
        this.maxDist = maxDist
    }

    override enter(): void {
        super.enter()

        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) return

        mod.AIDefendPositionBehavior(
            player,
            this.defendPos,
            this.minDist,
            this.maxDist
        )
    }

    override update(): void {
        // NOTHING NEEDED.
        // TTL expiration in memory.defendPos decides when this behavior stops.
    }

    override exit(): void {
        super.exit()
        // No cleanup needed.
    }
}

// -------- FILE: src\Core\AI\Modules\Behavior\Behaviors\EnterVehicleBehavior.ts --------
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

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\ClosestEnemySensor.ts --------
/**
 * ClosestEnemySensor:
 * Detects the closest visible enemy and writes raw data into memory.
 *
 * Writes:
 * - memory.closestEnemy
 * - memory.roamPos
 *
 * Notes:
 * - No POIs are created.
 * - No behaviors are spawned.
 * - TaskSelector evaluates this memory to decide behavior.
 */
export class CoreAI_ClosestEnemySensor extends CoreAI_ASensor {
    constructor(
        private readonly sensitivity: number = 1,
        intervalMs: number = 2000,
        private readonly ttlMs: number = 8000 // parametric TTL
    ) {
        super(intervalMs)
    }

    protected update(ctx: CoreAI_SensorContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        const myPos = mod.GetObjectPosition(player)

        // Determine enemy team
        const myTeam = mod.GetObjId(mod.GetTeam(player))
        const enemyTeamId = myTeam === 1 ? 2 : 1
        const enemyTeamObj = mod.GetTeam(enemyTeamId)

        // Find closest visible enemy
        const newEnemy = mod.ClosestPlayerTo(myPos, enemyTeamObj)
        if (!mod.IsPlayerValid(newEnemy)) {
            // Clear enemy memory (TTL = immediate)
            ctx.memory.set('closestEnemy', null)
            // ctx.memory.set('roamPos', null)
            return
        }

        // Same enemy -> nothing to update
        if (ctx.memory.get('closestEnemy') === newEnemy) {
            return
        }

        // Probabilistic detection
        const enemyPos = mod.GetObjectPosition(newEnemy)

        const dist = mod.DistanceBetween(myPos, enemyPos)
        const prob = Math.exp(-0.12 * dist * (1.0 / this.sensitivity))
        if (Math.random() > prob) return

        // Write memory with TTL
        ctx.memory.set('closestEnemy', newEnemy, this.ttlMs)
    }
}

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\VehicleToDriveSensor.ts --------
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

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\ArrivalSensor.ts --------
/**
 * ArrivalSensor:
 *
 * Detects when AI arrives inside ONE OR MORE special semantic points:
 * - defend positions
 * - objective markers
 * - interact zones
 * - rally points
 *
 * This DOES NOT handle MoveTo arrival.
 * MoveToSensor handles movement arrival internally.
 *
 * This sensor is for high-level AI logic only.
 */
export class CoreAI_ArrivalSensor extends CoreAI_ASensor {
    private lastTriggerTime = 0

    constructor(
        private readonly getPoints: () => mod.Vector[],
        intervalMs: number = 500,
        private readonly distanceThreshold: number = 3.0, // arrival radius
        private readonly ttl: number = 2000, // arrival memory duration
        private readonly cooldownMs: number = 4000 // prevent spam-triggering
    ) {
        super(intervalMs)
    }

    protected update(ctx: CoreAI_SensorContext): void {
        const memory = ctx.memory
        const player = ctx.player

        if (!mod.IsPlayerValid(player)) return

        const now = ctx.time
        const myPos = mod.GetObjectPosition(player)

        const points = this.getPoints()
        if (!points || points.length === 0) return

        // ------------------------------------------------------------
        // Cooldown - do not retrigger too frequently
        // ------------------------------------------------------------
        if (this.lastTriggerTime > 0) {
            if (now - this.lastTriggerTime < this.cooldownMs) {
                return
            }
        }

        // ------------------------------------------------------------
        // Only detect new arrival if arrival memory expired
        // ------------------------------------------------------------
        if (memory.get('arrivedPos')) {
            return
        }

        // ------------------------------------------------------------
        // MAIN ARRIVAL CHECK
        // ------------------------------------------------------------
        for (const p of points) {
            const dist = mod.DistanceBetween(myPos, p)

            if (dist <= this.distanceThreshold) {
                // AI arrived to a special semantic point
                memory.set('arrivedPos', p, this.ttl)
                this.lastTriggerTime = now
                return
            }
        }
    }
}

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\RoamSensor.ts --------
/**
 * RoamSensor:
 * Picks a movement target from a list of points.
 *
 * Design:
 * - Direction-driven, no historical recents.
 * - While moving, backward targets are forbidden.
 * - Velocity is preferred when speed > threshold.
 * - Intent direction stabilizes steering across replans.
 */
export class CoreAI_RoamSensor extends CoreAI_ASensor {
    private readonly ttlMs: number

    private coldStart: boolean = true

    // Cached movement intent direction
    private lastIntentDir: mod.Vector | null = null

    constructor(
        private readonly getPoints: () => mod.Vector[],
        intervalMs: number = 750,
        ttlMs: number = 2000
    ) {
        super(intervalMs)
        this.ttlMs = ttlMs
    }

    override reset(): void {
        this.coldStart = true
        this.lastIntentDir = null
    }

    protected update(ctx: CoreAI_SensorContext): void {
        // Do not reselect while intent exists
        if (ctx.memory.get('roamPos')) {
            return
        }

        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        const points = this.getPoints()
        if (!points || points.length === 0) return

        const myPos = mod.GetObjectPosition(player)

        // ------------------------------------------------------------
        // Resolve forward direction
        // ------------------------------------------------------------

        const speed = mod.GetSoldierState(player, mod.SoldierStateNumber.Speed)

        let forward: mod.Vector | null = null

        // 1. True movement direction
        if (speed > 0.3) {
            const vel = mod.GetSoldierState(
                player,
                mod.SoldierStateVector.GetLinearVelocity
            )
            const lenSq = mod.DotProduct(vel, vel)

            if (lenSq > 0.1) {
                forward = mod.Normalize(vel)
                this.lastIntentDir = forward
            }
        }

        // 2. Cached intent
        if (!forward && this.lastIntentDir) {
            forward = this.lastIntentDir
        }

        // 3. Facing fallback
        if (!forward) {
            const face = mod.GetSoldierState(
                player,
                mod.SoldierStateVector.GetFacingDirection
            )
            forward = mod.Normalize(face)
            this.lastIntentDir = forward
        }

        // ------------------------------------------------------------
        // Build candidates
        // ------------------------------------------------------------

        const candidates: {
            pos: mod.Vector
            dist: number
            dot: number
        }[] = []

        const ARRIVAL_EXCLUDE_DIST = 3.0

        for (const pos of points) {
            const dist = mod.DistanceBetween(myPos, pos)

            // Already here, do not reselect
            if (dist < ARRIVAL_EXCLUDE_DIST) {
                continue
            }

            const dir = mod.DirectionTowards(myPos, pos)
            const dot = mod.DotProduct(forward, dir)

            candidates.push({ pos, dist, dot })
        }

        if (candidates.length === 0) return

        // ------------------------------------------------------------
        // While moving, forbid backward choices
        // ------------------------------------------------------------

        let usable = candidates

        if (speed > 0.5) {
            usable = candidates.filter((c) => c.dot > 0)
        }

        if (usable.length === 0) return

        // ------------------------------------------------------------
        // Pick best candidate
        // ------------------------------------------------------------

        let best = usable[0]
        let bestScore = -Infinity

        for (const c of usable) {
            const score = this.scoreCandidate(c)
            if (score > bestScore) {
                bestScore = score
                best = c
            }
        }

        // ------------------------------------------------------------
        // Commit
        // ------------------------------------------------------------

        ctx.memory.set('roamPos', best.pos, this.ttlMs)
        this.lastIntentDir = mod.DirectionTowards(myPos, best.pos)
        this.coldStart = false
    }

    private scoreCandidate(c: {
        pos: mod.Vector
        dist: number
        dot: number
    }): number {
        // Distance band scoring
        let distScore = 0
        if (c.dist <= 15) {
            distScore = c.dist / 15
        } else if (c.dist <= 40) {
            distScore = 1
        } else {
            const over = c.dist - 40
            distScore = over >= 20 ? 0 : 1 - over / 20
        }

        const dirScore = Math.max(0, c.dot)

        const jitterMax = this.coldStart ? 0.8 : 0.4
        const jitter = Math.random() * jitterMax

        return distScore * 0.7 + dirScore * 0.3 + jitter
    }
}

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\CapturePointSensor.ts --------
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

    protected update(ctx: CoreAI_SensorContext): void {
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

// -------- FILE: src\Core\AI\Modules\Perception\Sensors\CapturePointMoveToSensor.ts --------
/**
 * MoveToCapturePointSensor
 *
 * Purpose:
 * - Selects a movement target from a set of capture points.
 * - Chooses only capture points not owned by the player's team.
 *
 * Behavior:
 * - Evaluates distance to all valid capture points.
 * - Keeps the two closest candidates.
 * - Randomly selects between the closest and second-closest target
 *   to reduce AI clustering.
 *
 * Memory:
 * - Writes `roamPos` intent with a TTL.
 * - Does not reselect while a valid `roamPos` intent exists.
 *
 * Notes:
 * - No pathfinding or movement logic (sensor-only).
 * - Selection is distance-based only; higher-level pressure or
 *   role-based logic can be layered later.
 */
export class CoreAI_CapturePointMoveToSensor extends CoreAI_ASensor {
    private readonly ttlMs: number

    constructor(
        private readonly getCapturePoints: () => mod.CapturePoint[],
        intervalMs: number = 750,
        ttlMs: number = 6000
    ) {
        super(intervalMs)
        this.ttlMs = ttlMs
    }

    override reset(): void {}

    protected update(ctx: CoreAI_SensorContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        // Do not reselect while intent exists
        if (ctx.memory.get('roamPos')) return

        const capturePoints = this.getCapturePoints()
        if (!capturePoints || capturePoints.length === 0) return

        // ------------------------------------------------------------
        //
        // ------------------------------------------------------------

        const playerPos = mod.GetObjectPosition(player)

        const playerTeamId = mod.GetObjId(mod.GetTeam(player))

        // store up to two closest
        let closest: { pos: mod.Vector; dist: number } | null = null
        let secondClosest: { pos: mod.Vector; dist: number } | null = null

        for (const cp of capturePoints) {
            const owner = mod.GetCurrentOwnerTeam(cp)

            // exclude CPs already owned by player team
            if (mod.GetObjId(owner) === playerTeamId) {
                continue
            }

            const cpPos = mod.GetObjectPosition(cp)
            const dist = mod.DistanceBetween(playerPos, cpPos)

            if (!closest || dist < closest.dist) {
                secondClosest = closest
                closest = { pos: cpPos, dist }
            } else if (!secondClosest || dist < secondClosest.dist) {
                secondClosest = { pos: cpPos, dist }
            }
        }

        if (!closest) {
            return
        }

        // only one candidate
        if (!secondClosest) {
            ctx.memory.set('roamPos', closest.pos, this.ttlMs)
            return
        }

        // ------------------------------------------------------------
        // Commit
        // ------------------------------------------------------------

        ctx.memory.set(
            'roamPos',
            Math.random() < 1 ? closest.pos : secondClosest.pos,
            this.ttlMs
        )
    }
}

// -------- FILE: src\Core\AI\Profiles\BaseProfile.ts --------
export type CoreAI_BaseProfileOptions = CoreAI_SensorOptions

export class CoreAI_BaseProfile extends CoreAI_AProfile {
    constructor(options: CoreAI_BaseProfileOptions = {}) {
        super()

        this.scoring = [
            {
                score: (brain) => {
                    const m = brain.memory
                    return m.get('isInBattle') ? 200 : 0
                },
                factory: (brain) =>
                    new CoreAI_FightBehavior(brain, this.getMoveMode(brain)),
            },

            {
                score: (brain) => (brain.memory.get('closestEnemy') ? 150 : 0),
                factory: (brain) => {
                    const enemy = brain.memory.get('closestEnemy')!
                    const pos = mod.GetSoldierState(
                        enemy,
                        mod.SoldierStateVector.GetPosition
                    )

                    return new CoreAI_MoveToBehavior(
                        brain,
                        pos,
                        mod.MoveSpeed.InvestigateRun,
                        this.getMoveMode(brain)
                    )
                },
            },

            {
                score: (brain) =>
                    brain.memory.get('vehicleToDrive') ? 290 : 0,
                factory: (brain) => {
                    const vehicle = brain.memory.get('vehicleToDrive')!
                    const vPos = mod.GetVehicleState(
                        vehicle,
                        mod.VehicleStateVector.VehiclePosition
                    )
                    const dist = mod.DistanceBetween(
                        mod.GetObjectPosition(brain.player),
                        vPos
                    )

                    if (dist <= 5.0) {
                        return new CoreAI_EnterVehicleBehavior(
                            brain,
                            vehicle,
                            0,
                            5.0
                        )
                    }

                    return new CoreAI_MoveToBehavior(
                        brain,
                        vPos,
                        Math.random() < 0.7
                            ? mod.MoveSpeed.Sprint
                            : mod.MoveSpeed.Run,
                        'onFoot',
                        2.0,
                        false
                    )
                },
            },

            {
                score: (brain) => (brain.memory.get('arrivedPos') ? 120 : 0),
                factory: (brain) =>
                    new CoreAI_DefendBehavior(
                        brain,
                        brain.memory.get('arrivedPos')!,
                        2.0,
                        8.0
                    ),
            },

            {
                score: (brain) => (brain.memory.get('roamPos') ? 20 : 0),
                factory: (brain) => {
                    const mode = this.getMoveMode(brain)

                    return new CoreAI_MoveToBehavior(
                        brain,
                        brain.memory.get('roamPos')!,
                        Math.random() < 0.3
                            ? mod.MoveSpeed.Sprint
                            : mod.MoveSpeed.Run,
                        mode,
                        mode === 'onFoot' ? 3.0 : 6.0
                    )
                },
            },
        ] as CoreAI_ITaskScoringEntry[]

        this.buildSensors(options)
    }

    /**
     *
     */

    protected getMoveMode(brain: { player: mod.Player }): 'onFoot' | 'onDrive' {
        const player = brain.player
        if (!mod.IsPlayerValid(player)) return 'onFoot'

        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle)) {
            return 'onFoot'
        }

        if (mod.GetPlayerVehicleSeat(player) === 0) {
            return 'onDrive'
        }

        return 'onFoot'
    }

    /**
     * Shared sensor wiring for universal profiles.
     * Extend this class to add game-mode specific sensors.
     */

    protected buildSensors(options: CoreAI_BaseProfileOptions): void {
        this.addSensorIf(
            options.fightSensor,
            () =>
                new CoreAI_FightSensor(
                    options.fightSensor?.intervalMs,
                    options.fightSensor?.ttlMs
                )
        )

        this.addSensorIf(
            options.closestEnemySensor,
            () =>
                new CoreAI_ClosestEnemySensor(
                    options.closestEnemySensor?.sensitivity,
                    options.closestEnemySensor?.intervalMs,
                    options.closestEnemySensor?.ttlMs
                )
        )

        this.addSensorIf(
            options.vehicleToDriveSensor,
            () =>
                new CoreAI_VehicleToDriveSensor(
                    options.vehicleToDriveSensor?.radius,
                    options.vehicleToDriveSensor?.intervalMs,
                    options.vehicleToDriveSensor?.ttlMs
                )
        )

        this.addSensorIf(
            options.arrivalSensor?.getWPs,
            () =>
                new CoreAI_ArrivalSensor(
                    () => options.arrivalSensor!.getWPs!(),
                    options.arrivalSensor?.intervalMs,
                    options.arrivalSensor?.distanceThreshold,
                    options.arrivalSensor?.ttlMs,
                    options.arrivalSensor?.cooldownMs
                )
        )

        this.addSensorIf(
            options.capturePointSensor,
            () =>
                new CoreAI_CapturePointSensor(
                    options.capturePointSensor?.intervalMs,
                    options.capturePointSensor?.ttlMs
                )
        )

        this.addSensorIf(
            options.moveToCapturePointSensor?.getCapturePoints,
            () =>
                new CoreAI_CapturePointMoveToSensor(
                    () => options.moveToCapturePointSensor!.getCapturePoints!(),
                    options.moveToCapturePointSensor?.intervalMs,
                    options.moveToCapturePointSensor?.ttlMs
                )
        )

        this.addSensorIf(
            options.roamSensor?.getWPs,
            () =>
                new CoreAI_RoamSensor(
                    () => options.roamSensor!.getWPs!(),
                    options.roamSensor?.intervalMs,
                    options.roamSensor?.ttlMs
                )
        )
    }
}

// -------- FILE: src\Core\AI\Profiles\CombatantProfile.ts --------
export type CoreAI_CombatantProfileOptions = CoreAI_SensorOptions

export class CoreAI_CombatantProfile extends CoreAI_BaseProfile {
    constructor(options: CoreAI_CombatantProfileOptions = {}) {
        super(options)

        /* this.scoring = [
            // your custom scoring entries here
        ] */
    }
}

// -------- FILE: src\Core\Player\Components\AI\BrainComponent.ts --------
// src/Core/AI/Components/BrainComponent.ts
/**
 * BrainComponent
 *
 * AI behavior component attached to a logical player.
 * Created and configured by GameMode.
 */
export class CorePlayer_BrainComponent implements CorePlayer_IComponent {
    public readonly brain: CoreAI_Brain

    private ap!: CorePlayer_APlayer

    constructor(brain: CoreAI_Brain) {
        this.brain = brain
    }

    onAttach(ap: CorePlayer_APlayer): void {
        this.ap = ap

        // Hook brain tick into player ongoing tick
        ap.addListener({
            OngoingPlayer: () => {
                this.brain.tick()
            },
            OnPlayerDamaged: (other, damageType, weapon) => {
                if (!other) return
                this.brain.onDamaged(other.player, damageType, weapon)
            },
            OnRayCastHit: (eventPoint, eventNormal) => {
                this.brain.onRayCastHit(eventPoint, eventNormal)
            },
            OnAIMoveToSucceeded: () => {
                this.brain.onMoveFinished(true)
            },
            OnAIMoveToFailed: () => {
                this.brain.onMoveFinished(false)
            },
            OnPlayerDied: () => {
                this.brain.reset()
            },
            OnPlayerUndeploy: () => {
                this.brain.reset()
            },
        })
    }

    onDetach(ap: CorePlayer_APlayer): void {
        this.brain.destroy()
    }

    /**
     * Called automatically by APlayer.rebindTo()
     * when the soldier object changes.
     */
    onRebind(newPlayer: mod.Player): void {
        this.brain.player = newPlayer
    }
}

// -------- FILE: src\Core\Squad\Squad.ts --------
export class Core_Squad {
    private members: CorePlayer_APlayer[] = []
    private leader: CorePlayer_APlayer | null = null

    private gameMode: Core_AGameMode
    private teamId: number
    private maxSlots: number

    constructor(
        gameMode: Core_AGameMode,
        teamId: number,
        maxSlots: number = 4
    ) {
        this.gameMode = gameMode
        this.teamId = teamId
        this.maxSlots = maxSlots

        this.gameMode.addListener({
            OngoingGlobal: () => {},
        })
    }

    /* ------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------ */

    getTeamId(): number {
        return this.teamId
    }

    getMaxSlots(): number {
        return this.maxSlots
    }

    freeSlots(): number {
        return this.maxSlots - this.members.length
    }

    getMembers(): CorePlayer_APlayer[] {
        return this.members
    }

    getLeader(): CorePlayer_APlayer | null {
        return this.leader
    }

    removeMember(ap: CorePlayer_APlayer): void {
        const index = this.members.indexOf(ap)
        if (index === -1) return

        this.members.splice(index, 1)

        if (this.leader === ap) {
            this.leader = this.members[0] ?? null
        }
    }

    /* ------------------------------------------------------------
     * Member management
     * ------------------------------------------------------------ */

    addMember(ap: CorePlayer_APlayer): void {
        if (this.freeSlots() <= 0) return

        this.members.push(ap)

        if (!this.leader) {
            this.leader = ap
        }

        // Followers only (leader keeps its current behavior)
        if (ap === this.leader) {
            return
        }

        const brainComp = ap.getComponent(CorePlayer_BrainComponent)
        if (!brainComp) {
            return
        }

        // Assign combatant profile configured to follow leader
        const profile = new CoreAI_CombatantProfile({
            roamSensor: {
                getWPs: () => {
                    const p = this.getSquadPoint()
                    return p ? [p] : []
                },
            },
            arrivalSensor: {
                getWPs: () => {
                    const p = this.getSquadPoint()
                    return p ? [p] : []
                },
                cooldownMs: 0,
                distanceThreshold: 5,
                ttlMs: 4000,
            },
        })
        brainComp.brain.installProfile(profile)
    }

    /* ------------------------------------------------------------
     * Squad follow point
     * ------------------------------------------------------------ */

    private getSquadPoint(): mod.Vector | null {
        if (this.leader) {
            if (
                !mod.GetSoldierState(
                    this.leader.player,
                    mod.SoldierStateBool.IsAlive
                )
            ) {
                return null
            }
            return mod.GetObjectPosition(this.leader.player)
        }
        return null
    }
}

// -------- FILE: src\Core\Squad\SquadManager.ts --------
export class Core_SquadManager {
    private gameMode: Core_AGameMode
    private squads: Core_Squad[] = []
    private maxSlots: number

    constructor(gameMode: Core_AGameMode, maxSlots: number = 4) {
        this.gameMode = gameMode
        this.maxSlots = maxSlots
    }

    /* ------------------------------------------------------------
     * Player Join
     * ------------------------------------------------------------ */
    async addToSquad(ap: CorePlayer_APlayer): Promise<Core_Squad> {
        const teamId = mod.GetObjId(mod.GetTeam(ap.player))

        // Find squad with same team + free slots
        let squad = this.squads.find(
            (s) => s.getTeamId() === teamId && s.freeSlots() > 0
        )

        // Create new squad if no free one exists
        if (!squad) {
            squad = new Core_Squad(this.gameMode, teamId, this.maxSlots)
            this.squads.push(squad)
        }

        squad.addMember(ap)
        return squad
    }

    /* ------------------------------------------------------------
     * Player Leave
     * ------------------------------------------------------------ */
    removeFromSquad(ap: CorePlayer_APlayer): void {
        for (const squad of this.squads) {
            squad.removeMember(ap)
        }

        // Remove empty squads
        this.squads = this.squads.filter((s) => s.getMembers().length > 0)
    }

    /* ------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------ */
    getSquad(ap: CorePlayer_APlayer): Core_Squad | undefined {
        return this.squads.find((s) => s.getMembers().includes(ap))
    }

    getSquadsByTeam(teamId: number): Core_Squad[] {
        return this.squads.filter((s) => s.getTeamId() === teamId)
    }

    getAllSquads(): Core_Squad[] {
        return this.squads
    }
}

// -------- FILE: src\Core\Player\Components\Protection\ProtectionComponent.ts --------
export class CorePlayer_ProtectionComponent implements CorePlayer_IComponent {
    private ap!: CorePlayer_APlayer
    private active: boolean = false
    private deactivateAt: number = 0

    onAttach(ap: CorePlayer_APlayer): void {
        this.ap = ap

        ap.addListener({
            OngoingPlayer: () => {
                if (!this.active) return

                if (this.deactivateAt > 0 && Date.now() >= this.deactivateAt) {
                    this.deactivate()
                }
            },
        })
    }

    onDetach(ap: CorePlayer_APlayer): void {
        this.active = false
        this.deactivateAt = 0
    }

    activate(durationSec?: number): void {
        this.active = true

        mod.SetPlayerIncomingDamageFactor(this.ap.player, 0)

        if (durationSec && durationSec > 0) {
            this.deactivateAt = Date.now() + durationSec * 1000
        } else {
            this.deactivateAt = 0
        }
    }

    deactivate(): void {
        this.active = false
        this.deactivateAt = 0

        // BUG: setting 1 does NOT work
        mod.SetPlayerIncomingDamageFactor(this.ap.player, 0.999)
    }

    isActive(): boolean {
        return this.active
    }
}

// -------- FILE: src\GameModes\Playground\Player\Player.ts --------
export class Player extends CorePlayer_APlayer {
    protectionComp: CorePlayer_ProtectionComponent

    constructor(player: mod.Player) {
        super(player)

        this.protectionComp = new CorePlayer_ProtectionComponent()
        this.addComponent(this.protectionComp)

        this.addListener({
            OnPlayerDeployed: () => {
                // spawn protection
                this.isLogicalAI()
                    ? this.protectionComp.activate(5)
                    : this.protectionComp.activate(5)

                const brainComp = this.getComponent(CorePlayer_BrainComponent)
                if (brainComp) {
                    brainComp.brain.installProfile(PG_GameMode.infantryProfile)
                }

                // mod.SetCameraTypeForPlayer(this.player, mod.Cameras.ThirdPerson)
                // mod.AIEnableShooting(this.player, false)
            },

            OnPlayerEnterVehicleSeat: (eventVehicle, eventSeat) => {
                const brainComp = this.getComponent(CorePlayer_BrainComponent)
                if (brainComp) {
                    if (mod.GetPlayerVehicleSeat(this.player) !== 0) {
                        return
                    }

                    brainComp.brain.installProfile(PG_GameMode.driverProfile)
                }
            },

            OnPlayerExitVehicle: (eventVehicle) => {
                const brainComp = this.getComponent(CorePlayer_BrainComponent)
                if (brainComp) {
                    brainComp.brain.installProfile(PG_GameMode.infantryProfile)
                }
            },
        })
    }
}

// -------- FILE: src\GameModes\Playground\Player\PlayerManager.ts --------
export class PlayerManager extends CorePlayer_APlayerManager {
    constructor() {
        super(Player)
    }
}

// -------- FILE: src\GameModes\Playground\Services\CapturePointTimeService.ts --------
export class CapturePointTimeService {
    private readonly captureProgressMap = new Map<
        number,
        {
            captureProgress: number
            isCapturing: boolean | null
        }
    >()

    constructor(
        private readonly gameMode: PG_GameMode,
        private readonly time: number = 3
    ) {
        this.gameMode.addListener(this)
    }

    OngoingCapturePoint(eventCapturePoint: mod.CapturePoint): void {
        const captureProgress = mod.GetCaptureProgress(eventCapturePoint)

        if (captureProgress === 0 || captureProgress === 1) {
            return
        }

        const capturePointId = mod.GetObjId(eventCapturePoint)

        let entry = this.captureProgressMap.get(capturePointId)

        if (!entry) {
            entry = {
                captureProgress,
                isCapturing: null,
            }
            this.captureProgressMap.set(capturePointId, entry)
        }

        if (captureProgress < entry.captureProgress) {
            // Neutralization
            if (entry.isCapturing !== false) {
                mod.SetCapturePointNeutralizationTime(
                    eventCapturePoint,
                    this.time
                )
            }

            this.captureProgressMap.set(capturePointId, {
                captureProgress,
                isCapturing: false,
            })
        } else {
            // Capturing
            if (entry.isCapturing !== true) {
                mod.SetCapturePointCapturingTime(eventCapturePoint, this.time)
            }

            this.captureProgressMap.set(capturePointId, {
                captureProgress,
                isCapturing: true,
            })
        }
    }
}

// -------- FILE: src\GameModes\Playground\PG_GameMode.ts --------
export class PG_GameMode extends Core_AGameMode {
    protected override createPlayerManager(): CorePlayer_APlayerManager {
        return new PlayerManager()
    }

    private AI_UNSPAWN_DELAY = 10
    private AI_COUNT_TEAM_1 = 1
    private AI_COUNT_TEAM_2 = 0

    private squadManager: Core_SquadManager | null = null

    public static infantryProfile: CoreAI_BaseProfile =
        new CoreAI_CombatantProfile({
            fightSensor: {
                ttlMs: 10_000,
            },
            closestEnemySensor: {},
            /* roamSensor: {
                getWPs: () => PG_GameMode.getRangeWPs(1000, 1010),
                ttlMs: 4_000,
            }, */
            vehicleToDriveSensor: {
                radius: 100,
            },
            capturePointSensor: {},
        })

    public static driverProfile: CoreAI_BaseProfile =
        new CoreAI_CombatantProfile({
            fightSensor: {
                ttlMs: 10_000,
            },
            roamSensor: {
                getWPs: () => PG_GameMode.getRangeWPs(1106, 1107),
                ttlMs: 60_000,
            },
            capturePointSensor: {},
            /* arrivalSensor: {
                getWPs: () => this.getRangeWPs(1106, 1107),
                ttlMs: 20_000,
                cooldownMs: 40_000,
            }, */
        })

    protected override OnGameModeStarted(): void {
        // One-time game setup (rules, scoreboard, AI bootstrap)
        // mod.SetAIToHumanDamageModifier(2)
        mod.SetFriendlyFire(true)
        new CapturePointTimeService(this, 5)

        // mod.EnableGameModeObjective(mod.GetCapturePoint(2), false)

        mod.SetCapturePointOwner(mod.GetCapturePoint(1), mod.GetTeam(2))
        mod.SetCapturePointOwner(mod.GetCapturePoint(2), mod.GetTeam(128))
        console.log(
            mod.GetObjId(mod.GetCurrentOwnerTeam(mod.GetCapturePoint(2)))
        )

        // Spawn initial logical bots
        for (let i = 1; i <= this.AI_COUNT_TEAM_1; i++) {
            mod.Wait(1).then(() =>
                this.playerManager.spawnLogicalBot(
                    mod.SoldierClass.Engineer,
                    1,
                    mod.GetObjectPosition(mod.GetHQ(1)),
                    mod.Message(`core.ai.bots.${i}`),
                    this.AI_UNSPAWN_DELAY
                )
            )
        }

        for (let j = 1; j <= this.AI_COUNT_TEAM_2; j++) {
            mod.Wait(1).then(() =>
                this.playerManager.spawnLogicalBot(
                    mod.SoldierClass.Engineer,
                    2,
                    mod.GetObjectPosition(mod.GetHQ(2)),
                    mod.Message(`core.ai.bots.${this.AI_COUNT_TEAM_1 + j}`),
                    this.AI_UNSPAWN_DELAY
                )
            )
        }
    }

    /*
     *
     */

    protected override async OnLogicalPlayerJoinGame(
        lp: CorePlayer_APlayer
    ): Promise<void> {
        // Attach AI brain to logical AI players only
        if (lp.isAI()) {
            /* if (lp.teamId === 1) {
                await mod.Wait(5)
                mod.ForcePlayerToSeat(lp.player, this.vehicle!, -1)
            } */

            const brain = new CoreAI_Brain(
                lp.player,
                PG_GameMode.infantryProfile,
                true
            )

            lp.addComponent(new CorePlayer_BrainComponent(brain))
        }

        // Ensure squad system exists and register the player
        if (!this.squadManager) {
            this.squadManager = new Core_SquadManager(this, 2)
        }

        // this.squadManager.addToSquad(lp)
    }

    protected override OnPlayerLeaveGame(eventNumber: number): void {
        const lp = this.playerManager.getById(eventNumber)
        if (!lp) return

        // Keep logical AI persistent by respawning its identity
        if (lp.isLogicalAI()) {
            this.playerManager.respawnLogicalBot(
                lp,
                mod.GetObjectPosition(mod.GetHQ(lp.teamId)),
                this.AI_UNSPAWN_DELAY
            )
        }
    }

    private static getRangeWPs(from: number, to: number): mod.Vector[] {
        const out: mod.Vector[] = []

        for (let id = from; id <= to; id++) {
            const wp = mod.GetSpatialObject(id)
            out.push(mod.GetObjectPosition(wp))
        }

        return out
    }
}

// -------- FILE: src\main.ts --------
/**
 * Core_AGameMode
 *
 * High-level explanation:
 * -----------------------
 * This class is the central event router and base implementation of all
 * game modes. The Battlefield 6 modding API exposes a large set of raw
 * engine events (such as OnPlayerDied, OnPlayerDamaged, OngoingGlobal, etc).
 * Game modes need a safe and structured way to handle these events without
 * directly dealing with low-level engine Player objects.
 *
 * This class provides that structure.
 *
 * Architecture:
 * -------------
 * 1. _internal (router object)
 *    - Public object containing functions that match the exact signature
 *      of the mod EventHandlerSignatures namespace.
 *    - main.ts must call these functions.
 *    - They are public on purpose, but live inside a child object so they do
 *      NOT appear as override options in derived game mode classes.
 *    - Each router function:
 *        a) Receives raw engine parameters.
 *        b) Converts mod.Player into CorePlayer_APlayer using PlayerManager.
 *        c) Notifies PlayerManager of state changes.
 *        d) Forwards the event to the corresponding protected hook method.
 *
 * 2. Protected hook methods
 *    - These methods represent the actual game mode logic.
 *    - They use CorePlayer_APlayer instead of raw mod.Player.
 *    - Game mode classes (such as TDM_GameMode) override these to implement
 *      their own behavior.
 *    - Example:
 *         protected OnPlayerDied(lp: CorePlayer_APlayer, ...)
 *    - These are clean API methods that mod developers should override.
 *
 * 3. PlayerManager integration
 *    - The PlayerManager tracks logical player state across deploy, death,
 *      team switching, mandown, etc.
 *    - The router updates the PlayerManager before calling the hook so
 *      derived game modes always receive correct state.
 *    - The PlayerManager is created lazily on first OnPlayerJoinGame.
 *
 * 4. Event flow summary
 *    Engine -> main.ts -> _internal.OnX -> PlayerManager -> protected OnX
 *
 * Why this design:
 * ----------------
 * - Prevents accidental overriding of internal routing functions.
 * - Keeps the public API for game mode developers small and predictable.
 * - Ensures all events follow the exact lifecycle rules consistently.
 * - Avoids exposing low-level engine Player objects in game mode code.
 * - Prevents autocomplete pollution with dozens of internal methods.
 *
 * What game mode authors should do:
 * ---------------------------------
 * - Override protected hook methods only (OnPlayerDied, OnPlayerJoinGame, etc).
 * - Never call functions inside _internal directly.
 * - Never override or modify _internal, PlayerManager, or routing logic.
 * - Use CorePlayer_APlayer values passed into hooks, never store mod.Player.
 *
 * Summary:
 * --------
 * Core_AGameMode acts as a stable event bridge between the BF6 engine event
 * system and high-level game mode logic. Its purpose is to enforce a clean
 * separation between routing and gameplay code, unify PlayerManager access,
 * and ensure that custom game modes behave consistently with the engine rules.
 */
// import { PRSR_GameMode } from './GameModes/Pressure/PRSR_GameMode'
// import { TPL_GameMode } from './GameModes/Template/TPL_GameMode'
// import { TDM_GameMode } from './GameModes/TDM/TDM_GameMode'

const gameMode: Core_AGameMode = new PG_GameMode()

// This will trigger every engine tick while the gamemode is running.
export function OngoingGlobal(): void {
    gameMode._internal.OngoingGlobal()
}

// This will trigger every tick for each AreaTrigger.
export function OngoingAreaTrigger(eventAreaTrigger: mod.AreaTrigger): void {
    gameMode._internal.OngoingAreaTrigger(eventAreaTrigger)
}

// This will trigger every tick for each CapturePoint.
export function OngoingCapturePoint(eventCapturePoint: mod.CapturePoint): void {
    gameMode._internal.OngoingCapturePoint(eventCapturePoint)
}

// This will trigger every tick for each EmplacementSpawner.
export function OngoingEmplacementSpawner(
    eventEmplacementSpawner: mod.EmplacementSpawner
): void {
    gameMode._internal.OngoingEmplacementSpawner(eventEmplacementSpawner)
}

// This will trigger every tick for the HQ object.
export function OngoingHQ(eventHQ: mod.HQ): void {
    gameMode._internal.OngoingHQ(eventHQ)
}

// This will trigger every tick for each InteractPoint.
export function OngoingInteractPoint(
    eventInteractPoint: mod.InteractPoint
): void {
    gameMode._internal.OngoingInteractPoint(eventInteractPoint)
}

// This will trigger every tick for each LootSpawner.
export function OngoingLootSpawner(eventLootSpawner: mod.LootSpawner): void {
    gameMode._internal.OngoingLootSpawner(eventLootSpawner)
}

// This will trigger every tick for each MCOM.
export function OngoingMCOM(eventMCOM: mod.MCOM): void {
    gameMode._internal.OngoingMCOM(eventMCOM)
}

// This will trigger every tick for each Player.
export function OngoingPlayer(eventPlayer: mod.Player): void {
    gameMode._internal.OngoingPlayer(eventPlayer)
}

// This will trigger every tick for each RingOfFire.
export function OngoingRingOfFire(eventRingOfFire: mod.RingOfFire): void {
    gameMode._internal.OngoingRingOfFire(eventRingOfFire)
}

// This will trigger every tick for each Sector.
export function OngoingSector(eventSector: mod.Sector): void {
    gameMode._internal.OngoingSector(eventSector)
}

// This will trigger every tick for each Spawner.
export function OngoingSpawner(eventSpawner: mod.Spawner): void {
    gameMode._internal.OngoingSpawner(eventSpawner)
}

// This will trigger every tick for each SpawnPoint.
export function OngoingSpawnPoint(eventSpawnPoint: mod.SpawnPoint): void {
    gameMode._internal.OngoingSpawnPoint(eventSpawnPoint)
}

// This will trigger every tick for each Team.
export function OngoingTeam(eventTeam: mod.Team): void {
    gameMode._internal.OngoingTeam(eventTeam)
}

// This will trigger every tick for each Vehicle.
export function OngoingVehicle(eventVehicle: mod.Vehicle): void {
    gameMode._internal.OngoingVehicle(eventVehicle)
}

// This will trigger every tick for each VehicleSpawner.
export function OngoingVehicleSpawner(
    eventVehicleSpawner: mod.VehicleSpawner
): void {
    gameMode._internal.OngoingVehicleSpawner(eventVehicleSpawner)
}

// This will trigger every tick for each WaypointPath.
export function OngoingWaypointPath(eventWaypointPath: mod.WaypointPath): void {
    gameMode._internal.OngoingWaypointPath(eventWaypointPath)
}

// This will trigger every tick for each WorldIcon.
export function OngoingWorldIcon(eventWorldIcon: mod.WorldIcon): void {
    gameMode._internal.OngoingWorldIcon(eventWorldIcon)
}

// This will trigger when an AI Soldier stops moving to a destination.
export function OnAIMoveToFailed(eventPlayer: mod.Player): void {
    gameMode._internal.OnAIMoveToFailed(eventPlayer)
}

// This will trigger when an AI Soldier starts moving to a destination.
export function OnAIMoveToRunning(eventPlayer: mod.Player): void {
    gameMode._internal.OnAIMoveToRunning(eventPlayer)
}

// This will trigger when an AI Soldier reaches its destination.
export function OnAIMoveToSucceeded(eventPlayer: mod.Player): void {
    gameMode._internal.OnAIMoveToSucceeded(eventPlayer)
}

// This will trigger when an AI Soldier parachute action is running.
export function OnAIParachuteRunning(eventPlayer: mod.Player): void {
    gameMode._internal.OnAIParachuteRunning(eventPlayer)
}

// This will trigger when an AI Soldier parachute action succeeds.
export function OnAIParachuteSucceeded(eventPlayer: mod.Player): void {
    gameMode._internal.OnAIParachuteSucceeded(eventPlayer)
}

// This will trigger when an AI Soldier stops following a waypoint.
export function OnAIWaypointIdleFailed(eventPlayer: mod.Player): void {
    gameMode._internal.OnAIWaypointIdleFailed(eventPlayer)
}

// This will trigger when an AI Soldier starts following a waypoint.
export function OnAIWaypointIdleRunning(eventPlayer: mod.Player): void {
    gameMode._internal.OnAIWaypointIdleRunning(eventPlayer)
}

// This will trigger when an AI Soldier finishes following a waypoint.
export function OnAIWaypointIdleSucceeded(eventPlayer: mod.Player): void {
    gameMode._internal.OnAIWaypointIdleSucceeded(eventPlayer)
}

// This will trigger when a team captures a CapturePoint.
export function OnCapturePointCaptured(
    eventCapturePoint: mod.CapturePoint
): void {
    gameMode._internal.OnCapturePointCaptured(eventCapturePoint)
}

// This will trigger when a team starts capturing a CapturePoint.
export function OnCapturePointCapturing(
    eventCapturePoint: mod.CapturePoint
): void {
    gameMode._internal.OnCapturePointCapturing(eventCapturePoint)
}

// This will trigger when a team loses control of a CapturePoint.
export function OnCapturePointLost(eventCapturePoint: mod.CapturePoint): void {
    gameMode._internal.OnCapturePointLost(eventCapturePoint)
}

// This will trigger when the gamemode ends.
export function OnGameModeEnding(): void {
    gameMode._internal.OnGameModeEnding()
}

// This will trigger at the start of the gamemode.
export function OnGameModeStarted(): void {
    gameMode._internal.OnGameModeStarted()
}

// This will trigger when a Player enters mandown state.
export function OnMandown(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player
): void {
    gameMode._internal.OnMandown(eventPlayer, eventOtherPlayer)
}

// This will trigger when a MCOM is armed.
export function OnMCOMArmed(eventMCOM: mod.MCOM): void {
    gameMode._internal.OnMCOMArmed(eventMCOM)
}

// This will trigger when a MCOM is defused.
export function OnMCOMDefused(eventMCOM: mod.MCOM): void {
    gameMode._internal.OnMCOMDefused(eventMCOM)
}

// This will trigger when a MCOM is detonated.
export function OnMCOMDestroyed(eventMCOM: mod.MCOM): void {
    gameMode._internal.OnMCOMDestroyed(eventMCOM)
}

// This will trigger when a Player takes damage.
export function OnPlayerDamaged(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player,
    eventDamageType: mod.DamageType,
    eventWeaponUnlock: mod.WeaponUnlock
): void {
    gameMode._internal.OnPlayerDamaged(
        eventPlayer,
        eventOtherPlayer,
        eventDamageType,
        eventWeaponUnlock
    )
}

// This will trigger whenever a Player deploys.
export function OnPlayerDeployed(eventPlayer: mod.Player): void {
    gameMode._internal.OnPlayerDeployed(eventPlayer)
}

// This will trigger whenever a Player dies.
export function OnPlayerDied(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player,
    eventDeathType: mod.DeathType,
    eventWeaponUnlock: mod.WeaponUnlock
): void {
    gameMode._internal.OnPlayerDied(
        eventPlayer,
        eventOtherPlayer,
        eventDeathType,
        eventWeaponUnlock
    )
}

// This will trigger when a Player earns a kill.
export function OnPlayerEarnedKill(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player,
    eventDeathType: mod.DeathType,
    eventWeaponUnlock: mod.WeaponUnlock
): void {
    gameMode._internal.OnPlayerEarnedKill(
        eventPlayer,
        eventOtherPlayer,
        eventDeathType,
        eventWeaponUnlock
    )
}

// This will trigger when a Player earns a kill assist.
export function OnPlayerEarnedKillAssist(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player
): void {
    gameMode._internal.OnPlayerEarnedKillAssist(eventPlayer, eventOtherPlayer)
}

// This will trigger when a Player enters an AreaTrigger.
export function OnPlayerEnterAreaTrigger(
    eventPlayer: mod.Player,
    eventAreaTrigger: mod.AreaTrigger
): void {
    gameMode._internal.OnPlayerEnterAreaTrigger(eventPlayer, eventAreaTrigger)
}

// This will trigger when a Player enters a CapturePoint.
export function OnPlayerEnterCapturePoint(
    eventPlayer: mod.Player,
    eventCapturePoint: mod.CapturePoint
): void {
    gameMode._internal.OnPlayerEnterCapturePoint(eventPlayer, eventCapturePoint)
}

// This will trigger when a Player enters a Vehicle.
export function OnPlayerEnterVehicle(
    eventPlayer: mod.Player,
    eventVehicle: mod.Vehicle
): void {
    gameMode._internal.OnPlayerEnterVehicle(eventPlayer, eventVehicle)
}

// This will trigger when a Player enters a Vehicle seat.
export function OnPlayerEnterVehicleSeat(
    eventPlayer: mod.Player,
    eventVehicle: mod.Vehicle,
    eventSeat: mod.Object
): void {
    gameMode._internal.OnPlayerEnterVehicleSeat(
        eventPlayer,
        eventVehicle,
        eventSeat
    )
}

// This will trigger when a Player exits an AreaTrigger.
export function OnPlayerExitAreaTrigger(
    eventPlayer: mod.Player,
    eventAreaTrigger: mod.AreaTrigger
): void {
    gameMode._internal.OnPlayerExitAreaTrigger(eventPlayer, eventAreaTrigger)
}

// This will trigger when a Player exits a CapturePoint.
export function OnPlayerExitCapturePoint(
    eventPlayer: mod.Player,
    eventCapturePoint: mod.CapturePoint
): void {
    gameMode._internal.OnPlayerExitCapturePoint(eventPlayer, eventCapturePoint)
}

// This will trigger when a Player exits a Vehicle.
export function OnPlayerExitVehicle(
    eventPlayer: mod.Player,
    eventVehicle: mod.Vehicle
): void {
    gameMode._internal.OnPlayerExitVehicle(eventPlayer, eventVehicle)
}

// This will trigger when a Player exits a Vehicle seat.
export function OnPlayerExitVehicleSeat(
    eventPlayer: mod.Player,
    eventVehicle: mod.Vehicle,
    eventSeat: mod.Object
): void {
    gameMode._internal.OnPlayerExitVehicleSeat(
        eventPlayer,
        eventVehicle,
        eventSeat
    )
}

// This will trigger when a Player interacts with an InteractPoint.
export function OnPlayerInteract(
    eventPlayer: mod.Player,
    eventInteractPoint: mod.InteractPoint
): void {
    gameMode._internal.OnPlayerInteract(eventPlayer, eventInteractPoint)
}

// This will trigger when a Player joins the game.
export function OnPlayerJoinGame(eventPlayer: mod.Player): void {
    gameMode._internal.OnPlayerJoinGame(eventPlayer)
}

// This will trigger when a Player leaves the game.
export function OnPlayerLeaveGame(eventNumber: number): void {
    gameMode._internal.OnPlayerLeaveGame(eventNumber)
}

// This will trigger when a Player switches team.
export function OnPlayerSwitchTeam(
    eventPlayer: mod.Player,
    eventTeam: mod.Team
): void {
    gameMode._internal.OnPlayerSwitchTeam(eventPlayer, eventTeam)
}

// This will trigger when a Player interacts with a UI button.
export function OnPlayerUIButtonEvent(
    eventPlayer: mod.Player,
    eventUIWidget: mod.UIWidget,
    eventUIButtonEvent: mod.UIButtonEvent
): void {
    gameMode._internal.OnPlayerUIButtonEvent(
        eventPlayer,
        eventUIWidget,
        eventUIButtonEvent
    )
}

// This will trigger when a Player undeploys.
export function OnPlayerUndeploy(eventPlayer: mod.Player): void {
    gameMode._internal.OnPlayerUndeploy(eventPlayer)
}

// This will trigger when a Raycast hits a target.
export function OnRayCastHit(
    eventPlayer: mod.Player,
    eventPoint: mod.Vector,
    eventNormal: mod.Vector
): void {
    gameMode._internal.OnRayCastHit(eventPlayer, eventPoint, eventNormal)
}

// This will trigger when a Raycast misses.
export function OnRayCastMissed(eventPlayer: mod.Player): void {
    gameMode._internal.OnRayCastMissed(eventPlayer)
}

// This will trigger when a Player is revived.
export function OnRevived(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player
): void {
    gameMode._internal.OnRevived(eventPlayer, eventOtherPlayer)
}

// This will trigger when a RingOfFire changes size.
export function OnRingOfFireZoneSizeChange(
    eventRingOfFire: mod.RingOfFire,
    eventNumber: number
): void {
    gameMode._internal.OnRingOfFireZoneSizeChange(eventRingOfFire, eventNumber)
}

// This will trigger when an AISpawner spawns an AI Soldier.
export function OnSpawnerSpawned(
    eventPlayer: mod.Player,
    eventSpawner: mod.Spawner
): void {
    gameMode._internal.OnSpawnerSpawned(eventPlayer, eventSpawner)
}

// This will trigger when the time limit is reached.
export function OnTimeLimitReached(): void {
    gameMode._internal.OnTimeLimitReached()
}

// This will trigger when a Vehicle is destroyed.
export function OnVehicleDestroyed(eventVehicle: mod.Vehicle): void {
    gameMode._internal.OnVehicleDestroyed(eventVehicle)
}

// This will trigger when a Vehicle spawns.
export function OnVehicleSpawned(eventVehicle: mod.Vehicle): void {
    gameMode._internal.OnVehicleSpawned(eventVehicle)
}

