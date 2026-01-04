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

import { Core_AGameMode } from './Core/AGameMode'

// import { PG_GameMode } from './GameModes/Playground/PG_GameMode'
import { PRSR_GameMode } from './GameModes/Pressure/PRSR_GameMode'
// import { TPL_GameMode } from './GameModes/Template/TPL_GameMode'
// import { TDM_GameMode } from './GameModes/TDM/TDM_GameMode'

const gameMode: Core_AGameMode = new PRSR_GameMode()

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
