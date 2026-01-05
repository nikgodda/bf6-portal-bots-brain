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
