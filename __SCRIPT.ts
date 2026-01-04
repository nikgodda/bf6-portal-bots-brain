//----------- START OF BRAIN



//----------- END OF BRAIN

/**
 * GAMEMODE
 */

const ENABLE_BOTS_BRAIN_DEBUG = true
const BOTS_UNSPAWN_DELAY = 10

/**
 * BOTS BRAIN PROFILES
 */

const infantryProfile: CoreAI_BaseProfile = new CoreAI_CombatantProfile({
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

const driverProfile: CoreAI_BaseProfile = new CoreAI_CombatantProfile({
    fightSensor: {
        ttlMs: 10_000,
    },
    roamSensor: {
        getWPs: () => getRangeWPs(1106, 1107),
        ttlMs: 60_000,
    },
    capturePointSensor: {},
    /* arrivalSensor: {
                getWPs: () => this.getRangeWPs(1106, 1107),
                ttlMs: 20_000,
                cooldownMs: 40_000,
            }, */
})

/**
 * SIMPLE BRAINS MANAGER
 */

const brainManager: Map<number, CoreAI_Brain> = new Map()

function getBrain(player: mod.Player): CoreAI_Brain | undefined {
    return brainManager.get(mod.GetObjId(player))
}

function setBrain(player: mod.Player, brain: CoreAI_Brain): void {
    brainManager.set(mod.GetObjId(player), brain)
}

/**
 * ENGINE CALLBACKS
 */

// This will trigger at the start of the gamemode.
export function OnGameModeStarted() {
    mod.Wait(10).then(() => {
        spawnCustomBot(mod.GetTeam(1), mod.GetObjectPosition(mod.GetHQ(1)))
        spawnCustomBot(mod.GetTeam(2), mod.GetObjectPosition(mod.GetHQ(2)))
    })
}

// This will trigger when a Player joins the game.
export function OnPlayerJoinGame(eventPlayer: mod.Player) {
    if (mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAISoldier)) {
        setBrain(
            eventPlayer,
            new CoreAI_Brain(
                eventPlayer,
                infantryProfile,
                ENABLE_BOTS_BRAIN_DEBUG
            )
        )
    }
}

//
export function OngoingPlayer(eventPlayer: mod.Player) {
    const brain = getBrain(eventPlayer)
    if (brain) {
        brain.tick()
    }
}

// This will trigger when a Player enters a Vehicle seat.
export function OnPlayerEnterVehicleSeat(
    eventPlayer: mod.Player,
    eventVehicle: mod.Vehicle,
    eventSeat: mod.Object
) {
    if (
        mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAISoldier) &&
        mod.GetPlayerVehicleSeat(eventPlayer) === 0
    ) {
        const brain = getBrain(eventPlayer)
        if (brain) {
            brain.installProfile(driverProfile)
        }
    }
}

// This will trigger when a Player exits a Vehicle.
export function OnPlayerExitVehicle(
    eventPlayer: mod.Player,
    eventVehicle: mod.Vehicle
) {
    if (mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAISoldier)) {
        const brain = getBrain(eventPlayer)
        if (brain) {
            brain.installProfile(infantryProfile)
        }
    }
}

// This will trigger when a Player takes damage.
export function OnPlayerDamaged(
    eventPlayer: mod.Player,
    eventOtherPlayer: mod.Player,
    eventDamageType: mod.DamageType,
    eventWeaponUnlock: mod.WeaponUnlock
) {
    const brain = getBrain(eventPlayer)
    if (brain) {
        brain.onDamaged(eventOtherPlayer, eventDamageType, eventWeaponUnlock)
    }
}

// This will trigger when a Raycast hits a target.
export function OnRayCastHit(
    eventPlayer: mod.Player,
    eventPoint: mod.Vector,
    eventNormal: mod.Vector
) {
    const brain = getBrain(eventPlayer)
    if (brain) {
        brain.onRayCastHit(eventPoint, eventNormal)
    }
}

/**
 * HELPERS
 */

function getRangeWPs(from: number, to: number): mod.Vector[] {
    const out: mod.Vector[] = []

    for (let id = from; id <= to; id++) {
        const wp = mod.GetSpatialObject(id)
        out.push(mod.GetObjectPosition(wp))
    }

    return out
}

function spawnCustomBot(team: mod.Team, pos: mod.Vector) {
    const spawner = mod.SpawnObject(
        mod.RuntimeSpawn_Common.AI_Spawner,
        pos,
        mod.CreateVector(0, 0, 0)
    )

    mod.AISetUnspawnOnDead(spawner, false)
    mod.SetUnspawnDelayInSeconds(spawner, BOTS_UNSPAWN_DELAY)

    mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team)
}
