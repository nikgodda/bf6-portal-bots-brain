import { CorePlayer_APlayer } from './APlayer'

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
