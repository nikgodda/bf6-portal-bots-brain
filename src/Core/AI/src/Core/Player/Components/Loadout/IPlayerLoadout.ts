// Minimal loadout definition used by the core loadout component.

import { CorePlayer_ALoadoutItem } from './ALoadoutItem'

export interface CorePlayer_IPlayerLoadout {
    id: string
    items: CorePlayer_ALoadoutItem[]
}
