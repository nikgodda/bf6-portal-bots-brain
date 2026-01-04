import { CorePlayer_APlayer } from '../../APlayer'
import { CorePlayer_IComponent } from '../../APlayer'

export class CorePlayer_BattleStatsComponent implements CorePlayer_IComponent {
    private kills = 0
    private deaths = 0
    private teamKills = 0
    private score = 0
    private killStreak = 0

    onAttach(ap: CorePlayer_APlayer): void {
        // No-op
    }

    onDetach(ap: CorePlayer_APlayer): void {
        // No-op
    }

    /* ------------------------------------------------------------
     * Kills
     * ------------------------------------------------------------ */

    getKills(): number {
        return this.kills
    }

    addKill(amount = 1): void {
        this.kills += amount
    }

    /* ------------------------------------------------------------
     * Deaths
     * ------------------------------------------------------------ */

    getDeaths(): number {
        return this.deaths
    }

    addDeath(amount = 1): void {
        this.deaths += amount
    }

    /* ------------------------------------------------------------
     * Team kills
     * ------------------------------------------------------------ */

    getTeamKills(): number {
        return this.teamKills
    }

    addTeamKill(amount = 1): void {
        this.teamKills += amount
    }

    /* ------------------------------------------------------------
     * Score
     * ------------------------------------------------------------ */

    getScore(): number {
        return this.score
    }

    setScore(value: number): void {
        this.score = value
    }

    addScore(delta: number): void {
        this.score += delta
    }

    /* ------------------------------------------------------------
     * Killstreak
     * ------------------------------------------------------------ */

    getKillStreak(): number {
        return this.killStreak
    }

    addKillStreak(amount = 1): void {
        this.killStreak += amount
    }

    clearKillStreak(): void {
        this.killStreak = 0
    }
}
