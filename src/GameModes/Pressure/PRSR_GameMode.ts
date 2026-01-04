// Orchestrates Pressure gameplay while delegating VO playback to VOService.
import { Core_AGameMode } from 'src/Core/AGameMode'
import { CorePlayer_APlayerManager } from 'src/Core/Player/APlayerManager'

import { PlayerManager } from './Player/PlayerManager'

import { CoreAI_CombatantProfile } from 'src/Core/AI/Profiles/CombatantProfile'
import { CoreAI_Brain } from 'src/Core/AI/Brain'
import { CorePlayer_BrainComponent } from 'src/Core/Player/Components/AI/BrainComponent'

import { Core_SquadManager } from 'src/Core/Squad/SquadManager'

import { MapDataService } from './Map/MapDataService'
import { IGameModeEvents } from './IGameModeEvents'
import { VOService } from './Services/VOService'
import { CorePlayer_APlayer } from 'src/Core/Player/APlayer'
import { PlayerUIComponent } from './Player/Components/PlayerUIComponent'

/**
 * GameMode
 *
 * Orchestrates Breakthrough gameplay.
 * Uses Core_AGameMode event system.
 * Emits Pressure-specific events.
 */
export class PRSR_GameMode extends Core_AGameMode<IGameModeEvents> {
    private CAPTURE_POINT_TIME = 6
    private BOTS_UNSPAWN_DELAY = 10

    protected declare playerManager: PlayerManager

    private squadManager: Core_SquadManager | null = null
    public mapData!: MapDataService

    private currentSectorId = 0

    private readonly captureProgressMap = new Map<
        number,
        {
            captureProgress: number
            isCapturing: boolean
        }
    >()

    // -------------------------------------------------
    // Player manager
    // -------------------------------------------------

    protected createPlayerManager(): CorePlayer_APlayerManager {
        return new PlayerManager()
    }

    // -------------------------------------------------
    // Game mode lifecycle
    // -------------------------------------------------

    protected override async OnGameModeStarted(): Promise<void> {
        mod.SetScoreboardType(mod.ScoreboardType.CustomTwoTeams)
        mod.SetScoreboardColumnNames(
            mod.Message(`gamemodes.PRSR.scoreboard.score`),
            mod.Message(`gamemodes.PRSR.scoreboard.kills`),
            mod.Message(`gamemodes.PRSR.scoreboard.deaths`),
            mod.Message(`gamemodes.PRSR.scoreboard.teamKills`),
            mod.Message(`gamemodes.PRSR.scoreboard.killStreak`)
        )

        mod.SetGameModeTargetScore(1)
        mod.SetScoreboardColumnWidths(1, 0.5, 0.5, 0.5, 0.5)

        mod.SetFriendlyFire(true)
        mod.SetGameModeTimeLimit(1200)
        mod.SetAIToHumanDamageModifier(2)
        mod.SetSpawnMode(mod.SpawnModes.Deploy)

        this.mapData = new MapDataService()
        new VOService(this, this.mapData)

        this.initBots()
        this.initSectors()
    }

    // -------------------------------------------------
    // Player join / leave
    // -------------------------------------------------

    protected override OnLogicalPlayerJoinGame(lp: CorePlayer_APlayer): void {
        // mod.SetTeam(lp.player, mod.GetTeam(2))

        if (!lp.isAI()) {
            lp.addComponent(new PlayerUIComponent(this))
        }

        // Set AI Brain
        if (lp.isLogicalAI()) {
            const brain = new CoreAI_Brain(
                lp.player,
                new CoreAI_CombatantProfile({
                    arrivalSensor: {
                        getWPs: () => this.getDefendWPs(),
                        ttlMs: 10000,
                    },
                    moveToCapturePointSensor: {
                        getCapturePoints: () =>
                            this.mapData.getAllCapturePointsInSector(
                                this.currentSectorId
                            ),
                    },
                })
            )

            lp.addComponent(new CorePlayer_BrainComponent(brain))
        }

        if (!this.squadManager) {
            this.squadManager = new Core_SquadManager(this, 2)
        }

        this.squadManager.addToSquad(lp)
    }

    protected override OnPlayerLeaveGame(eventNumber: number): void {
        const lp = this.playerManager.getById(eventNumber)
        if (!lp) return

        // Respawn persistent bot
        if (lp.isLogicalAI()) {
            this.playerManager.respawnLogicalBot(
                lp,
                this.mapData.getBotSpawnPos(this.currentSectorId, lp.teamId),
                this.BOTS_UNSPAWN_DELAY
            )
        }
    }

    protected override async OnPlayerInteract(
        eventPlayer: mod.Player,
        eventInteractPoint: mod.InteractPoint
    ): Promise<void> {
        mod.EnableInteractPoint(eventInteractPoint, false)
        await mod.Wait(30)
        mod.EnableInteractPoint(eventInteractPoint, true)
    }

