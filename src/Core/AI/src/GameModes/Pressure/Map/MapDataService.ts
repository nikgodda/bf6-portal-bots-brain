import { MAP_DATA } from './MapData'
import { MapDataDef, SectorDef, SectorTeamDef, WpIdRange } from './MapData'

// --------------------------------------------------
// Runtime indexed data
// --------------------------------------------------

interface RuntimeSector {
    def: SectorDef
    teams: Map<number, SectorTeamDef>
}

interface RuntimeMapData {
    map: mod.Maps
    initSectorId: number
    capturePointFlags: Map<number, mod.VoiceOverFlags>
    teams: Map<number, { winCapturePointId: number; botCount: number }>
    sectors: Map<number, RuntimeSector>
}

// --------------------------------------------------
// Service
// --------------------------------------------------

export class MapDataService {
    private readonly data: RuntimeMapData

    // --------------------------------------------------
    // Construction
    // --------------------------------------------------

    constructor() {
        // BUG: mod.IsCurrentMap(d.map) works locally ONLY
        // const found = MAP_DATA.find((d) => mod.IsCurrentMap(d.map))
        const found = MAP_DATA[0]

        if (!found) {
            throw new Error('No map data for current map')
        }

        this.data = this.index(found)
    }

    // --------------------------------------------------
    // Indexing (structural only)
    // --------------------------------------------------

    private index(def: MapDataDef): RuntimeMapData {
        const capturePointFlags = new Map<number, mod.VoiceOverFlags>()
        for (const cpIdStr of Object.keys(def.capturePointFlags)) {
            capturePointFlags.set(
                Number(cpIdStr),
                def.capturePointFlags[Number(cpIdStr)]
            )
        }

        const teams = new Map<
            number,
            { winCapturePointId: number; botCount: number }
        >()
        for (const teamIdStr of Object.keys(def.teams)) {
            teams.set(Number(teamIdStr), def.teams[Number(teamIdStr)])
        }

        const sectors = new Map<number, RuntimeSector>()
        for (const sectorIdStr of Object.keys(def.sectors)) {
            const sectorId = Number(sectorIdStr)
            const sectorDef = def.sectors[sectorId]

            const sectorTeams = new Map<number, SectorTeamDef>()
            for (const teamIdStr of Object.keys(sectorDef.teams)) {
                sectorTeams.set(
                    Number(teamIdStr),
                    sectorDef.teams[Number(teamIdStr)]
                )
            }

            sectors.set(sectorId, {
                def: sectorDef,
                teams: sectorTeams,
            })
        }

        return {
            map: def.map,
            initSectorId: def.initSectorId,
            capturePointFlags,
            teams,
            sectors,
        }
    }

    // --------------------------------------------------
    // Map-level metadata API
    // --------------------------------------------------

    getInitSectorId(): number {
        return this.data.initSectorId
    }

    getAllSectorIds(): number[] {
        return Array.from(this.data.sectors.keys())
    }

    getAllCapturePointIds(): number[] {
        return Array.from(this.data.capturePointFlags.keys())
    }

    getBotCount(teamId: number): number {
        const team = this.data.teams.get(teamId)
        if (!team) {
            throw new Error('No team data for team ' + teamId)
        }
        return team.botCount
    }

    getWinCapturePointId(teamId: number): number {
        const team = this.data.teams.get(teamId)
        if (!team) {
            throw new Error('No team data for team ' + teamId)
        }
        return team.winCapturePointId
    }

    // This checks whether a team currently owns all capture points in a sector.

    doesTeamControlEntireSector(sectorId: number, teamId: number): boolean {
        const cps = this.getAllCapturePointsInSector(sectorId)

        for (const cp of cps) {
            const ownerTeam = mod.GetCurrentOwnerTeam(cp)

            if (mod.GetObjId(ownerTeam) !== teamId) {
                return false
            }
        }

        return true
    }

    // This checks whether a team controls the frontline of a sector,
    // meaning all capture points assigned to other teams are owned by this team.

    // BUG: currently mod.SetCapturePointOwner is not working. Cant effectively set previous sector Capture Points owner

    doesTeamControlFrontline(sectorId: number, teamId: number): boolean {
        const sector = this.getSector(sectorId)
        const enemyCpIds = new Set<number>()

        for (const [otherTeamId, teamDef] of sector.teams.entries()) {
            if (otherTeamId === teamId) continue

            for (const cpIdStr of Object.keys(teamDef.capturePoints)) {
                enemyCpIds.add(Number(cpIdStr))
            }
        }

        for (const cpId of enemyCpIds) {
            const cp = mod.GetCapturePoint(cpId)
            const ownerTeam = mod.GetCurrentOwnerTeam(cp)

            if (!ownerTeam || mod.GetObjId(ownerTeam) !== teamId) {
                return false
            }
        }

        return true
    }

