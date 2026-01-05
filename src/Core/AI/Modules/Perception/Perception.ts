// src/Core/AI/Modules/Perception/Perception.ts

import { CoreAI_ASensor } from './Sensors/ASensor'
import { CoreAI_TickContext } from '../../TickContext'

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



