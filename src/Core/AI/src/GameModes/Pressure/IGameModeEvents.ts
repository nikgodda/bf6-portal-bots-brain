import { CorePlayer_IGameModeEngineEvents } from 'src/Core/IGameModeEngineEvents'

/*
 * Pressure-specific GameMode events.
 *
 * Extends core GameMode events without modifying Core.
 * Only PRSR_GameMode is allowed to emit these.
 */
export interface IGameModeEvents extends CorePlayer_IGameModeEngineEvents {
    OnSectorChanged?(
        currentSectorId: number,
        previousSectorId: number,
        teamId: number,
        bufferTime: number
    ): void

    OnCapturePointCapturedResolved?(eventCapturePoint: mod.CapturePoint): void
}
