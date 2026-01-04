import { CoreAI_Brain } from '../../../Brain'

/**
 * CoreAI_ABehavior:
 * Base class for all AI behaviors.
 *
 * - enter(): called once when behavior becomes active
 * - update(): called when throttling allows
 * - exit(): called once when behavior is replaced
 *
 * Throttling:
 * - If intervalMs > 0, update() is called no more often than intervalMs
 * - If intervalMs <= 0, update() is called every tick
 */
export abstract class CoreAI_ABehavior {
    protected brain: CoreAI_Brain

    public abstract name: string

    // Throttling interval. Zero means no throttling.
    protected intervalMs: number = 1000

    private lastUpdateTime: number = 0

    constructor(brain: CoreAI_Brain) {
        this.brain = brain
    }

    /** Called by BehaviorController once per tick. */
    tick(): void {
        const now = this.brain.memory.time

        if (this.intervalMs > 0) {
            if (now - this.lastUpdateTime < this.intervalMs) {
                return
            }
            this.lastUpdateTime = now
        }

        this.update()
    }

    enter(): void {}
    update(): void {}
    exit(): void {}
}
