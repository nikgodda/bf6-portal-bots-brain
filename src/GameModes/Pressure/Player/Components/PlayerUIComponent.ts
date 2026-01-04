import { CorePlayer_APlayer } from 'src/Core/Player/APlayer'
import { CorePlayer_IComponent } from 'src/Core/Player/APlayer'
import { PRSR_GameMode } from '../../PRSR_GameMode'
import { IGameModeEvents } from '../../IGameModeEvents'
import { CoreUI_Colors } from 'src/Core/UI/UIColors'

/*
 * PlayerUIComponent
 *
 * Single UI composition root for a human player.
 * Owns all PRESSURE-specific UI and reacts to GameMode events.
 *
 * This component does NOT drive game logic.
 * It only reacts to already-finalized GameMode state.
 */
export class PlayerUIComponent
    implements CorePlayer_IComponent, IGameModeEvents
{
    private lp!: CorePlayer_APlayer
    private gameMode!: PRSR_GameMode

    private root!: mod.UIWidget

    private sectorContainer!: mod.UIWidget
    private sectorText!: mod.UIWidget
    private sectorVisibleUntilMs = 0

    private capturePointContainer!: mod.UIWidget
    private capturePointText!: mod.UIWidget
    private currentCapturePoint: mod.CapturePoint | null = null

    private lastCapturePointLabelKey = 0

    private static readonly CAPTURE_POINT_UI_DEBOUNCE_MS = 0.1
    private capturePointUpdateToken = 0

    // Countdown UI
    private countdownText!: mod.UIWidget
    private countdownEndAtMs = 0
    private countdownLastSecond = -1

    private readonly capturePointUiMap: {
        [key: number]: { label: string; color: mod.Vector }
    } = {
        1: {
            label: mod.stringkeys.gamemodes.PRSR.capturePoints.contested,
            color: CoreUI_Colors.YellowLight,
        },
        2: {
            label: mod.stringkeys.gamemodes.PRSR.capturePoints.defending,
            color: CoreUI_Colors.White,
        },
        3: {
            label: mod.stringkeys.gamemodes.PRSR.capturePoints.capturing,
            color: CoreUI_Colors.BlueLight,
        },
        4: {
            label: mod.stringkeys.gamemodes.PRSR.capturePoints.losing,
            color: CoreUI_Colors.RedLight,
        },
    }

    private readonly sectorUiMap: {
        [key: number]: { label: string; color: mod.Vector }
    } = {
        1: {
            label: mod.stringkeys.gamemodes.PRSR.sectors.taken,
            color: CoreUI_Colors.BlueLight,
        },
        2: {
            label: mod.stringkeys.gamemodes.PRSR.sectors.lost,
            color: CoreUI_Colors.RedLight,
        },
    }

    constructor(gameMode: PRSR_GameMode) {
        this.gameMode = gameMode
    }

    // -------------------------------------------------
    // Lifecycle
    // -------------------------------------------------

    onAttach(ap: CorePlayer_APlayer): void {
        this.lp = ap

        this.createRoot()
        this.createSectorText()
        this.createCapturePointText()
        this.createCountdownText()

        ap.addListener({
            OngoingPlayer: () => this.tick(),

            OnPlayerEnterCapturePoint: (eventCapturePoint) => {
                this.currentCapturePoint = eventCapturePoint
                mod.SetUIWidgetVisible(this.capturePointContainer, true)
            },

            OnPlayerExitCapturePoint: () => {
                this.currentCapturePoint = null
                this.lastCapturePointLabelKey = 0
                mod.SetUIWidgetVisible(this.capturePointContainer, false)
            },
        })

        this.gameMode.addListener(this)
    }

    onDetach(): void {
        this.gameMode.removeListener(this)
        mod.DeleteUIWidget(this.root)
    }

    // -------------------------------------------------
    // GameMode events
    // -------------------------------------------------

    OnSectorChanged(
        currentSectorId: number,
        previousSectorId: number,
        teamId: number,
        bufferTime: number
    ): void {
        const labelKey = this.lp.teamId === teamId ? 1 : 2
        const uiState = this.sectorUiMap[labelKey]

        mod.SetUITextLabel(this.sectorText, mod.Message(uiState.label))
        mod.SetUITextColor(this.sectorText, uiState.color)
        mod.SetUIWidgetVisible(this.sectorContainer, true)

        this.sectorVisibleUntilMs = Date.now() + bufferTime * 1000

        // Example countdown (grace / buffer time)
        this.showCountdown(bufferTime)
    }

    OngoingCapturePoint(eventCapturePoint: mod.CapturePoint): void {
        if (
            !this.currentCapturePoint ||
            mod.GetObjId(eventCapturePoint) !==
                mod.GetObjId(this.currentCapturePoint)
        ) {
            return
        }

        this.updateCapturePointState(eventCapturePoint)
    }

    // -------------------------------------------------
    // Capture point UI logic
    // -------------------------------------------------

    private updateCapturePointState(capturePoint: mod.CapturePoint): void {
        const playersOnPoint = mod.GetPlayersOnPoint(capturePoint)
        const playersCount = mod.CountOf(playersOnPoint)

        let myTeamCount = 0
        let enemyTeamCount = 0

        const myTeam = mod.GetTeam(this.lp.player)

        for (let i = 0; i < playersCount; i++) {
            const player = mod.ValueInArray(playersOnPoint, i) as mod.Player
            const team = mod.GetTeam(player)

            if (mod.GetObjId(team) === mod.GetObjId(myTeam)) {
                myTeamCount++
            } else {
                enemyTeamCount++
            }
        }

        const ownerTeam = mod.GetCurrentOwnerTeam(capturePoint)

        let labelKey: number

        switch (true) {
            case myTeamCount === enemyTeamCount:
                labelKey = 1
                break

            case myTeamCount > enemyTeamCount &&
                mod.GetObjId(ownerTeam) === mod.GetObjId(myTeam):
                labelKey = 2
                break

            case myTeamCount > enemyTeamCount:
                labelKey = 3
                break

            default:
                labelKey = 4
        }

        if (this.lastCapturePointLabelKey === labelKey) {
            return
        }

        this.lastCapturePointLabelKey = labelKey
        const uiState = this.capturePointUiMap[labelKey]

        const token = ++this.capturePointUpdateToken
        this.deferCapturePointLabel(uiState.label, uiState.color, token)
    }

    private async deferCapturePointLabel(
        label: string,
        color: mod.Vector,
        token: number
    ): Promise<void> {
        await mod.Wait(PlayerUIComponent.CAPTURE_POINT_UI_DEBOUNCE_MS)

        if (token !== this.capturePointUpdateToken) return
        if (!this.currentCapturePoint) return

        mod.SetUITextLabel(this.capturePointText, mod.Message(label))
        mod.SetUITextColor(this.capturePointText, color)
    }

    // -------------------------------------------------
    // Countdown UI
    // -------------------------------------------------

    private showCountdown(durationSec: number): void {
        this.countdownEndAtMs = Date.now() + durationSec * 1000
        this.countdownLastSecond = -1
        mod.SetUIWidgetVisible(this.countdownText, true)
    }

    private hideCountdown(): void {
        this.countdownEndAtMs = 0
        this.countdownLastSecond = -1
        mod.SetUIWidgetVisible(this.countdownText, false)
    }

    // -------------------------------------------------
    // UI creation
    // -------------------------------------------------

    private createRoot(): void {
        mod.AddUIContainer(
            'player_ui_root_' + this.lp.id,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(1920, 1080, 0),
            mod.UIAnchor.TopLeft,
            mod.GetUIRoot(),
            true,
            0,
            mod.CreateVector(0, 0, 0),
            1,
            mod.UIBgFill.None,
            mod.UIDepth.AboveGameUI,
            this.lp.player
        )

        this.root = mod.FindUIWidgetWithName('player_ui_root_' + this.lp.id)
    }

    private createSectorText(): void {
        mod.AddUIContainer(
            'sector_container_' + this.lp.id, // name: string,
            mod.CreateVector(0, 80, 0), // position: Vector,
            mod.CreateVector(1920, 140, 0), // size: Vector,
            mod.UIAnchor.TopCenter, // anchor: UIAnchor,
            this.root, // parent: UIWidget,
            false, // visible: boolean,
            0, // padding: number,
            mod.CreateVector(0.9, 0.9, 0.9), // bgColor: Vector,
            1, // bgAlpha: number,
            mod.UIBgFill.Blur // bgFill: UIBgFill
        )

        this.sectorContainer = mod.FindUIWidgetWithName(
            'sector_container_' + this.lp.id
        )

        mod.AddUIText(
            'sector_text_' + this.lp.id,
            mod.CreateVector(0, 10, 0),
            mod.CreateVector(1920, 80, 0),
            mod.UIAnchor.TopLeft,
            this.sectorContainer,
            true,
            0,
            CoreUI_Colors.Black,
            1,
            mod.UIBgFill.None,
            mod.Message(1),
            80,
            CoreUI_Colors.White,
            0.8,
            mod.UIAnchor.TopCenter
        )

        this.sectorText = mod.FindUIWidgetWithName('sector_text_' + this.lp.id)
    }

    private createCapturePointText(): void {
        mod.AddUIContainer(
            'capture_point_container_' + this.lp.id, // name: string,
            mod.CreateVector(0, 80, 0), // position: Vector,
            mod.CreateVector(464, 140, 0), // size: Vector,
            mod.UIAnchor.TopCenter, // anchor: UIAnchor,
            this.root, // parent: UIWidget,
            false, // visible: boolean,
            0, // padding: number,
            mod.CreateVector(0.9, 0.9, 0.9), // bgColor: Vector,
            1, // bgAlpha: number,
            mod.UIBgFill.Blur // bgFill: UIBgFill
        )

        this.capturePointContainer = mod.FindUIWidgetWithName(
            'capture_point_container_' + this.lp.id
        )

        mod.AddUIText(
            'capture_point_title_' + this.lp.id,
            mod.CreateVector(0, 20, 0),
            mod.CreateVector(400, 30, 0),
            mod.UIAnchor.TopCenter,
            this.capturePointContainer,
            true,
            0,
            mod.CreateVector(0, 0, 0),
            1,
            mod.UIBgFill.None,
            mod.Message('gamemodes.PRSR.capturePoint'),
            30,
            CoreUI_Colors.White,
            0.5,
            mod.UIAnchor.TopCenter
        )

        mod.AddUIText(
            'capture_point_text_' + this.lp.id,
            mod.CreateVector(0, 40, 0),
            mod.CreateVector(400, 80, 0),
            mod.UIAnchor.TopCenter,
            this.capturePointContainer,
            true,
            0,
            mod.CreateVector(0, 0, 0),
            1,
            mod.UIBgFill.None,
            mod.Message(1),
            80,
            CoreUI_Colors.White,
            0.8,
            mod.UIAnchor.TopCenter
        )

        this.capturePointText = mod.FindUIWidgetWithName(
            'capture_point_text_' + this.lp.id
        )
    }

    private createCountdownText(): void {
        mod.AddUIText(
            'countdown_text_' + this.lp.id,
            mod.CreateVector(0, 90, 0),
            mod.CreateVector(1920, 30, 0),
            mod.UIAnchor.TopLeft,
            this.sectorContainer,
            false,
            0,
            CoreUI_Colors.Black,
            1,
            mod.UIBgFill.None,
            mod.Message(1),
            30,
            CoreUI_Colors.White,
            0.6,
            mod.UIAnchor.TopCenter
        )

        this.countdownText = mod.FindUIWidgetWithName(
            'countdown_text_' + this.lp.id
        )
    }

    // -------------------------------------------------
    // Tick
    // -------------------------------------------------

    private tick(): void {
        if (this.sectorVisibleUntilMs !== 0) {
            if (mod.GetUIWidgetVisible(this.capturePointContainer)) {
                mod.SetUIWidgetVisible(this.capturePointContainer, false)
            }

            if (Date.now() >= this.sectorVisibleUntilMs) {
                mod.SetUIWidgetVisible(this.sectorContainer, false)

                if (this.currentCapturePoint) {
                    mod.SetUIWidgetVisible(this.capturePointContainer, true)
                }

                this.sectorVisibleUntilMs = 0
            }
        }

        if (this.countdownEndAtMs === 0) return

        const remainingMs = this.countdownEndAtMs - Date.now()
        const remainingSec = Math.ceil(remainingMs / 1000)

        if (remainingSec <= 0) {
            this.hideCountdown()
            return
        }

        if (remainingSec !== this.countdownLastSecond) {
            this.countdownLastSecond = remainingSec
            mod.SetUITextLabel(
                this.countdownText,
                mod.Message(
                    `gamemodes.PRSR.sectors.countdown`,
                    remainingSec
                )
            )
        }
    }
}