    // --------------------------------------------------
    // Capture point metadata API
    // --------------------------------------------------

    getFlagForCapturePoint(cpId: number): mod.VoiceOverFlags | null {
        return this.data.capturePointFlags.get(cpId) ?? null
    }

    // --------------------------------------------------
    // Sector metadata API
    // --------------------------------------------------

    getSectorBufferHQId(sectorId: number): number | null {
        return this.getSector(sectorId).def.bufferHQId
    }

    getNextSectorId(sectorId: number, teamId: number): number | null {
        return this.getSectorTeam(sectorId, teamId).nextSectorId ?? null
    }

    // --------------------------------------------------
    // AI helpers
    // --------------------------------------------------

    /* getRoamWPs(sectorId: number, player: mod.Player): mod.Vector[] {
        const pos = this.getClosestEnemyCapturePointPosition(sectorId, player)

        if (!pos) {
            return [mod.GetObjectPosition(player)]
        }
        return [pos]
    }

    getDefendWPs(sectorId: number, player: mod.Player): mod.Vector[] {
        const pos = this.getClosestEnemyCapturePointPosition(sectorId, player)

        if (!pos) {
            return [mod.GetObjectPosition(player)]
        }
        return [pos]
    } */

    getBotSpawnPos(sectorId: number, teamId: number): mod.Vector {
        const team = this.getSectorTeam(sectorId, teamId)
        const cpIds = Object.keys(team.capturePoints).map(Number)

        if (cpIds.length === 0) {
            throw new Error(
                'No capture points for team ' +
                    teamId +
                    ' in sector ' +
                    sectorId
            )
        }

        const cpId = cpIds[Math.floor(Math.random() * cpIds.length)]
        const hq = mod.GetHQ(team.capturePoints[cpId].hq)

        return mod.GetObjectPosition(hq)
    }

    // --------------------------------------------------
    // Objective control (engine mutation)
    // --------------------------------------------------

    enableSector(sectorId: number): void {
        const sector = this.getSector(sectorId)

        mod.EnableGameModeObjective(mod.GetSector(sectorId), true)

        for (const team of sector.teams.values()) {
            for (const cpIdStr of Object.keys(team.capturePoints)) {
                const cpId = Number(cpIdStr)
                const cp = mod.GetCapturePoint(cpId)

                mod.EnableGameModeObjective(cp, true)
                mod.EnableCapturePointDeploying(cp, false)

                const hq = mod.GetHQ(team.capturePoints[cpId].hq)
                if (hq) {
                    mod.EnableHQ(hq, true)
                }
            }
        }
    }

    disableSector(sectorId: number, attackingTeamId?: number): void {
        const sector = this.getSector(sectorId)

        for (const team of sector.teams.values()) {
            for (const cpIdStr of Object.keys(team.capturePoints)) {
                const cpId = Number(cpIdStr)
                const cp = mod.GetCapturePoint(cpId)

                if (attackingTeamId !== undefined) {
                    mod.SetCapturePointOwner(cp, mod.GetTeam(attackingTeamId))
                }

                mod.EnableGameModeObjective(cp, false)
                mod.EnableHQ(mod.GetHQ(team.capturePoints[cpId].hq), false)
            }
        }

        mod.EnableGameModeObjective(mod.GetSector(sectorId), false)
    }

    disableAllSectors(): void {
        for (const sectorId of this.data.sectors.keys()) {
            this.disableSector(sectorId)
        }
    }

    // --------------------------------------------------
    // Internal helpers
    // --------------------------------------------------

    private getSector(sectorId: number): RuntimeSector {
        const sector = this.data.sectors.get(sectorId)
        if (!sector) {
            throw new Error('Sector not found: ' + sectorId)
        }
        return sector
    }

    private getSectorTeam(sectorId: number, teamId: number): SectorTeamDef {
        const team = this.getSector(sectorId).teams.get(teamId)
        if (!team) {
            throw new Error('No team ' + teamId + ' in sector ' + sectorId)
        }
        return team
    }

    // Returns all unique capture point ids that belong to a sector.

    public getAllCapturePointsInSector(sectorId: number): mod.CapturePoint[] {
        const sector = this.getSector(sectorId)
        const cps = new Set<mod.CapturePoint>()

        for (const team of sector.teams.values()) {
            for (const cpId of Object.keys(team.capturePoints)) {
                cps.add(mod.GetCapturePoint(+cpId))
            }
        }

        return [...cps]
    }

    private resolveWpRange(range: WpIdRange): mod.Vector[] {
        const out: mod.Vector[] = []

        for (let id = range.from; id <= range.to; id++) {
            const wp = mod.GetSpatialObject(id)
            out.push(mod.GetObjectPosition(wp))
        }

        return out
    }
}
