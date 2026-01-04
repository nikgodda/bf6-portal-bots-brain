// src/Core/AI/Modules/Behavior/BehaviorController.ts

import { CoreAI_ABehavior } from './Behaviors/ABehavior'
import { CoreAI_Brain } from '../../Brain'
import { CoreAI_IdleBehavior } from './Behaviors/IdleBehavior'

export type CoreAI_BehaviorMode = 'onFoot' | 'onDrive'

/**
 * BehaviorController:
 *
 * - Always holds exactly one active behavior instance.
 * - TaskSelector constructs new behaviors when chosen.
 * - Controller simply switches and runs them.
 *
 * Notes:
 * - Behaviors no longer own lifecycle state.
 * - Behaviors do NOT decide completion.
 * - Switching happens every tick based on scoring.
 */

export class CoreAI_BehaviorController {
    private current: CoreAI_ABehavior

    constructor(private readonly brain: CoreAI_Brain) {
        // Start with Idle behavior
        this.current = new CoreAI_IdleBehavior(brain)
        this.current.enter()
    }

    /**
     * Switch to a new behavior instance.
     * Called by CoreAI_Brain.tick() after TaskSelector picks behavior.
     */
    change(next: CoreAI_ABehavior): void {
        // If it's the exact same instance, do nothing.
        // (May happen temporarily if TaskSelector picks same behavior two ticks in a row.)
        if (this.current === next) return

        // Exit previous behavior
        this.current.exit()

        // Enter the new behavior
        this.current = next
        this.current.enter()
    }

    /** Returns current active behavior */
    currentBehavior(): CoreAI_ABehavior {
        return this.current
    }

    /** Called every tick by the brain */
    update(): void {
        this.current.tick()
    }

    /**
     * Reset everything (on undeploy or profile switch).
     * Returns to pure Idle behavior.
     */
    resetAll(): void {
        this.current.exit()
        this.current = new CoreAI_IdleBehavior(this.brain)
        this.current.enter()
    }
}
