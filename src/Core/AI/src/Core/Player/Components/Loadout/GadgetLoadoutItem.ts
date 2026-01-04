// Loadout item representing a gadget.

import { CorePlayer_ALoadoutItem } from "./ALoadoutItem";

export class CorePlayer_GadgetLoadoutItem extends CorePlayer_ALoadoutItem {
    constructor(
        slot: mod.InventorySlots,
        name: string,
        public readonly gadget: mod.Gadgets
    ) {
        super(slot, name)
    }
}
