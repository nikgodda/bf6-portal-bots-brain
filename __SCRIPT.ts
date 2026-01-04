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

// src/Core/AI/Modules/Task/ITaskScoringEntry.ts


/**
 * CoreAI_ITaskScoringEntry:
 * - score(brain): returns utility score for this behavior.
 * - behaviorClass(brain): returns the class used for comparison without instantiation.
 * - isSame(brain, current): optional refinement to keep current behavior instance.
 * - factory(brain): creates a ready-to-run behavior instance.
 *
 * TaskSelector:
 * - picks the entry with highest score
 * - uses behaviorClass/isSame to avoid unnecessary factory calls
 */
export interface CoreAI_ITaskScoringEntry {
    score: (brain: CoreAI_Brain) => number
    behaviorClass?: (brain: CoreAI_Brain) => new (...args: any[]) => CoreAI_ABehavior
    isSame?: (brain: CoreAI_Brain, current: CoreAI_ABehavior) => boolean
    factory: (brain: CoreAI_Brain) => CoreAI_ABehavior
}

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

        const behaviorClass = bestEntry.behaviorClass?.(this.brain)

        if (behaviorClass && current && current.constructor === behaviorClass) {
            const keepCurrent = bestEntry.isSame
                ? bestEntry.isSame(this.brain, current)
                : true

            if (keepCurrent) {
                return current
            }
        }

        // Switch to new instance
        return bestEntry.factory(this.brain)
    }
}

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
    public behaviorController: CoreAI_BehaviorController
    public taskSelector: CoreAI_TaskSelector

    private debugWI: CoreAI_DebugWI | null = null

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

    reset(): void {
        this.perception.reset()
        this.memory.reset()
        this.behaviorController.resetAll()

        if (mod.IsPlayerValid(this.player)) {
            mod.AISetTarget(this.player)
        }
    }

    /* ------------------------------------------------------------
     * Movement finished
     * ------------------------------------------------------------ */

    OnAIMoveFinished(success: boolean): void {
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

    OnRayCastHit(eventPoint: mod.Vector, eventNormal: mod.Vector): void {
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

    OngoingPlayer(): void {
        if (!mod.IsPlayerValid(this.player)) {
            return
        }

        this.memory.time = Date.now()
        this.memory.prune()

        if (!mod.GetSoldierState(this.player, mod.SoldierStateBool.IsAlive)) {
            return
        }

        this.debugWI?.update()

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

        const next = this.taskSelector.chooseNextBehavior()

        this.behaviorController.change(next)

        this.behaviorController.update()
    }
}

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

/**
 * FightBehavior:
 * Activated when the threat is high enough for combat.
 *
 * Engine handles all dynamic combat: aiming, targeting, firing, strafing, cover.
 * This behavior does not end by itself; TaskSelector decides when to exit.
 */
export class CoreAI_FightBehavior extends CoreAI_ABehavior {
    public name = 'fight'

    constructor(brain: CoreAI_Brain, mode: CoreAI_BehaviorMode = 'onFoot') {
        super(brain)
    }

    override async enter(): Promise<void> {
        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) {
            return
        }

        if (
            mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle) &&
            mod.GetPlayerVehicleSeat(player) === 0
        ) {
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
    private readonly isValidated: boolean

    constructor(
        brain: CoreAI_Brain,
        pos: mod.Vector,
        speed: mod.MoveSpeed = mod.MoveSpeed.Run,
        isValidated: boolean = true
    ) {
        super(brain)
        this.roamPos = pos
        this.speed = speed
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

        if (
            mod.GetSoldierState(player, mod.SoldierStateBool.IsInVehicle) &&
            mod.GetPlayerVehicleSeat(player) === 0
        ) {
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

        if (dist < 3) {
            this.brain.memory.set('roamPos', null)
        }
    }

    override exit(): void {
        // No target cleanup here; targeting is managed by the brain.
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

export type CoreAI_BaseProfileOptions = CoreAI_SensorOptions

export class CoreAI_BaseProfile extends CoreAI_AProfile {
    constructor(options: CoreAI_BaseProfileOptions = {}) {
        super()

        const getVehicleToDriveInfo = (brain: CoreAI_Brain) => {
            const vehicle = brain.memory.get('vehicleToDrive')
            if (!vehicle) return null

            const vPos = mod.GetVehicleState(
                vehicle,
                mod.VehicleStateVector.VehiclePosition
            )
            const dist = mod.DistanceBetween(
                mod.GetObjectPosition(brain.player),
                vPos
            )

            return { vehicle, vPos, dist }
        }

        this.scoring = [
            {
                score: (brain) => (brain.memory.get('isInBattle') ? 200 : 0),
                behaviorClass: () => CoreAI_FightBehavior,
                factory: (brain) => new CoreAI_FightBehavior(brain),
            },

            {
                score: (brain) => (brain.memory.get('closestEnemy') ? 150 : 0),
                behaviorClass: () => CoreAI_MoveToBehavior,
                isSame: (brain, current) => {
                    if (!(current instanceof CoreAI_MoveToBehavior))
                        return false

                    const enemy = brain.memory.get('closestEnemy')
                    if (!enemy) return false

                    const pos = mod.GetSoldierState(
                        enemy,
                        mod.SoldierStateVector.GetPosition
                    )

                    return mod.DistanceBetween(current.getTargetPos(), pos) <= 0
                },
                factory: (brain) => {
                    const enemy = brain.memory.get('closestEnemy')!
                    const pos = mod.GetSoldierState(
                        enemy,
                        mod.SoldierStateVector.GetPosition
                    )

                    return new CoreAI_MoveToBehavior(
                        brain,
                        pos,
                        mod.MoveSpeed.InvestigateRun
                    )
                },
            },

            {
                score: (brain) =>
                    brain.memory.get('vehicleToDrive') ? 290 : 0,
                behaviorClass: (brain) => {
                    const data = getVehicleToDriveInfo(brain)
                    if (!data) return CoreAI_MoveToBehavior
                    return data.dist <= 5.0
                        ? CoreAI_EnterVehicleBehavior
                        : CoreAI_MoveToBehavior
                },
                isSame: (brain, current) => {
                    const data = getVehicleToDriveInfo(brain)
                    if (!data) return false

                    if (current instanceof CoreAI_EnterVehicleBehavior) {
                        return data.dist <= 5.0
                    }

                    if (current instanceof CoreAI_MoveToBehavior) {
                        if (data.dist <= 5.0) return false
                        return (
                            mod.DistanceBetween(
                                current.getTargetPos(),
                                data.vPos
                            ) <= 0
                        )
                    }

                    return false
                },
                factory: (brain) => {
                    const data = getVehicleToDriveInfo(brain)!

                    if (data.dist <= 5.0) {
                        return new CoreAI_EnterVehicleBehavior(
                            brain,
                            data.vehicle,
                            0,
                            5.0
                        )
                    }

                    return new CoreAI_MoveToBehavior(
                        brain,
                        data.vPos,
                        Math.random() < 0.7
                            ? mod.MoveSpeed.Sprint
                            : mod.MoveSpeed.Run,
                        false
                    )
                },
            },

            {
                score: (brain) => (brain.memory.get('arrivedPos') ? 120 : 0),
                behaviorClass: () => CoreAI_DefendBehavior,
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
                behaviorClass: () => CoreAI_MoveToBehavior,
                isSame: (brain, current) => {
                    if (!(current instanceof CoreAI_MoveToBehavior))
                        return false

                    const roamPos = brain.memory.get('roamPos')
                    if (!roamPos) return false

                    return (
                        mod.DistanceBetween(current.getTargetPos(), roamPos) <=
                        0
                    )
                },
                factory: (brain) => {
                    return new CoreAI_MoveToBehavior(
                        brain,
                        brain.memory.get('roamPos')!,
                        Math.random() < 0.3
                            ? mod.MoveSpeed.Sprint
                            : mod.MoveSpeed.Run
                    )
                },
            },
        ] as CoreAI_ITaskScoringEntry[]

        this.buildSensors(options)
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

export type CoreAI_CombatantProfileOptions = CoreAI_SensorOptions

export class CoreAI_CombatantProfile extends CoreAI_BaseProfile {
    constructor(options: CoreAI_CombatantProfileOptions = {}) {
        super(options)

        /* this.scoring = [
            // your custom scoring entries here
        ] */
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
export function OnGameModeStarted(): void {
    mod.Wait(10).then(() => {
        spawnCustomBot(mod.GetTeam(1), mod.GetObjectPosition(mod.GetHQ(1)))
        spawnCustomBot(mod.GetTeam(2), mod.GetObjectPosition(mod.GetHQ(2)))
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
