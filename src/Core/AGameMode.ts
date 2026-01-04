// Routes all engine events through Core_AGameMode hooks and emits them for observers, mirroring the engine API 1:1.
import { CorePlayer_IGameModeEngineEvents } from './IGameModeEngineEvents'
import { CorePlayer_APlayer } from './Player/APlayer'
import { CorePlayer_APlayerManager } from './Player/APlayerManager'

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
