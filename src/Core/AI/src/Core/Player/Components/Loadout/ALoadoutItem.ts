// Abstract base class for all loadout items.
// This defines common properties only and enforces valid inheritance.

export abstract class CorePlayer_ALoadoutItem {
    constructor(
        public readonly slot: mod.InventorySlots,
        public readonly name: string
    ) {}
}
