// src/Core/AI/Components/BrainComponent.ts

import { CorePlayer_APlayer } from '../../APlayer'
import { CorePlayer_IComponent } from '../../APlayer'
import { CoreAI_Brain } from '../../../AI/Brain'

/**
 * BrainComponent
 *
 * AI behavior component attached to a logical player.
 * Created and configured by GameMode.
 */
export class CorePlayer_BrainComponent implements CorePlayer_IComponent {
    public readonly brain: CoreAI_Brain

    private ap!: CorePlayer_APlayer

    constructor(brain: CoreAI_Brain) {
        this.brain = brain
    }

    onAttach(ap: CorePlayer_APlayer): void {
        this.ap = ap

        // Hook brain tick into player ongoing tick
        ap.addListener({
            OngoingPlayer: () => {
                this.brain.tick()
            },
            OnPlayerDamaged: (other, damageType, weapon) => {
                if (!other) return
                this.brain.onDamaged(other.player, damageType, weapon)
            },
            OnRayCastHit: (eventPoint, eventNormal) => {
                this.brain.onRayCastHit(eventPoint, eventNormal)
            },
            OnAIMoveToSucceeded: () => {
                this.brain.onMoveFinished(true)
            },
            OnAIMoveToFailed: () => {
                this.brain.onMoveFinished(false)
            },
            OnPlayerDied: () => {
                this.brain.reset()
            },
            OnPlayerUndeploy: () => {
                this.brain.reset()
            },
        })
    }

    onDetach(ap: CorePlayer_APlayer): void {
        this.brain.destroy()
    }

    /**
     * Called automatically by APlayer.rebindTo()
     * when the soldier object changes.
     */
    onRebind(newPlayer: mod.Player): void {
        this.brain.player = newPlayer
    }
}
