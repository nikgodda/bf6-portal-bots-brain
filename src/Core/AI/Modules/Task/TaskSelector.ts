import { CoreAI_Brain } from '../../Brain'
import { CoreAI_AProfile } from '../../Profiles/AProfile'
import { CoreAI_IdleBehavior } from '../Behavior/Behaviors/IdleBehavior'
import { CoreAI_MoveToBehavior } from '../Behavior/Behaviors/MoveToBehavior'
import { CoreAI_ITaskScoringEntry } from './ITaskScoringEntry'

export class CoreAI_TaskSelector {
    private brain: CoreAI_Brain
    private profile: CoreAI_AProfile

    constructor(brain: CoreAI_Brain, profile: CoreAI_AProfile) {
        this.brain = brain
        this.profile = profile
    }

    setProfile(profile: CoreAI_AProfile): void {
        this.profile = profile
    }

    chooseNextBehavior() {
        const current = this.brain.behaviorController.currentBehavior()

        let bestEntry: CoreAI_ITaskScoringEntry | null = null
        let bestScore = -Infinity

        // Evaluate profile scoring
        for (let i = 0; i < this.profile.scoring.length; i++) {
            const entry = this.profile.scoring[i]
            const score = entry.score(this.brain)
            if (score > bestScore) {
                bestScore = score
                bestEntry = entry
            }
        }

        // If nothing scores above zero -> idle
        if (!bestEntry || bestScore <= 0) {
            if (current instanceof CoreAI_IdleBehavior) {
                return current
            }
            return new CoreAI_IdleBehavior(this.brain)
        }

        // TEMP instance only to inspect class
        const temp = bestEntry.factory(this.brain)
        const nextClass = temp.constructor

        // If same class -> don't switch (no restarts), except MoveTo when target changes.
        if (current && current.constructor === nextClass) {
            if (
                current instanceof CoreAI_MoveToBehavior &&
                temp instanceof CoreAI_MoveToBehavior
            ) {
                const currentPos = current.getTargetPos()
                const nextPos = temp.getTargetPos()
                if (mod.DistanceBetween(currentPos, nextPos) <= 0) {
                    return current
                }
            } else {
                return current
            }
        }

        // Switch to new instance
        return temp
    }
}
