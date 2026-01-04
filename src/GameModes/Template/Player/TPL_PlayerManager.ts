import { CorePlayer_APlayerManager } from 'src/Core/Player/APlayerManager'
import { TPL_Player } from './TPL_Player'

export class TPL_PlayerManager extends CorePlayer_APlayerManager {
    constructor() {
        super(TPL_Player)
    }
}
