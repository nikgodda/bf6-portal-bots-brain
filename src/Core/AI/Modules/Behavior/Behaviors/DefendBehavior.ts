import { CoreAI_ABehavior } from './ABehavior'
import { CoreAI_Brain } from '../../../Brain'

/**
 * DefendBehavior:
 * Triggered when memory.defendPos has a value (set by DefendSensor or game logic).
 *
 * Behavior:
 * - Executes AIDefendPositionBehavior
 * - Continues as long as memory.defendPos exists
 * - Ends naturally when TTL clears defendPos and selector chooses another behavior
 *
 * NOTE:
 * - No internal timers
 * - No cleanup of memory.defendPos
 * - Pure execution-only behavior
 */
export class CoreAI_DefendBehavior extends CoreAI_ABehavior {
    public name = 'defend'

    private readonly defendPos: mod.Vector
    private readonly minDist: number
    private readonly maxDist: number

    constructor(
        brain: CoreAI_Brain,
        defendPos: mod.Vector,
        minDist: number,
        maxDist: number
    ) {
        super(brain)
        this.defendPos = defendPos
        this.minDist = minDist
        this.maxDist = maxDist
    }

    override enter(): void {
        super.enter()

        const player = this.brain.player
        if (!mod.IsPlayerValid(player)) return

        mod.AIDefendPositionBehavior(
            player,
            this.defendPos,
            this.minDist,
            this.maxDist
        )
    }

    override update(): void {
        // NOTHING NEEDED.
        // TTL expiration in memory.defendPos decides when this behavior stops.
    }

    override exit(): void {
        super.exit()
        // No cleanup needed.
    }
}
