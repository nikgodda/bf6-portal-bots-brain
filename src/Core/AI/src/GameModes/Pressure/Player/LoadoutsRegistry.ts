import { CorePlayer_GadgetLoadoutItem } from 'src/Core/Player/Components/Loadout/GadgetLoadoutItem'
import { CorePlayer_IPlayerLoadout } from 'src/Core/Player/Components/Loadout/IPlayerLoadout'
import { CorePlayer_WeaponLoadoutItem } from 'src/Core/Player/Components/Loadout/WeaponLoadoutItem'

export const enum LoadoutIdMap {
    Assault_Operator = 'assault.operator',
    Assault_Elite = 'assault.elite',
    Support_Operator = 'support.operator',
    Support_Elite = 'support.elite',
    Rifleman_Operator = 'rifleman.operator',
    Rifleman_Elite = 'rifleman.elite',
    Sniper_Operator = 'sniper.operator',
    Sniper_Elite = 'sniper.elite',
}

export class LoadoutsRegistry {
    private static readonly loadouts: readonly CorePlayer_IPlayerLoadout[] = [
        // --------------------------------------------------
        // Assault Operator
        // --------------------------------------------------
        {
            id: LoadoutIdMap.Assault_Operator,
            items: [
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.PrimaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.AssaultRifle_L85A3,
                    mod.Weapons.AssaultRifle_L85A3,
                    [
                        mod.WeaponAttachments.Scope_SDO_350x,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_518mm_Factory,
                        mod.WeaponAttachments.Magazine_30rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.SecondaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.SMG_PW7A2,
                    mod.Weapons.SMG_PW7A2,
                    [
                        mod.WeaponAttachments.Scope_RO_M_175x,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_180mm_Standard,
                        mod.WeaponAttachments.Magazine_30rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_GadgetLoadoutItem(
                    mod.InventorySlots.GadgetOne,
                    mod.stringkeys.gamemodes.PRSR.loadout.gadgets.Launcher_High_Explosive,
                    mod.Gadgets.Launcher_High_Explosive
                ),
            ],
        },

        // --------------------------------------------------
        // Assault Elite
        // --------------------------------------------------
        {
            id: LoadoutIdMap.Assault_Elite,
            items: [
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.PrimaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.AssaultRifle_SOR_556_Mk2,
                    mod.Weapons.AssaultRifle_SOR_556_Mk2,
                    [
                        mod.WeaponAttachments.Scope_PVQ_31_400x,
                        mod.WeaponAttachments.Muzzle_Standard_Suppressor,
                        mod.WeaponAttachments.Barrel_IAR_Heavy,
                        mod.WeaponAttachments.Bottom_Slim_Angled,
                        mod.WeaponAttachments.Magazine_30rnd_Fast_Mag,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.SecondaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.SMG_SGX,
                    mod.Weapons.SMG_SGX,
                    [
                        mod.WeaponAttachments.Scope_SU_231_150x,
                        mod.WeaponAttachments.Top_5_mW_Red,
                        mod.WeaponAttachments.Right_Flashlight,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_6_Fluted,
                        mod.WeaponAttachments.Magazine_41rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_GadgetLoadoutItem(
                    mod.InventorySlots.GadgetOne,
                    mod.stringkeys.gamemodes.PRSR.loadout.gadgets.Launcher_High_Explosive,
                    mod.Gadgets.Launcher_High_Explosive
                ),
            ],
        },

        // --------------------------------------------------
        // Support Operator
        // --------------------------------------------------
        {
            id: LoadoutIdMap.Support_Operator,
            items: [
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.PrimaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.LMG_L110,
                    mod.Weapons.LMG_L110,
                    [
                        mod.WeaponAttachments.Scope_R4T_200x,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_349mm_SB,
                        mod.WeaponAttachments.Bottom_Bipod,
                        mod.WeaponAttachments.Magazine_100rnd_Belt_Pouch,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.SecondaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.Shotgun_M87A1,
                    mod.Weapons.Shotgun_M87A1,
                    [
                        mod.WeaponAttachments.Scope_Iron_Sights,
                        mod.WeaponAttachments.Barrel_20_Factory,
                        mod.WeaponAttachments.Magazine_7_Shell_Tube,
                        mod.WeaponAttachments.Ammo_Buckshot,
                    ]
                ),
                new CorePlayer_GadgetLoadoutItem(
                    mod.InventorySlots.Throwable,
                    mod.stringkeys.gamemodes.PRSR.loadout.gadgets.Throwable_Smoke_Grenade,
                    mod.Gadgets.Throwable_Smoke_Grenade
                ),
            ],
        },

        // --------------------------------------------------
        // Support Elite
        // --------------------------------------------------
        {
            id: LoadoutIdMap.Support_Elite,
            items: [
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.PrimaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.LMG_M240L,
                    mod.Weapons.LMG_M240L,
                    [
                        mod.WeaponAttachments.Scope_SU_231_150x,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_20_OH,
                        mod.WeaponAttachments.Bottom_Bipod,
                        mod.WeaponAttachments.Magazine_75rnd_Belt_Box,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.SecondaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.Shotgun_M1014,
                    mod.Weapons.Shotgun_M1014,
                    [
                        mod.WeaponAttachments.Scope_SU_231_150x,
                        mod.WeaponAttachments.Barrel_185_Factory,
                        mod.WeaponAttachments.Bottom_Slim_Angled,
                        mod.WeaponAttachments.Magazine_6_Shell_Tube,
                        mod.WeaponAttachments.Ammo_Buckshot,
                    ]
                ),
                new CorePlayer_GadgetLoadoutItem(
                    mod.InventorySlots.Throwable,
                    mod.stringkeys.gamemodes.PRSR.loadout.gadgets.Throwable_Smoke_Grenade,
                    mod.Gadgets.Throwable_Smoke_Grenade
                ),
            ],
        },

        // --------------------------------------------------
        // Rifleman Operator
        // --------------------------------------------------
        {
            id: LoadoutIdMap.Rifleman_Operator,
            items: [
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.PrimaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.DMR_M39_EMR,
                    mod.Weapons.DMR_M39_EMR,
                    [
                        mod.WeaponAttachments.Scope_PVQ_31_400x,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_18_EBR,
                        mod.WeaponAttachments.Magazine_20rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.SecondaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.Carbine_M4A1,
                    mod.Weapons.Carbine_M4A1,
                    [
                        mod.WeaponAttachments.Scope_SU_231_150x,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_115_Commando,
                        mod.WeaponAttachments.Magazine_30rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_GadgetLoadoutItem(
                    mod.InventorySlots.Throwable,
                    mod.stringkeys.gamemodes.PRSR.loadout.gadgets.Throwable_Stun_Grenade,
                    mod.Gadgets.Throwable_Stun_Grenade
                ),
            ],
        },

        // --------------------------------------------------
        // Rifleman Elite
        // --------------------------------------------------
        {
            id: LoadoutIdMap.Rifleman_Elite,
            items: [
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.PrimaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.DMR_SVDM,
                    mod.Weapons.DMR_SVDM,
                    [
                        mod.WeaponAttachments.Scope_PVQ_31_400x,
                        mod.WeaponAttachments.Top_5_mW_Red,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_550mm_Factory,
                        mod.WeaponAttachments.Bottom_Slim_Angled,
                        mod.WeaponAttachments.Magazine_10rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.SecondaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.Carbine_GRT_BC,
                    mod.Weapons.Carbine_GRT_BC,
                    [
                        mod.WeaponAttachments.Scope_SU_231_150x,
                        mod.WeaponAttachments.Right_Flashlight,
                        mod.WeaponAttachments.Muzzle_Flash_Hider,
                        mod.WeaponAttachments.Barrel_145_Alt,
                        mod.WeaponAttachments.Magazine_40rnd_Fast_Mag,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_GadgetLoadoutItem(
                    mod.InventorySlots.Throwable,
                    mod.stringkeys.gamemodes.PRSR.loadout.gadgets.Throwable_Stun_Grenade,
                    mod.Gadgets.Throwable_Stun_Grenade
                ),
            ],
        },

        // --------------------------------------------------
        // Sniper Operator
        // --------------------------------------------------
        {
            id: LoadoutIdMap.Sniper_Operator,
            items: [
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.PrimaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.Sniper_M2010_ESR,
                    mod.Weapons.Sniper_M2010_ESR,
                    [
                        mod.WeaponAttachments.Scope_S_VPS_600x,
                        mod.WeaponAttachments.Muzzle_Single_port_Brake,
                        mod.WeaponAttachments.Barrel_24_Fluted,
                        mod.WeaponAttachments.Magazine_5rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.SecondaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.Sidearm_M45A1,
                    mod.Weapons.Sidearm_M45A1,
                    [
                        mod.WeaponAttachments.Scope_Iron_Sights,
                        mod.WeaponAttachments.Barrel_5_Factory,
                        mod.WeaponAttachments.Magazine_7rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_GadgetLoadoutItem(
                    mod.InventorySlots.GadgetOne,
                    mod.stringkeys.gamemodes.PRSR.loadout.gadgets.Misc_Sniper_Decoy,
                    mod.Gadgets.Misc_Sniper_Decoy
                ),
            ],
        },

        // --------------------------------------------------
        // Sniper Elite
        // --------------------------------------------------
        {
            id: LoadoutIdMap.Sniper_Elite,
            items: [
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.PrimaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.Sniper_PSR,
                    mod.Weapons.Sniper_PSR,
                    [
                        mod.WeaponAttachments.Scope_NFX_800x,
                        mod.WeaponAttachments.Top_5_mW_Red,
                        mod.WeaponAttachments.Muzzle_Double_port_Brake,
                        mod.WeaponAttachments.Barrel_27_MK22,
                        mod.WeaponAttachments.Bottom_Bipod,
                        mod.WeaponAttachments.Magazine_10rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_WeaponLoadoutItem(
                    mod.InventorySlots.SecondaryWeapon,
                    mod.stringkeys.gamemodes.PRSR.loadout.weapons.Sidearm_P18,
                    mod.Weapons.Sidearm_P18,
                    [
                        mod.WeaponAttachments.Scope_Mini_Flex_100x,
                        mod.WeaponAttachments.Barrel_39_Factory,
                        mod.WeaponAttachments.Top_5_mW_Red,
                        mod.WeaponAttachments.Magazine_17rnd_Magazine,
                        mod.WeaponAttachments.Ammo_FMJ,
                    ]
                ),
                new CorePlayer_GadgetLoadoutItem(
                    mod.InventorySlots.GadgetOne,
                    mod.stringkeys.gamemodes.PRSR.loadout.gadgets.Misc_Sniper_Decoy,
                    mod.Gadgets.Misc_Sniper_Decoy
                ),
            ],
        },
    ]

    static getAll(): readonly CorePlayer_IPlayerLoadout[] {
        return this.loadouts
    }

    static getById(id: LoadoutIdMap): CorePlayer_IPlayerLoadout | null {
        for (const loadout of this.loadouts) {
            if (loadout.id === id) {
                return loadout
            }
        }
        return null
    }
}
