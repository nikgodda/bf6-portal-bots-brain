import { CoreAI_ASensor } from '../Modules/Perception/Sensors/ASensor'
import { CoreAI_ITaskScoringEntry } from '../Modules/Task/ITaskScoringEntry'

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
