import { CorePlayer_APlayerManager } from 'src/Core/Player/APlayerManager'
import { Player } from './Player'

export class PlayerManager extends CorePlayer_APlayerManager {
    constructor() {
        super(Player)
    }
}
