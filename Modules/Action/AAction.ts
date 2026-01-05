import { CoreAI_TickContext } from '../../TickContext'

export abstract class CoreAI_AAction {
    protected intervalMs: number
    private lastRun: number = 0

    constructor(intervalMs: number = 500) {
        this.intervalMs = intervalMs
    }

    tick(ctx: CoreAI_TickContext): void {
        const now = ctx.time

        if (this.intervalMs > 0 && now - this.lastRun < this.intervalMs) {
            return
        }

        this.lastRun = now
        this.update(ctx)
    }

    reset(): void {
        this.lastRun = 0
    }

    protected abstract update(ctx: CoreAI_TickContext): void
}


