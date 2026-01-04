import { CorePlayer_APlayerManager } from 'src/Core/Player/APlayerManager'
import { TDM_Player } from './TDM_Player'

export class TDM_PlayerManager extends CorePlayer_APlayerManager {
    constructor() {
        super(TDM_Player)
    }
}

