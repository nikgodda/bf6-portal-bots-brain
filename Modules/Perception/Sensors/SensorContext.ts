import { CoreAI_MemoryManager } from '../../Memory/MemoryManager'

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
