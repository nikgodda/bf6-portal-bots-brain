import { CoreAI_ABehavior } from './Modules/Behavior/Behaviors/ABehavior'

export interface CoreAI_IBrainEvents {
    // Lifecycle
    OnMoveFinished?(success: boolean): void
    OnBehaviorChanged?(previous: CoreAI_ABehavior, next: CoreAI_ABehavior): void
}
