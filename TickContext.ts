import { CoreAI_MemoryManager } from './Modules/Memory/MemoryManager'

/**
 * CoreAI_TickContext:
 * Immutable per-tick context passed to sensors and actions.
 *
 * Sensors/actions must ONLY:
 * - read from ctx.player / world
 * - sensors may write into ctx.memory (actions should avoid it)
 *
 * Sensors/actions must NOT:
 * - control behaviors
 * - reference Brain
 * - trigger actions directly
 */
export interface CoreAI_TickContext {
    /** AI-controlled player */
    player: mod.Player

    /** Shared AI memory for this brain */
    memory: CoreAI_MemoryManager

    /** Unified tick time (copied from memory.time) */
    time: number
}
