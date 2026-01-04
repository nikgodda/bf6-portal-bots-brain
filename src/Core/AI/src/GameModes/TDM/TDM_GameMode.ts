import { Core_AGameMode } from 'src/Core/AGameMode'
import { CorePlayer_APlayerManager } from 'src/Core/Player/APlayerManager'
import { TDM_PlayerManager } from './Player/TDM_PlayerManager'
import { CorePlayer_APlayer } from 'src/Core/Player/APlayer'
import { CoreAI_Brain } from 'src/Core/AI/Brain'
import { CoreAI_CombatantProfile } from 'src/Core/AI/Profiles/CombatantProfile'
import { CorePlayer_BrainComponent } from 'src/Core/Player/Components/AI/BrainComponent'
import { Core_SquadManager } from 'src/Core/Squad/SquadManager'

export class TDM_GameMode extends Core_AGameMode {
    protected override createPlayerManager(): CorePlayer_APlayerManager {
        return new TDM_PlayerManager()
    }

    private TARGET_SCORE = 30
    private AI_UNSPAWN_DELAY = 10
    private AI_COUNT_TEAM_1 = 3
    private AI_COUNT_TEAM_2 = 8

    private squadManager: Core_SquadManager | null = null
    private teamScores = new Map<number, number>()

    protected override OnGameModeStarted(): void {
        // One-time game setup (rules, scoreboard, AI bootstrap)
        mod.SetAIToHumanDamageModifier(2)

        mod.SetGameModeTargetScore(this.TARGET_SCORE)

        mod.SetScoreboardType(mod.ScoreboardType.CustomTwoTeams)
        mod.SetScoreboardColumnNames(
            mod.Message(`gamemodes.PRSR.scoreboard.score`),
            mod.Message(`gamemodes.PRSR.scoreboard.kills`),
            mod.Message(`gamemodes.PRSR.scoreboard.deaths`),
            mod.Message(`gamemodes.PRSR.scoreboard.teamKills`),
            mod.Message(`gamemodes.PRSR.scoreboard.killStreak`)
        )
        mod.SetScoreboardColumnWidths(1, 0.5, 0.5, 0.5, 0.5)

        // Spawn initial logical bots
        for (let i = 1; i <= this.AI_COUNT_TEAM_1; i++) {
            mod.Wait(0.5).then(() =>
                this.playerManager.spawnLogicalBot(
                    mod.SoldierClass.Assault,
                    1,
                    mod.GetObjectPosition(mod.GetHQ(1)),
                    mod.Message(`core.ai.bots.${i}`),
                    this.AI_UNSPAWN_DELAY
                )
            )
        }

        for (let j = 1; j <= this.AI_COUNT_TEAM_2; j++) {
            mod.Wait(0.5).then(() =>
                this.playerManager.spawnLogicalBot(
                    mod.SoldierClass.Assault,
                    2,
                    mod.GetObjectPosition(mod.GetHQ(2)),
                    mod.Message(`core.ai.bots.${this.AI_COUNT_TEAM_1 + j}`),
                    this.AI_UNSPAWN_DELAY
                )
            )
        }
    }

    protected override OnLogicalPlayerJoinGame(lp: CorePlayer_APlayer): void {
        // Attach AI brain to logical AI players only
        if (lp.isLogicalAI()) {
            const brain = new CoreAI_Brain(
                lp.player,
                new CoreAI_CombatantProfile({
                    roamSensor: {
                        getWPs: () => this.getRoamWps(1000, 1010),
                    },
                    arrivalSensor: {
                        getWPs: () => this.getRoamWps(1000, 1010),
                        ttlMs: 4000,
                    },
                }),
                false
            )

            lp.addComponent(new CorePlayer_BrainComponent(brain))
        }

        // Ensure squad system exists and register the player
        if (!this.squadManager) {
            this.squadManager = new Core_SquadManager(this, 2)
        }

        this.squadManager.addToSquad(lp)
    }

    protected override OnPlayerLeaveGame(eventNumber: number): void {
        const lp = this.playerManager.getById(eventNumber)
        if (!lp) return

        // Keep logical AI persistent by respawning its identity
        if (lp.isLogicalAI()) {
            this.playerManager.respawnLogicalBot(
                lp,
                mod.GetObjectPosition(mod.GetHQ(lp.teamId)),
                this.AI_UNSPAWN_DELAY
            )
        }
    }

    protected override OnPlayerEarnedKill(
        eventPlayer: mod.Player,
        eventOtherPlayer: mod.Player,
        eventDeathType: mod.DeathType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {
        const team = mod.GetTeam(eventPlayer)
        const otherTeam = mod.GetTeam(eventOtherPlayer)

        if (mod.Equals(team, otherTeam)) {
            return
        }

        // Team score increments only on enemy kills
        const teamScore = this.addTeamScore(team, 1)

        mod.SetGameModeScore(team, teamScore)
    }

    protected override OngoingGlobal(): void {
        mod.SetScoreboardHeader(
            mod.Message(
                `gamemodes.TDM.scoreboard.team1`,
                mod.GetGameModeScore(mod.GetTeam(1)),
                this.TARGET_SCORE
            ),
            mod.Message(
                `gamemodes.TDM.scoreboard.team2`,
                mod.GetGameModeScore(mod.GetTeam(2)),
                this.TARGET_SCORE
            )
        )
    }

    private addTeamScore(team: mod.Team, deltaScore: number): number {
        // Local cache avoids race conditions on rapid multi-kill events
        const teamId = mod.GetObjId(team)
        const currentScore =
            this.teamScores.get(teamId) ?? mod.GetGameModeScore(team)
        const nextScore = currentScore + deltaScore
        this.teamScores.set(teamId, nextScore)
        return nextScore
    }

    private getRoamWps(from: number, to: number): mod.Vector[] {
        const out: mod.Vector[] = []

        for (let id = from; id <= to; id++) {
            const wp = mod.GetSpatialObject(id)
            out.push(mod.GetObjectPosition(wp))
        }

        return out
    }
}
