// src/Core/AI/Modules/Task/ITaskScoringEntry.ts

import { CoreAI_Brain } from '../../Brain'
import { CoreAI_ABehavior } from '../Behavior/Behaviors/ABehavior'

/**
 * CoreAI_ITaskScoringEntry:
 * - score(brain): returns utility score for this behavior.
 * - factory(brain): creates a ready-to-run behavior instance.
 *
 * TaskSelector:
 * - picks the entry with highest score
 * - calls factory(brain) to get the behavior instance
 */
export interface CoreAI_ITaskScoringEntry {
    score: (brain: CoreAI_Brain) => number
    factory: (brain: CoreAI_Brain) => CoreAI_ABehavior
}
