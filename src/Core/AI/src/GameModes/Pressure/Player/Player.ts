import { CorePlayer_APlayer } from 'src/Core/Player/APlayer'
import { CorePlayer_ProtectionComponent } from 'src/Core/Player/Components/Protection/ProtectionComponent'
import { CorePlayer_BattleStatsComponent } from 'src/Core/Player/Components/BattleStats/BattleStatsComponent'
import { CorePlayer_LoadoutComponent } from 'src/Core/Player/Components/Loadout/LoadoutComponent'
import { LoadoutIdMap, LoadoutsRegistry } from './LoadoutsRegistry'

export class Player extends CorePlayer_APlayer {
    loadoutComp: CorePlayer_LoadoutComponent
    protectionComp: CorePlayer_ProtectionComponent
    battleStatsComp: CorePlayer_BattleStatsComponent

    constructor(player: mod.Player) {
        super(player)

        this.loadoutComp = new CorePlayer_LoadoutComponent()
        this.addComponent(this.loadoutComp)

        this.protectionComp = new CorePlayer_ProtectionComponent()
        this.addComponent(this.protectionComp)

        this.battleStatsComp = new CorePlayer_BattleStatsComponent()
        this.addComponent(this.battleStatsComp)

        // React explicitly to loadout selection
        /* this.loadoutComp.onLoadoutSelected(() => {
            if (this.deployReturnPos) {
                mod.Teleport(this.player, this.deployReturnPos, 0)
                this.deployReturnPos = null
            }

            this.loadoutComp.hideDeployUI()
            this.protectionComp.activate(5)
        }) */

        this.addListener({
            OnPlayerDeployed: async () => {
                /* await mod.Wait(3)
                mod.PlaySound(
                    mod.SpawnObject(mod.RuntimeSpawn_Common.closed)
                ) */

                // loadout
                const ids = [
                    LoadoutIdMap.Assault_Operator,
                    LoadoutIdMap.Support_Operator,
                    LoadoutIdMap.Rifleman_Operator,
                    LoadoutIdMap.Sniper_Operator,
                ]
                const randomId = ids[Math.floor(Math.random() * ids.length)]

                const loadout = LoadoutsRegistry.getById(randomId)

                if (loadout) {
                    this.loadoutComp.applyLoadout(loadout)
                }

                // spawn protection
                this.protectionComp.activate(5)

                // stats
                this.battleStatsComp.clearKillStreak()

                // BUG: no effect at all
                // mod.SkipManDown(this.player, true)

                // mod.SetPlayerMovementSpeedMultiplier(this.player, 2)

                /*  await mod.Wait(3)
                mod.DisplayHighlightedWorldLogMessage(mod.Message(132))
                mod.PlayVO(
                    mod.SpawnObject(
                        mod.RuntimeSpawn_Common.SFX_VOModule_OneShot2D,
                        mod.CreateVector(0, 0, 0),
                        mod.CreateVector(0, 0, 0)
                    ),
                    // mod.VoiceOverEvents2D.ObjectiveCaptured, // we own objective Golf
                    // mod.VoiceOverEvents2D.ObjectiveCapturedEnemy, // hostiles now control objective Golf
                    // mod.VoiceOverEvents2D.ObjectiveCapturedEnemyGeneric, // BUG: silence
                    // mod.VoiceOverEvents2D.ObjectiveCapturedGeneric, // BUG: silence
                    // mod.VoiceOverEvents2D.ObjectiveCapturing, // BUG: securing ALPHA (always)
                    // mod.VoiceOverEvents2D.ObjectiveContested, // hostiles are attacking Golf
                    // mod.VoiceOverEvents2D.ObjectiveLocated, // new objective located
                    // mod.VoiceOverEvents2D.ObjectiveLockdownEnemy, // Golf has been locked down by the enemy
                    // mod.VoiceOverEvents2D.ObjectiveLockdownFriendly, // our forces have locked down Golf
                    // mod.VoiceOverEvents2D.ObjectiveLost, // we've lost control of the objective Golf
                    // mod.VoiceOverEvents2D.ObjectiveNeutralised, // our forces neutralized Golf
                    mod.VoiceOverEvents2D.SectorTakenAttacker, // attack successful. we've taken enemy sector
                    mod.VoiceOverFlags.Golf
                ) */
            },

            OnPlayerDied: async () => {
                this.battleStatsComp.addDeath()

                await mod.Wait(0.1)
                mod.Kill(this.player)
            },

            OnPlayerEarnedKill: async (
                eventOtherPlayer,
                eventDeathType,
                eventWeaponUnlock
            ) => {
                if (!eventOtherPlayer) {
                    return
                }

                if (
                    mod.Equals(
                        mod.GetTeam(this.player),
                        mod.GetTeam(eventOtherPlayer.player)
                    )
                ) {
                    if (!mod.Equals(this.player, eventOtherPlayer.player)) {
                        this.battleStatsComp.addTeamKill()
                    }
                } else {
                    this.battleStatsComp.addKill()
                    this.battleStatsComp.addKillStreak()
                    this.battleStatsComp.addScore(
                        100 + (this.battleStatsComp.getKillStreak() - 1) * 10
                    )
                }
            },

            OnPlayerUndeploy: () => {
                /* mod.SetTeam(
                    this.player,
                    this.teamId === 1 ? mod.GetTeam(2) : mod.GetTeam(1)
                ) */
            },

            OnPlayerInteract: (eventInteractPoint) => {
                const ids = [
                    LoadoutIdMap.Assault_Elite,
                    LoadoutIdMap.Support_Elite,
                    LoadoutIdMap.Rifleman_Elite,
                    LoadoutIdMap.Sniper_Elite,
                ]
                const randomId = ids[Math.floor(Math.random() * ids.length)]

                const loadout = LoadoutsRegistry.getById(randomId)

                if (loadout) {
                    this.loadoutComp.applyLoadout(loadout)

                    mod.ForceSwitchInventory(
                        this.player,
                        mod.InventorySlots.PrimaryWeapon
                    )
                }
            },

            OnPlayerDamaged: () => {
                /* mod.PlaySound(
                    mod.SpawnObject(
                        mod.RuntimeSpawn_Common
                            .SFX_Soldier_Damage_ArmorDamage_Enemy_OneShot2D,
                        mod.GetObjectPosition(this.player),
                        mod.CreateVector(0, 0, 0)
                    ),
                    10,
                    mod.GetObjectPosition(this.player),
                    100
                ) */
            },

            OngoingPlayer: async () => {
                if (!mod.IsPlayerValid(this.player)) {
                    return
                }

                mod.SetScoreboardPlayerValues(
                    this.player,
                    this.battleStatsComp.getScore(),
                    this.battleStatsComp.getKills(),
                    this.battleStatsComp.getDeaths(),
                    this.battleStatsComp.getTeamKills(),
                    this.battleStatsComp.getKillStreak()
                )

                if (
                    mod.GetSoldierState(
                        this.player,
                        mod.SoldierStateBool.IsAlive
                    ) &&
                    mod.GetSoldierState(
                        this.player,
                        mod.SoldierStateBool.IsFiring
                    )
                ) {
                    if (
                        mod.IsInventorySlotActive(
                            this.player,
                            mod.InventorySlots.ClassGadget
                        ) &&
                        mod.HasEquipment(
                            this.player,
                            mod.Gadgets.Class_Adrenaline_Injector
                        )
                    ) {
                        await mod.Wait(1)
                        mod.Heal(this.player, 100)
                    }
                }
            },
        })
    }
}