    // -------------------------------------------------
    // Capture interaction
    // -------------------------------------------------

    protected override OnCapturePointCaptured(
        eventCapturePoint: mod.CapturePoint
    ): void {
        const cpId = mod.GetObjId(eventCapturePoint)

        const ownerTeam = mod.GetCurrentOwnerTeam(eventCapturePoint)
        const ownerTeamId = mod.GetObjId(ownerTeam)

        // BUG: need to set true first or false will not work
        mod.EnableCapturePointDeploying(eventCapturePoint, true)
        mod.EnableCapturePointDeploying(eventCapturePoint, false)

        // Sector not fully controlled
        if (
            !this.mapData.doesTeamControlEntireSector(
                this.currentSectorId,
                ownerTeamId
            )
        ) {
            this.emitCustom('OnCapturePointCapturedResolved', eventCapturePoint)
            return
        }

        // Win condition
        if (this.mapData.getWinCapturePointId(ownerTeamId) === cpId) {
            mod.SetGameModeScore(ownerTeam, 1)
            return
        }

        const nextSectorId = this.mapData.getNextSectorId(
            this.currentSectorId,
            ownerTeamId
        )

        if (nextSectorId === null || nextSectorId === this.currentSectorId) {
            return
        }

        // Graceful transition
        this.mapData.disableSector(this.currentSectorId, ownerTeamId)

        const bufferHQ = this.mapData.getSectorBufferHQId(this.currentSectorId)
        if (bufferHQ) {
            this.enableSectorBufferHQ(bufferHQ, 10)
        }

        const previousSectorId = this.currentSectorId
        this.currentSectorId = nextSectorId
        this.mapData.enableSector(this.currentSectorId)

        this.emitCustom(
            'OnSectorChanged',
            this.currentSectorId,
            previousSectorId,
            ownerTeamId,
            10
        )
    }

    protected override OngoingCapturePoint(
        eventCapturePoint: mod.CapturePoint
    ): void {
        const captureProgress = mod.GetCaptureProgress(eventCapturePoint)

        if (captureProgress === 0 || captureProgress === 1) {
            return
        }

        const capturePointId = mod.GetObjId(eventCapturePoint)

        const captureProgressMapEntry =
            this.captureProgressMap.get(capturePointId)

        if (!captureProgressMapEntry) {
            this.captureProgressMap.set(capturePointId, {
                captureProgress,
                isCapturing: true,
            })
        }

        if (captureProgress < captureProgressMapEntry!.captureProgress) {
            // Neutralization
            if (captureProgressMapEntry?.isCapturing) {
                mod.SetCapturePointNeutralizationTime(
                    eventCapturePoint,
                    this.CAPTURE_POINT_TIME
                )
            }

            this.captureProgressMap.set(capturePointId, {
                captureProgress,
                isCapturing: false,
            })
        } else {
            // Capturing
            if (!captureProgressMapEntry?.isCapturing) {
                mod.SetCapturePointCapturingTime(
                    eventCapturePoint,
                    this.CAPTURE_POINT_TIME
                )
            }

            this.captureProgressMap.set(capturePointId, {
                captureProgress,
                isCapturing: true,
            })
        }
    }

    // Bot spawning

    private async initBots(): Promise<void> {
        await mod.Wait(5)

        const team1Count = this.mapData.getBotCount(1)
        const team2Count = this.mapData.getBotCount(2)

        for (let i = 1; i <= team1Count; i++) {
            this.playerManager.spawnLogicalBot(
                mod.SoldierClass.Assault,
                1,
                this.mapData.getBotSpawnPos(this.currentSectorId, 1),
                mod.Message(`core.ai.bots.${i}`),
                this.BOTS_UNSPAWN_DELAY
            )
            await mod.Wait(1)
        }

        for (let j = 1; j <= team2Count; j++) {
            this.playerManager.spawnLogicalBot(
                mod.SoldierClass.Assault,
                2,
                this.mapData.getBotSpawnPos(this.currentSectorId, 2),
                mod.Message(`core.ai.bots.${team1Count + j}`),
                this.BOTS_UNSPAWN_DELAY
            )
            await mod.Wait(1)
        }
    }

    private initSectors() {
        this.mapData.disableAllSectors()
        this.currentSectorId = this.mapData.getInitSectorId()
        this.mapData.enableSector(this.currentSectorId)
    }

    private async enableSectorBufferHQ(
        bufferHQId: number,
        duration: number
    ): Promise<void> {
        mod.SetHQTeam(mod.GetHQ(bufferHQId), mod.GetTeam(1))
        await mod.Wait(duration)
        mod.SetHQTeam(mod.GetHQ(bufferHQId), mod.GetTeam(0))
    }

    private getDefendWPs(): mod.Vector[] {
        return this.mapData
            .getAllCapturePointIds()
            .map((id) => mod.GetObjectPosition(mod.GetCapturePoint(id)))
    }
}
