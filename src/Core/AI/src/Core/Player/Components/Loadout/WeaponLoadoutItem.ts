// Loadout item representing a weapon with optional attachments.

import { CorePlayer_ALoadoutItem } from './ALoadoutItem'

export class CorePlayer_WeaponLoadoutItem extends CorePlayer_ALoadoutItem {
    constructor(
        slot: mod.InventorySlots,
        name: string,
        public readonly weapon: mod.Weapons,
        public readonly attachments: mod.WeaponAttachments[]
    ) {
        super(slot, name)
    }
}
