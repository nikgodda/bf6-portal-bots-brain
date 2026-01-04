// --------------------------------------------------
// WP helpers (pure data)
// --------------------------------------------------

export interface WpIdRange {
    from: number
    to: number
}

// --------------------------------------------------
// Capture point definitions
// --------------------------------------------------

export interface SectorTeamCapturePointDef {
    hq: number
}

// --------------------------------------------------
// Sector definitions
// --------------------------------------------------

export interface SectorTeamDef {
    nextSectorId: number

    capturePoints: {
        [capturePointId: string]: SectorTeamCapturePointDef
    }
}

export interface SectorDef {
    bufferHQId: number
    teams: {
        [teamId: number]: SectorTeamDef
    }
}

// --------------------------------------------------
// Map-level data
// --------------------------------------------------

export interface MapTeamDef {
    winCapturePointId: number
    botCount: number
}

export interface MapDataDef {
    map: mod.Maps
    initSectorId: number
    capturePointFlags: {
        [capturePointId: number]: mod.VoiceOverFlags
    }
    teams: {
        [teamId: string]: MapTeamDef
    }

    sectors: {
        [sectorId: number]: SectorDef
    }
}

// --------------------------------------------------
// Map data
// --------------------------------------------------

export const MAP_DATA: readonly MapDataDef[] = [
    {
        map: mod.Maps.Abbasid,
        initSectorId: 2,

        capturePointFlags: {
            1: mod.VoiceOverFlags.Alpha,
            2: mod.VoiceOverFlags.Bravo,
            3: mod.VoiceOverFlags.Charlie,
            4: mod.VoiceOverFlags.Delta,
            5: mod.VoiceOverFlags.Echo,
            6: mod.VoiceOverFlags.Foxtrot,
            7: mod.VoiceOverFlags.Golf,
            8: mod.VoiceOverFlags.Alpha,
        },

        teams: {
            1: {
                winCapturePointId: 8,
                botCount: 9,
            },
            2: {
                winCapturePointId: 1,
                botCount: 10,
            },
        },

        sectors: {
            1: {
                bufferHQId: 1,
                teams: {
                    1: {
                        capturePoints: {
                            1: { hq: 111 },
                        },
                        nextSectorId: 2,
                    },
                    2: {
                        capturePoints: {
                            2: { hq: 221 },
                            3: { hq: 321 },
                        },
                        nextSectorId: 1,
                    },
                },
            },

            2: {
                bufferHQId: 2,
                teams: {
                    1: {
                        capturePoints: {
                            2: { hq: 211 },
                            3: { hq: 311 },
                        },
                        nextSectorId: 3,
                    },
                    2: {
                        capturePoints: {
                            4: { hq: 421 },
                            5: { hq: 521 },
                        },
                        nextSectorId: 1,
                    },
                },
            },

            3: {
                bufferHQId: 3,
                teams: {
                    1: {
                        capturePoints: {
                            4: { hq: 411 },
                            5: { hq: 511 },
                        },
                        nextSectorId: 4,
                    },
                    2: {
                        capturePoints: {
                            6: { hq: 621 },
                            7: { hq: 721 },
                        },
                        nextSectorId: 2,
                    },
                },
            },

            4: {
                bufferHQId: 4,
                teams: {
                    1: {
                        capturePoints: {
                            6: { hq: 611 },
                            7: { hq: 711 },
                        },
                        nextSectorId: 4,
                    },
                    2: {
                        capturePoints: {
                            8: { hq: 821 },
                        },
                        nextSectorId: 3,
                    },
                },
            },
        },
    },
]
