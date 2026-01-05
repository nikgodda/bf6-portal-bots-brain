import { CoreAI_AAction } from '../AAction'
import { CoreAI_TickContext } from '../../../TickContext'

export class CoreAI_SetTargetAction extends CoreAI_AAction {
    constructor() {
        super(200)
    }

    protected update(ctx: CoreAI_TickContext): void {
        const player = ctx.player
        if (!mod.IsPlayerValid(player)) return

        const enemy = ctx.memory.get('closestEnemy')
        if (enemy && mod.IsPlayerValid(enemy)) {
            mod.AISetTarget(player, enemy)
        } else {
            mod.AISetTarget(player)
        }
    }
}


