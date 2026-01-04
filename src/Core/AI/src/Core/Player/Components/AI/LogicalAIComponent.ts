import { CorePlayer_APlayer } from '../../APlayer'
import { CorePlayer_IComponent } from '../../APlayer'

export class CorePlayer_LogicalAIComponent implements CorePlayer_IComponent {
    public soldierClass: mod.SoldierClass
    public displayName: mod.Message
    public spawner: mod.Spawner

    private ap!: CorePlayer_APlayer

    constructor(
        classType: mod.SoldierClass,
        displayName: mod.Message,
        spawner: mod.Spawner
    ) {
        this.soldierClass = classType
        this.displayName = displayName
        this.spawner = spawner
    }

    onAttach(ap: CorePlayer_APlayer): void {
        this.ap = ap
    }

    onDetach(ap: CorePlayer_APlayer): void {
        // No cleanup needed for now
    }

    public get player(): mod.Player {
        return this.ap.player
    }
}
