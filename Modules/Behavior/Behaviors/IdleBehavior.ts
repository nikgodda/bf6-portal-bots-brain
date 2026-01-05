import { CoreAI_ABehavior } from './ABehavior'
import { CoreAI_Brain } from '../../../Brain'

/**
 * IdleBehavior:
 * Infinite fallback behavior issued when nothing else has score.
 * Simply triggers AIIdleBehavior and lets the engine handle animations.
 */
export class CoreAI_IdleBehavior extends CoreAI_ABehavior {
    public name = 'idle'

    constructor(brain: CoreAI_Brain) {
        super(brain)
    }

    override enter(): void {
        const player = this.brain.player
        
        if (mod.IsPlayerValid(player)) {
            // mod.AIIdleBehavior(player)
        }
    }

    override update(): void {
        // No logic needed.
        // Engine handles stance + idle behavior.
    }

    override exit(): void {
        // No cleanup required.
    }
}
