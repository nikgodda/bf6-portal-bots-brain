import { CorePlayer_APlayer } from './Player/APlayer'

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
