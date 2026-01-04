import { Core_AGameMode } from 'src/Core/AGameMode'
import { CorePlayer_APlayerManager } from 'src/Core/Player/APlayerManager'
import { TPL_PlayerManager } from './Player/TPL_PlayerManager'

export class TPL_GameMode extends Core_AGameMode {
    protected override createPlayerManager(): CorePlayer_APlayerManager {
        return new TPL_PlayerManager()
    }

    protected override OnGameModeStarted(): void {
        mod.DisplayNotificationMessage(mod.Message(`gamemodes.TPL.gamemodeStarted`))
    }
}
