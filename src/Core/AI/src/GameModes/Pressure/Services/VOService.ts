import { PRSR_GameMode } from '../PRSR_GameMode'
import { IGameModeEvents } from '../IGameModeEvents'
import { MapDataService } from '../Map/MapDataService'

type TeamId = number

export class VOService implements IGameModeEvents {
    // teamId -> (capturePointId -> VO)
    private readonly capturePointVOModules = new Map<
        TeamId,
        Map<number, mod.VO>
    >()

    // teamId -> (sectorId -> VO)
    private readonly sectorVOModules = new Map<TeamId, Map<number, mod.VO>>()

    constructor(
        private readonly gameMode: PRSR_GameMode,
        private readonly mapData: MapDataService
    ) {
        this.initCapturePointsVO()
        this.initSectorsVO()

        this.gameMode.addListener(this)
    }

    // -------------------------------------------------
    // Init
    // -------------------------------------------------

    private initCapturePointsVO(): void {
        const teams: TeamId[] = [1, 2]
        const capturePointIds = this.mapData.getAllCapturePointIds()

        for (const teamId of teams) {
            const teamMap = new Map<number, mod.VO>()

            for (const cpId of capturePointIds) {
                const vo = mod.SpawnObject(
                    mod.RuntimeSpawn_Common.SFX_VOModule_OneShot2D,
                    mod.CreateVector(0, 0, 0),
                    mod.CreateVector(0, 0, 0)
                )

                teamMap.set(cpId, vo)
            }

            this.capturePointVOModules.set(teamId, teamMap)
        }
    }

    private initSectorsVO(): void {
        const teams: TeamId[] = [1, 2]
        const sectorIds = this.mapData.getAllSectorIds()

        for (const teamId of teams) {
            const teamMap = new Map<number, mod.VO>()

            for (const sectorId of sectorIds) {
                const vo = mod.SpawnObject(
                    mod.RuntimeSpawn_Common.SFX_VOModule_OneShot2D,
                    mod.CreateVector(0, 0, 0),
                    mod.CreateVector(0, 0, 0)
                )

                teamMap.set(sectorId, vo)
            }

            this.sectorVOModules.set(teamId, teamMap)
        }
    }

    // -------------------------------------------------
    // Capture point events (resolved by GameMode)
    // -------------------------------------------------

    OnCapturePointCapturedResolved(eventCapturePoint: mod.CapturePoint): void {
        const cpId = mod.GetObjId(eventCapturePoint)

        const currentOwner = mod.GetCurrentOwnerTeam(eventCapturePoint)
        const previousOwner = mod.GetPreviousOwnerTeam(eventCapturePoint)

        if (!currentOwner || !previousOwner) {
            return
        }

        const currentOwnerId = mod.GetObjId(currentOwner)
        const previousOwnerId = mod.GetObjId(previousOwner)

        const flag = this.mapData.getFlagForCapturePoint(cpId)
        if (!flag) {
            return
        }

        const friendlyVO = this.capturePointVOModules
            .get(currentOwnerId)
            ?.get(cpId)

        const enemyVO = this.capturePointVOModules
            .get(previousOwnerId)
            ?.get(cpId)

        if (enemyVO) {
            mod.PlayVO(
                enemyVO,
                mod.VoiceOverEvents2D.ObjectiveCapturedEnemy,
                flag,
                previousOwner
            )
        }

        if (friendlyVO) {
            mod.PlayVO(
                friendlyVO,
                mod.VoiceOverEvents2D.ObjectiveCaptured,
                flag,
                currentOwner
            )
        }
    }

    OnCapturePointLost(eventCapturePoint: mod.CapturePoint): void {
        const cpId = mod.GetObjId(eventCapturePoint)

        const previousOwner = mod.GetPreviousOwnerTeam(eventCapturePoint)
        if (!previousOwner) {
            return
        }

        const previousOwnerId = mod.GetObjId(previousOwner)

        const flag = this.mapData.getFlagForCapturePoint(cpId)
        if (!flag) {
            return
        }

        const voModule = this.capturePointVOModules
            .get(previousOwnerId)
            ?.get(cpId)

        if (!voModule) {
            return
        }

        mod.PlayVO(
            voModule,
            mod.VoiceOverEvents2D.ObjectiveLost,
            flag,
            previousOwner
        )
    }

    // -------------------------------------------------
    // Capture interaction (contested)
    // -------------------------------------------------

    OnPlayerEnterCapturePoint(
        eventPlayer: mod.Player,
        eventCapturePoint: mod.CapturePoint
    ): void {
        const ownerTeam = mod.GetCurrentOwnerTeam(eventCapturePoint)
        if (!ownerTeam) {
            return
        }

        const ownerTeamId = mod.GetObjId(ownerTeam)
        const playerTeam = mod.GetTeam(eventPlayer)
        const playerTeamId = mod.GetObjId(playerTeam)

        // Only when entering enemy-owned capture point
        if (ownerTeamId === 0 || ownerTeamId === playerTeamId) {
            return
        }

        const cpId = mod.GetObjId(eventCapturePoint)
        const flag = this.mapData.getFlagForCapturePoint(cpId)
        if (!flag) {
            return
        }

        const enemyVO = this.capturePointVOModules.get(ownerTeamId)?.get(cpId)

        const friendlyVO = this.capturePointVOModules
            .get(playerTeamId)
            ?.get(cpId)

        if (enemyVO) {
            mod.PlayVO(
                enemyVO,
                mod.VoiceOverEvents2D.ObjectiveContested,
                flag,
                ownerTeam
            )
        }

        if (friendlyVO) {
            mod.PlayVO(
                friendlyVO,
                mod.VoiceOverEvents2D.ObjectiveLockdownFriendly,
                flag,
                playerTeam
            )
        }
    }

    // -------------------------------------------------
    // Sector events (resolved by GameMode)
    // -------------------------------------------------

    async OnSectorChanged(
        previousSectorId: number,
        currentSectorId: number,
        teamId: number,
        bufferTime: number
    ): Promise<void> {
        const attackerTeam = mod.GetTeam(teamId)
        const defenderTeam = mod.GetTeam(teamId === 1 ? 2 : 1)

        const attackerVO = this.sectorVOModules
            .get(teamId)
            ?.get(previousSectorId)

        const defenderVO = this.sectorVOModules
            .get(teamId === 1 ? 2 : 1)
            ?.get(previousSectorId)

        const flag = mod.VoiceOverFlags.Alpha

        if (attackerVO) {
            mod.PlayVO(
                attackerVO,
                mod.VoiceOverEvents2D.SectorTakenAttacker,
                flag,
                attackerTeam
            )
        }

        if (defenderVO) {
            mod.PlayVO(
                defenderVO,
                mod.VoiceOverEvents2D.SectorTakenDefender,
                flag,
                defenderTeam
            )
        }
    }
}
