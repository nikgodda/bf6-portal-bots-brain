import { CoreAI_Perception } from './Modules/Perception/Perception'
import { CoreAI_MemoryManager } from './Modules/Memory/MemoryManager'
import { CoreAI_BehaviorController } from './Modules/Behavior/BehaviorController'
import { CoreAI_TaskSelector } from './Modules/Task/TaskSelector'

import { CoreAI_AProfile } from './Profiles/AProfile'
import { CoreAI_ASensor } from './Modules/Perception/Sensors/ASensor'
import { CoreAI_DebugWI } from './Modules/Debug/DebugWI'
import { CoreAI_FightSensor } from './Modules/Perception/Sensors/FightSensor'
import { CoreAI_SensorContext } from './Modules/Perception/Sensors/SensorContext'

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
