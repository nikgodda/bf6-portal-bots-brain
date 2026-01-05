//----------- START OF BRAIN

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

/**
 * CoreAI_TickContext:
 * Immutable per-tick context passed to sensors and actions.
 *
 * Sensors/actions must ONLY:
 * - read from ctx.player / world
 * - sensors may write into ctx.memory (actions should avoid it)
 *
 * Sensors/actions must NOT:
 * - control behaviors
 * - reference Brain
 * - trigger actions directly
 */
export interface CoreAI_TickContext {
    /** AI-controlled player */
    player: mod.Player

    /** Shared AI memory for this brain */
    memory: CoreAI_MemoryManager

    /** Unified tick time (copied from memory.time) */
    time: number
}

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
    tick(ctx: CoreAI_TickContext): void {
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
    protected abstract update(ctx: CoreAI_TickContext): void

    /**
     * Optional event hooks for sensors that react to game events.
     * (BattleSensor overrides onDamaged)
     */
    OnPlayerDamaged?(
        ctx: CoreAI_TickContext,
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {}

    OnRayCastHit?(
        ctx: CoreAI_TickContext,
        eventPoint: mod.Vector,
        eventNormal: mod.Vector
    ): void {}

    reset(): void {
        this.lastUpdate = 0
    }
}

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
    tick(ctx: CoreAI_TickContext): void {
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

export interface CoreAI_BattleSensorOptions {
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
    battleSensor?: CoreAI_BattleSensorOptions
    closestEnemySensor?: CoreAI_ClosestEnemySensorOptions
    vehicleToDriveSensor?: CoreAI_VehicleToDriveSensorOptions
    arrivalSensor?: CoreAI_ArrivalSensorOptions
    roamSensor?: CoreAI_MoveToSensorOptions
    onDriveMoveToSensor?: CoreAI_MoveToSensorOptions
    capturePointSensor?: CoreAI_CapturePointSensorOptions
    moveToCapturePointSensor?: CoreAI_CapturePointSensorOptions
}

// @stringkeys core.ai.debug.brain.memory: closestEnemy {}, vehicleToDrive {}, isInBattle {}, roamPos {}, arrivedPos {}

// @stringkeys core.ai.debug.brain.behaviors: battlefield, defend, moveto, none

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
        ['battlefield', mod.CreateVector(1, 0, 0)],
        ['defend', mod.CreateVector(1, 1, 0)],
        ['moveto', mod.CreateVector(0, 1, 1)],
        ['none', mod.CreateVector(1, 1, 1)],
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

    tick() {
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
            const behavior = this.brain.getBehaviorLabel() ?? 'none'
            mod.SetWorldIconText(
                this.behaviorWI,
                mod.Message(`core.ai.debug.brain.behaviors.${behavior}`)
            )
            mod.SetWorldIconColor(
                this.behaviorWI,
                this.behaviorColorsMap.get(behavior) ??
                    mod.CreateVector(1, 1, 1)
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

/**
 * BattleSensor:
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
export class CoreAI_BattleSensor extends CoreAI_ASensor {
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

export abstract class CoreAI_AAction {
    protected intervalMs: number
    private lastRun: number = 0

    constructor(intervalMs: number = 500) {
        this.intervalMs = intervalMs
    }

    tick(ctx: CoreAI_TickContext): void {
        const now = ctx.time

        if (this.intervalMs > 0 && now - this.lastRun < this.intervalMs) {
            return
        }

        this.lastRun = now
        this.update(ctx)
    }

    reset(): void {
        this.lastRun = 0
    }

    protected abstract update(ctx: CoreAI_TickContext): void
}

export class CoreAI_ActionRunner {
    private actions: CoreAI_AAction[] = []

    constructor(actions: CoreAI_AAction[]) {
        this.actions = actions
    }

    tick(ctx: CoreAI_TickContext): void {
        for (const action of this.actions) {
            action.tick(ctx)
        }
    }

    reset(): void {
        for (const action of this.actions) {
            action.reset()
        }
    }
}

export class CoreAI_SetTargetAction extends CoreAI_AAction {
    constructor() {
        super(200)
    }

    protected update(ctx: CoreAI_TickContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        const enemy = ctx.memory.get('closestEnemy')
        if (enemy && mod.IsPlayerValid(enemy)) {
            mod.AISetTarget(player, enemy)
        } else {
            mod.AISetTarget(player)
        }
    }
}

export class CoreAI_EnterVehicleAction extends CoreAI_AAction {
    constructor() {
        super(500)
    }

    protected update(ctx: CoreAI_TickContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        if (mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle)) {
            return
        }

        const vehicle = ctx.memory.get('vehicleToDrive')
        if (!vehicle) return

        if (mod.IsVehicleSeatOccupied(vehicle, 0)) {
            return
        }

        const vPos = mod.GetVehicleState(
            vehicle,
            mod.VehicleStateVector.VehiclePosition
        )
        const pPos = mod.GetSoldierState(
            player,
            mod.SoldierStateVector.GetPosition
        )

        const dist = mod.DistanceBetween(pPos, vPos)

        if (dist > 3.0) return

        // mod.DisplayHighlightedWorldLogMessage(mod.Message(222))

        mod.ForcePlayerToSeat(player, vehicle, 0)
    }
}

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

export type CoreAI_BaseSoldierWeights = Partial<
    Record<keyof CoreAI_MemoryFields, number>
>

/**
 * BaseSoldier
 *
 * Holds sensor config and baseline memory weights.
 */
export class CoreAI_BaseSoldier {
    public sensors: CoreAI_SensorOptions
    public weights: CoreAI_BaseSoldierWeights

    constructor(
        args: {
            sensors?: CoreAI_SensorOptions
            weights?: CoreAI_BaseSoldierWeights
        } = {}
    ) {
        this.sensors = args.sensors ?? {}
        this.weights = args.weights ?? {}
    }

    static default(): CoreAI_BaseSoldier {
        return new CoreAI_BaseSoldier({
            weights: {
                isInBattle: 100,
                vehicleToDrive: 90,
                closestEnemy: 80,
                capturePoint: 70,
                arrivedPos: 60,
                roamPos: 30,
            },
        })
    }
}

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

    protected update(ctx: CoreAI_TickContext): void {
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

    protected update(ctx: CoreAI_TickContext): void {
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

    protected update(ctx: CoreAI_TickContext): void {
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

    protected update(ctx: CoreAI_TickContext): void {
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

    protected update(ctx: CoreAI_TickContext): void {
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

    protected update(ctx: CoreAI_TickContext): void {
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

// @stringkeys bots: 1..32

export class CoreAI_Brain {
    public player: mod.Player

    public perception: CoreAI_Perception
    public memory: CoreAI_MemoryManager
    private debugWI: CoreAI_DebugWI | null = null
    private actionRunner: CoreAI_ActionRunner
    private behaviorSelector: CoreAI_BehaviorSelector | null = null

    constructor(
        player: mod.Player,
        profile: CoreAI_BaseSoldier,
        enableDebug: boolean = false
    ) {
        this.player = player

        this.memory = new CoreAI_MemoryManager()
        this.perception = new CoreAI_Perception()
        this.actionRunner = new CoreAI_ActionRunner([
            new CoreAI_SetTargetAction(),
            new CoreAI_EnterVehicleAction(),
        ])

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

    installProfile(profile: CoreAI_BaseSoldier): void {
        if (this.behaviorSelector) {
            this.behaviorSelector.setWeights(profile.weights)
        } else {
            this.setBehaviorSelector(
                new CoreAI_BehaviorSelector({
                    weights: profile.weights,
                })
            )
        }
        this.perception.clearSensors()
        this.installSensorsFromOptions(profile.sensors)
    }

    private installSensorsFromOptions(options: CoreAI_SensorOptions): void {
        this.addSensorIf(
            options.battleSensor,
            () =>
                new CoreAI_BattleSensor(
                    options.battleSensor?.intervalMs,
                    options.battleSensor?.ttlMs
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

    private addSensorIf(
        condition: unknown,
        factory: () => CoreAI_ASensor
    ): void {
        if (condition) {
            this.perception.addSensor(factory())
        }
    }

    setBehaviorSelector(selector: CoreAI_BehaviorSelector | null): void {
        this.behaviorSelector = selector
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

    reset(): void {
        this.perception.reset()
        this.memory.reset()
        this.actionRunner.reset()

        if (mod.IsPlayerValid(this.player)) {
            mod.AISetTarget(this.player)
        }
    }

    /* ------------------------------------------------------------
     * Movement finished
     * ------------------------------------------------------------ */

    OnAIMoveFinished(success: boolean): void {
        // mod.DisplayHighlightedWorldLogMessage(mod.Message(123))
        this.memory.set('roamPos', null)
    }

    /* ------------------------------------------------------------
     * Damage event
     * ------------------------------------------------------------ */

    OnPlayerDamaged(
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {
        const battleSensor = this.getSensor(CoreAI_BattleSensor)
        if (!battleSensor) return

        const tickCtx: CoreAI_TickContext = {
            player: this.player,
            memory: this.memory,
            time: this.memory.time,
        }

        battleSensor.OnPlayerDamaged?.(
            tickCtx,
            eventOtherPlayer,
            eventDamageType,
            eventWeaponUnlock
        )
    }

    /* ------------------------------------------------------------
     * Raycast hit event
     * ------------------------------------------------------------ */

    OnRayCastHit(eventPoint: mod.Vector, eventNormal: mod.Vector): void {
        const battleSensor = this.getSensor(CoreAI_BattleSensor)
        if (!battleSensor) return

        const tickCtx: CoreAI_TickContext = {
            player: this.player,
            memory: this.memory,
            time: this.memory.time,
        }

        battleSensor.OnRayCastHit?.(tickCtx, eventPoint, eventNormal)
    }

    /* ------------------------------------------------------------
     * Tick (called by BrainComponent)
     * ------------------------------------------------------------ */

    OngoingPlayer(): void {
        if (!mod.IsPlayerValid(this.player)) {
            return
        }

        this.memory.time = Date.now()
        this.memory.prune()

        if (!mod.GetSoldierState(this.player, mod.SoldierStateBool.IsAlive)) {
            return
        }

        this.debugWI?.tick()

        const tickCtx: CoreAI_TickContext = {
            player: this.player,
            memory: this.memory,
            time: this.memory.time,
        }

        this.perception.tick(tickCtx)
        this.actionRunner.tick(tickCtx)

        this.behaviorSelector?.update(tickCtx)
    }

    getBehaviorLabel(): string | null {
        return this.behaviorSelector?.getCurrent() ?? null
    }
}

//----------- END OF BRAIN

//------------------------------------------------------------------------------------------------
//
//
//
//----------- GAME MODE STARTS HERE
//
//
//
//-------------------------------------------------------------------------------------------------

const ENABLE_BOTS_BRAIN_DEBUG = false
const BOTS_UNSPAWN_DELAY = 10

/**
 * BOTS BRAIN PROFILES
 */

const infantryProfile = new CoreAI_BaseSoldier({
    weights: {
        vehicleToDrive: 100,
        isInBattle: 90,
        closestEnemy: 80,
        roamPos: 30,
    },
    sensors: {
        battleSensor: {
            ttlMs: 10_000,
        },
        closestEnemySensor: {},
        roamSensor: {
            getWPs: () => getRangeWPs(1001, 1003),
            intervalMs: 1_000,
            ttlMs: 10_000,
        },
        vehicleToDriveSensor: {
            radius: 100,
        },
        // capturePointSensor: {},
    },
})

const driverProfile = new CoreAI_BaseSoldier({
    weights: {
        isInBattle: 100,
        roamPos: 30,
    },
    sensors: {
        battleSensor: {
            ttlMs: 10_000,
        },
        roamSensor: {
            getWPs: () => getRangeWPs(1106, 1107),
            ttlMs: 60_000,
        },
    },
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
export function OnGameModeStarted(): void {
    mod.Wait(10).then(() => {
        spawnCustomBot(mod.GetTeam(1), mod.GetObjectPosition(mod.GetHQ(1)))
        spawnCustomBot(mod.GetTeam(2), mod.GetObjectPosition(mod.GetHQ(2)))
    })

    mod.Wait(10).then(() => {
        mod.SetVehicleSpawnerAutoSpawn(mod.GetVehicleSpawner(1), true)
        mod.SetVehicleSpawnerAutoSpawn(mod.GetVehicleSpawner(2), true)
        mod.SetVehicleSpawnerAutoSpawn(mod.GetVehicleSpawner(4), true)
    })
}

// This will trigger when a Player joins the game.
export function OnPlayerJoinGame(eventPlayer: mod.Player): void {
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

// This will trigger when any player leaves the game.
export function OnPlayerLeaveGame(eventNumber: number): void {
    // Custom bots are kicked by the engine after their first death, based on the unspawndelay timer. Respawn the bot here for persistence. If you need to preserve stats (team, kills, deaths, etc.), wrap mod.Player, or check my Scripting Gameplay Framework: https://github.com/nikgodda/bf6-portal-scripting
    const brain = brainManager.get(eventNumber)
    if (brain) {
        brainManager.delete(eventNumber)
    }
}

// This will trigger whenever a Player deploys.
export function OnPlayerDeployed(eventPlayer: mod.Player): void {
    if (mod.GetSoldierState(eventPlayer, mod.SoldierStateBool.IsAISoldier)) {
        const brain = getBrain(eventPlayer)
        if (brain) {
            brain.installProfile(infantryProfile)
        }
    }
}

//
export function OngoingPlayer(eventPlayer: mod.Player): void {
    const brain = getBrain(eventPlayer)
    if (brain) {
        brain.OngoingPlayer()
    }
}

// This will trigger when a Player enters a Vehicle seat.
export function OnPlayerEnterVehicleSeat(
    eventPlayer: mod.Player,
    eventVehicle: mod.Vehicle,
    eventSeat: mod.Object
): void {
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
): void {
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
): void {
    const brain = getBrain(eventPlayer)
    if (brain) {
        brain.OnPlayerDamaged(
            eventOtherPlayer,
            eventDamageType,
            eventWeaponUnlock
        )
    }
}

// This will trigger when a Raycast hits a target.
export function OnRayCastHit(
    eventPlayer: mod.Player,
    eventPoint: mod.Vector,
    eventNormal: mod.Vector
): void {
    const brain = getBrain(eventPlayer)
    if (brain) {
        brain.OnRayCastHit(eventPoint, eventNormal)
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

function spawnCustomBot(team: mod.Team, pos: mod.Vector): void {
    const spawner = mod.SpawnObject(
        mod.RuntimeSpawn_Common.AI_Spawner,
        pos,
        mod.CreateVector(0, 0, 0)
    )

    mod.AISetUnspawnOnDead(spawner, false)
    mod.SetUnspawnDelayInSeconds(spawner, BOTS_UNSPAWN_DELAY)

    mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team)
}
