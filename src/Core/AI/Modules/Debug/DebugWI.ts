import { CoreUI_Colors } from 'src/Core/UI/UIColors'
import { CoreAI_Brain } from '../../Brain'
import { CoreAI_MemoryFields } from '../Memory/MemoryManager'

// @stringkeys core.ai.debug.brain.memory: closestEnemy {}, vehicleToDrive {}, isInBattle {}, roamPos {}, arrivedPos {}

// @stringkeys core.ai.debug.brain.behaviors: battlefield, defend, moveto, none

export interface CoreAI_IDebugWI {
    index: number
    worldIcon: mod.WorldIcon
}

export class CoreAI_DebugWI {
    /* private behavior: CoreAI_IDebugWI
    private stats: CoreAI_IDebugWI
    private battle: CoreAI_IDebugWI
    private calm: CoreAI_IDebugWI */

    private receiver: mod.Player
    private brain: CoreAI_Brain

    private behaviorWI: mod.WorldIcon
    private behaviorColorsMap: Map<string, mod.Vector> = new Map([
        ['battlefield', mod.CreateVector(1, 0, 0)],
        ['defend', mod.CreateVector(1, 1, 0)],
        ['moveto', mod.CreateVector(0, 1, 1)],
        ['none', mod.CreateVector(1, 1, 1)],
    ])

    private roamPosWI: mod.WorldIcon
    private vehicleToDriveWI: mod.WorldIcon

    private memoryWIs: Map<keyof CoreAI_MemoryFields, mod.WorldIcon> = new Map()

    constructor(receiver: mod.Player, brain: CoreAI_Brain) {
        this.receiver = receiver
        this.brain = brain

        this.behaviorWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.behaviorWI, receiver)

        let i = 1
        for (const key of Object.keys(this.brain.memory.data) as Array<
            keyof typeof this.brain.memory.data
        >) {
            const wi = mod.SpawnObject(
                mod.RuntimeSpawn_Common.WorldIcon,
                mod.CreateVector(0, 0, 0),
                mod.CreateVector(0, 0, 0)
            )
            mod.SetWorldIconOwner(wi, receiver)

            this.memoryWIs.set(key, wi)
            i++
        }

