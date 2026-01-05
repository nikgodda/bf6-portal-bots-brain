import { CoreAI_TickContext } from '../../TickContext'
import { CoreAI_AAction } from './AAction'

export class CoreAI_ActionRunner {
    private actions: CoreAI_AAction[] = []

    constructor(actions: CoreAI_AAction[]) {
        this.actions = actions
    }

    tick(ctx: CoreAI_TickContext): void {
        for (const action of this.actions) {
            action.tick(ctx)
        }
    }

    reset(): void {
        for (const action of this.actions) {
            action.reset()
        }
    }
}


