import { CoreAI_Brain } from '../Brain'
import { CoreAI_AProfile, CoreAI_SensorOptions } from './AProfile'
import { CoreAI_ITaskScoringEntry } from '../Modules/Task/ITaskScoringEntry'

import { CoreAI_FightBehavior } from '../Modules/Behavior/Behaviors/FightBehavior'
import { CoreAI_DefendBehavior } from '../Modules/Behavior/Behaviors/DefendBehavior'
import { CoreAI_EnterVehicleBehavior } from '../Modules/Behavior/Behaviors/EnterVehicleBehavior'
import { CoreAI_MoveToBehavior } from '../Modules/Behavior/Behaviors/MoveToBehavior'

import { CoreAI_FightSensor } from '../Modules/Perception/Sensors/FightSensor'
import { CoreAI_ClosestEnemySensor } from '../Modules/Perception/Sensors/ClosestEnemySensor'
import { CoreAI_VehicleToDriveSensor } from '../Modules/Perception/Sensors/VehicleToDriveSensor'
import { CoreAI_ArrivalSensor } from '../Modules/Perception/Sensors/ArrivalSensor'
import { CoreAI_RoamSensor } from '../Modules/Perception/Sensors/RoamSensor'
import { CoreAI_CapturePointSensor } from '../Modules/Perception/Sensors/CapturePointSensor'
import { CoreAI_CapturePointMoveToSensor } from '../Modules/Perception/Sensors/CapturePointMoveToSensor'

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
