// Core gameplay component responsible for applying loadouts.
// UI, grouping, and availability are external concerns.

import { CorePlayer_APlayer, CorePlayer_IComponent } from '../../APlayer'
import { CorePlayer_ALoadoutItem } from './ALoadoutItem'
import { CorePlayer_GadgetLoadoutItem } from './GadgetLoadoutItem'
import { CorePlayer_IPlayerLoadout } from './IPlayerLoadout'
import { CorePlayer_WeaponLoadoutItem } from './WeaponLoadoutItem'

export class CorePlayer_LoadoutComponent implements CorePlayer_IComponent {
    private ap!: CorePlayer_APlayer
    private currentLoadout: CorePlayer_IPlayerLoadout | null = null

    onAttach(ap: CorePlayer_APlayer): void {
        this.ap = ap
    }

    onDetach(): void {}

    applyLoadout(loadout: CorePlayer_IPlayerLoadout): void {
        this.clearAllInventorySlots()

        for (const item of loadout.items) {
            this.applyItem(item)
        }

        this.currentLoadout = loadout
    }

    getCurrentLoadout(): CorePlayer_IPlayerLoadout | null {
        return this.currentLoadout
    }

    // ----------------------------------
    // Tested & trusted methods (unchanged)
    // ----------------------------------

    public clearAllInventorySlots(): void {
        const slots: mod.InventorySlots[] = [
            mod.InventorySlots.PrimaryWeapon,
            mod.InventorySlots.SecondaryWeapon,
            mod.InventorySlots.GadgetOne,
            mod.InventorySlots.GadgetTwo,
            mod.InventorySlots.Throwable,
        ]

        for (const slot of slots) {
            mod.RemoveEquipment(this.ap.player, slot)
        }
    }

    private applyItem(item: CorePlayer_ALoadoutItem): void {
        if (item instanceof CorePlayer_WeaponLoadoutItem) {
            const wp = mod.CreateNewWeaponPackage()

            for (const att of item.attachments) {
                mod.AddAttachmentToWeaponPackage(att, wp)
            }

            mod.AddEquipment(this.ap.player, item.weapon, wp, item.slot)
        } else if (item instanceof CorePlayer_GadgetLoadoutItem) {
            mod.AddEquipment(this.ap.player, item.gadget, item.slot)
        }
    }
}