        this.roamPosWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.roamPosWI, receiver)
        mod.SetWorldIconImage(this.roamPosWI, mod.WorldIconImages.Flag)
        mod.EnableWorldIconImage(this.roamPosWI, true)
        mod.SetWorldIconColor(this.roamPosWI, mod.CreateVector(0, 1, 1))

        this.vehicleToDriveWI = mod.SpawnObject(
            mod.RuntimeSpawn_Common.WorldIcon,
            mod.CreateVector(0, 0, 0),
            mod.CreateVector(0, 0, 0)
        )
        mod.SetWorldIconOwner(this.vehicleToDriveWI, receiver)
        mod.SetWorldIconImage(this.vehicleToDriveWI, mod.WorldIconImages.Assist)
        mod.EnableWorldIconImage(this.vehicleToDriveWI, true)
        mod.SetWorldIconColor(this.vehicleToDriveWI, mod.CreateVector(1, 1, 0))
    }

    tick() {
        const isValid =
            mod.IsPlayerValid(this.brain.player) &&
            mod.GetSoldierState(this.brain.player, mod.SoldierStateBool.IsAlive)

        /**
         * Behavior
         */
        if (isValid) {
            mod.EnableWorldIconText(this.behaviorWI, true)
            mod.SetWorldIconPosition(
                this.behaviorWI,
                mod.CreateVector(
                    mod.XComponentOf(mod.GetObjectPosition(this.brain.player)),
                    mod.YComponentOf(mod.GetObjectPosition(this.brain.player)) +
                        this.getStackedIconOffset(
                            mod.DistanceBetween(
                                mod.GetObjectPosition(this.brain.player),
                                mod.GetObjectPosition(this.receiver)
                            ),
                            0,
                            0.6
                        ),
                    mod.ZComponentOf(mod.GetObjectPosition(this.brain.player))
                )
            )
            const behavior = this.brain.getBehaviorLabel() ?? 'none'
            mod.SetWorldIconText(
                this.behaviorWI,
                mod.Message(`core.ai.debug.brain.behaviors.${behavior}`)
            )
            mod.SetWorldIconColor(
                this.behaviorWI,
                this.behaviorColorsMap.get(behavior) ??
                    mod.CreateVector(1, 1, 1)
            )
        } else {
            mod.EnableWorldIconText(this.behaviorWI, false)
        }

        /**
         * Memory
         */
        let i = 1
        for (const [key, wi] of this.memoryWIs) {
            if (!isValid) {
                mod.EnableWorldIconText(wi, false)
                continue
            }

            mod.SetWorldIconColor(
                wi,
                this.brain.memory.getTimeRemaining(key) === 0
                    ? mod.CreateVector(1, 1, 1)
                    : mod.CreateVector(1, 1, 0)
            )
            mod.EnableWorldIconText(wi, true)
            mod.SetWorldIconPosition(
                wi,
                mod.CreateVector(
                    mod.XComponentOf(mod.GetObjectPosition(this.brain.player)),
                    mod.YComponentOf(mod.GetObjectPosition(this.brain.player)) +
                        this.getStackedIconOffset(
                            mod.DistanceBetween(
                                mod.GetObjectPosition(this.brain.player),
                                mod.GetObjectPosition(this.receiver)
                            ),
                            i,
                            0.6
                        ),
                    mod.ZComponentOf(mod.GetObjectPosition(this.brain.player))
                )
            )
            mod.SetWorldIconText(
                wi,
                mod.Message(
                    `core.ai.debug.brain.memory.${key}`,
                    this.brain.memory.getTimeRemaining(key)
                )
            )

            i++
        }

        /**
         * Roam navigation
         */
        if (this.brain.memory.get('roamPos')) {
            mod.SetWorldIconPosition(
                this.roamPosWI,
                this.brain.memory.get('roamPos')!
            )
            mod.EnableWorldIconImage(this.roamPosWI, true)
            mod.SetWorldIconText(
                this.roamPosWI,
                mod.Message(this.brain.memory.getTimeRemaining('roamPos'))
            )
            mod.EnableWorldIconText(this.roamPosWI, true)
        } else {
            mod.EnableWorldIconImage(this.roamPosWI, false)
            mod.EnableWorldIconText(this.roamPosWI, false)
        }

        /**
         * Vehicle to Drive navigation
         */
        if (this.brain.memory.get('vehicleToDrive')) {
            mod.SetWorldIconPosition(
                this.vehicleToDriveWI,
                mod.GetVehicleState(
                    this.brain.memory.get('vehicleToDrive')!,
                    mod.VehicleStateVector.VehiclePosition
                )
            )
            mod.EnableWorldIconImage(this.vehicleToDriveWI, true)
            mod.SetWorldIconText(
                this.vehicleToDriveWI,
                mod.Message(
                    this.brain.memory.getTimeRemaining('vehicleToDrive')
                )
            )
            mod.EnableWorldIconText(this.vehicleToDriveWI, true)
        } else {
            mod.EnableWorldIconImage(this.vehicleToDriveWI, false)
            mod.EnableWorldIconText(this.vehicleToDriveWI, false)
        }
    }

    private round2decimal(num: number): number {
        const factor = 10 /* * 10 // 100 */
        return Math.round(num * factor) / factor
    }

    private getIconOffset(d: number): number {
        const base = 1.9
        const upStart = 2
        const upEnd = 40
        const downEnd = 70
        const peakDelta = 0.9 // 2.8 - 1.9

        if (d <= upStart) return base
        if (d >= downEnd) return base

        // rising part: 2..40
        if (d < upEnd) {
            const t = (d - upStart) / (upEnd - upStart) // 0..1
            const bump = Math.pow(t, 0.5) // sqrt: fast early rise
            return base + peakDelta * bump
        }

        // falling part: 40..70
        const t = (d - upEnd) / (downEnd - upEnd) // 0..1
        const bump = Math.pow(1 - t, 0.8) // slower fall
        return base + peakDelta * bump
    }

    /**
     * Returns the vertical world offset for stacked icons.
     *
     * index = 0 -> base icon
     * index = 1 -> first icon above it
     * index = 2 -> second icon above it
     *
     * The gap is scaled by distance so icons appear visually snapped.
     */
    private getStackedIconOffset(d: number, index: number, gap = 0.4): number {
        // Base icon offset using your existing curve
        const baseOffset = this.getIconOffset(d)

        // Reference distance at which gap looks correct visually.
        // 20m is a good default for human-readable marker stacking.
        const reference = 20

        // Scale gap according to distance to compensate for perspective shrinking
        const scale = d / reference

        // Index=0 gives base offset
        if (index === 0) return baseOffset

        // Each stacked icon sits on top of the previous one
        return baseOffset + index * gap * scale
    }
}
