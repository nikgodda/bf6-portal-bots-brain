import { CorePlayer_APlayer } from '../Player/APlayer'
import { Core_Squad } from './Squad'
import { Core_AGameMode } from '../AGameMode'

export class Core_SquadManager {
    private gameMode: Core_AGameMode
    private squads: Core_Squad[] = []
    private maxSlots: number

    constructor(gameMode: Core_AGameMode, maxSlots: number = 4) {
        this.gameMode = gameMode
        this.maxSlots = maxSlots
    }

    /* ------------------------------------------------------------
     * Player Join
     * ------------------------------------------------------------ */
    async addToSquad(ap: CorePlayer_APlayer): Promise<Core_Squad> {
        const teamId = mod.GetObjId(mod.GetTeam(ap.player))

        // Find squad with same team + free slots
        let squad = this.squads.find(
            (s) => s.getTeamId() === teamId && s.freeSlots() > 0
        )

        // Create new squad if no free one exists
        if (!squad) {
            squad = new Core_Squad(this.gameMode, teamId, this.maxSlots)
            this.squads.push(squad)
        }

        squad.addMember(ap)
        return squad
    }

    /* ------------------------------------------------------------
     * Player Leave
     * ------------------------------------------------------------ */
    removeFromSquad(ap: CorePlayer_APlayer): void {
        for (const squad of this.squads) {
            squad.removeMember(ap)
        }

        // Remove empty squads
        this.squads = this.squads.filter((s) => s.getMembers().length > 0)
    }

    /* ------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------ */
    getSquad(ap: CorePlayer_APlayer): Core_Squad | undefined {
        return this.squads.find((s) => s.getMembers().includes(ap))
    }

    getSquadsByTeam(teamId: number): Core_Squad[] {
        return this.squads.filter((s) => s.getTeamId() === teamId)
    }

    getAllSquads(): Core_Squad[] {
        return this.squads
    }
}
