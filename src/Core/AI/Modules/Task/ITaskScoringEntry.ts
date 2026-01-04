// src/Core/AI/Modules/Task/ITaskScoringEntry.ts

import { CoreAI_Brain } from '../../Brain'
import { CoreAI_ABehavior } from '../Behavior/Behaviors/ABehavior'

/**
 * CoreAI_ITaskScoringEntry:
 * - score(brain): returns utility score for this behavior.
 * - behaviorClass(brain): returns the class used for comparison without instantiation.
 * - isSame(brain, current): optional refinement to keep current behavior instance.
 * - factory(brain): creates a ready-to-run behavior instance.
 *
 * TaskSelector:
 * - picks the entry with highest score
 * - uses behaviorClass/isSame to avoid unnecessary factory calls
 */
export interface CoreAI_ITaskScoringEntry {
    score: (brain: CoreAI_Brain) => number
    behaviorClass?: (brain: CoreAI_Brain) => new (...args: any[]) => CoreAI_ABehavior
    isSame?: (brain: CoreAI_Brain, current: CoreAI_ABehavior) => boolean
    factory: (brain: CoreAI_Brain) => CoreAI_ABehavior
}
