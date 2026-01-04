import { CoreAI_SensorContext } from './SensorContext'

/**
 * ASensor:
 * Base class for all perception sensors.
 *
 * Responsibilities:
 * - Throttles sensor execution using updateRate (ms) based on ctx.time.
 * - tick(ctx) is called by Perception each tick.
 * - update(ctx) is implemented by concrete sensors.
 *
 * Notes:
 * - Sensors must always check player validity.
 * - Sensors do NOT store Brain internally.
 * - Sensors MUST use ctx.time, not Date.now().
 */
export abstract class CoreAI_ASensor {
    private lastUpdate = 0

    constructor(
        private readonly updateRate: number // milliseconds
    ) {}

    /**
     * Called by Perception each tick.
     * Applies throttling logic and calls update().
     */
    tick(ctx: CoreAI_SensorContext): void {
        const now = ctx.time // unified tick time

        if (now - this.lastUpdate < this.updateRate) {
            return
        }

        if (!mod.IsPlayerValid(ctx.player)) {
            return
        }

        this.lastUpdate = now
        this.update(ctx)
    }

    /**
     * To be implemented by concrete sensors.
     */
    protected abstract update(ctx: CoreAI_SensorContext): void

    /**
     * Optional event hooks for sensors that react to game events.
     * (FightSensor overrides onDamaged)
     */
    onDamaged?(
        ctx: CoreAI_SensorContext,
        eventOtherPlayer: mod.Player,
        eventDamageType: mod.DamageType,
        eventWeaponUnlock: mod.WeaponUnlock
    ): void {}

    onRayCastHit?(
        ctx: CoreAI_SensorContext,
        eventPoint: mod.Vector,
        eventNormal: mod.Vector
    ): void {}

    reset(): void {
        this.lastUpdate = 0
    }
}
