import { CoreAI_MemoryFields } from '../Modules/Memory/MemoryManager'
import { CoreAI_SensorOptions } from '../Modules/Perception/ISensorOptions'

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

    constructor(args: {
        sensors?: CoreAI_SensorOptions
        weights?: CoreAI_BaseSoldierWeights
    } = {}) {
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

