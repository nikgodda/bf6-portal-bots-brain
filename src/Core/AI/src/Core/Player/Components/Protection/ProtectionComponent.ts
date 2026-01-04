import { CorePlayer_APlayer } from '../../APlayer'
import { CorePlayer_IComponent } from '../../APlayer'

export class CorePlayer_ProtectionComponent implements CorePlayer_IComponent {
    private ap!: CorePlayer_APlayer
    private active: boolean = false
    private deactivateAt: number = 0

    onAttach(ap: CorePlayer_APlayer): void {
        this.ap = ap

        ap.addListener({
            OngoingPlayer: () => {
                if (!this.active) return

                if (this.deactivateAt > 0 && Date.now() >= this.deactivateAt) {
                    this.deactivate()
                }
            },
        })
    }

    onDetach(ap: CorePlayer_APlayer): void {
        this.active = false
        this.deactivateAt = 0
    }

    activate(durationSec?: number): void {
        this.active = true

        mod.SetPlayerIncomingDamageFactor(this.ap.player, 0)

        if (durationSec && durationSec > 0) {
            this.deactivateAt = Date.now() + durationSec * 1000
        } else {
            this.deactivateAt = 0
        }
    }

    deactivate(): void {
        this.active = false
        this.deactivateAt = 0

        // BUG: setting 1 does NOT work
        mod.SetPlayerIncomingDamageFactor(this.ap.player, 0.999)
    }

    isActive(): boolean {
        return this.active
    }
}
