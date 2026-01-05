import { CoreAI_Perception } from './Modules/Perception/Perception'
import { CoreAI_MemoryManager } from './Modules/Memory/MemoryManager'

import { CoreAI_SensorOptions } from './Modules/Perception/ISensorOptions'
import { CoreAI_ASensor } from './Modules/Perception/Sensors/ASensor'
import { CoreAI_DebugWI } from './Modules/Debug/DebugWI'
import { CoreAI_BattleSensor } from './Modules/Perception/Sensors/BattleSensor'
import { CoreAI_TickContext } from './TickContext'
import { CoreAI_ActionRunner } from './Modules/Action/ActionRunner'
import { CoreAI_SetTargetAction } from './Modules/Action/Actions/SetTargetAction'
import { CoreAI_EnterVehicleAction } from './Modules/Action/Actions/EnterVehicleAction'
import { CoreAI_BehaviorSelector } from './Modules/Behavior/BehaviorSelector'
import { CoreAI_BaseSoldier } from './Profiles/BaseSoldier'
import { CoreAI_ClosestEnemySensor } from './Modules/Perception/Sensors/ClosestEnemySensor'
import { CoreAI_VehicleToDriveSensor } from './Modules/Perception/Sensors/VehicleToDriveSensor'
import { CoreAI_ArrivalSensor } from './Modules/Perception/Sensors/ArrivalSensor'
import { CoreAI_RoamSensor } from './Modules/Perception/Sensors/RoamSensor'
import { CoreAI_CapturePointSensor } from './Modules/Perception/Sensors/CapturePointSensor'
import { CoreAI_CapturePointMoveToSensor } from './Modules/Perception/Sensors/CapturePointMoveToSensor'

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
