import { Core_AGameMode } from '../AGameMode'
import { CorePlayer_IPlayerEvents } from './IPlayerEvents'
import { CorePlayer_LogicalAIComponent } from './Components/AI/LogicalAIComponent'

/**
 * CorePlayer_APlayer
 *
 * Logical player abstraction.
 * Represents a persistent identity across soldier respawns.
 *
 * - Used for both human players and AI bots
 * - Does NOT know about AI or brains
 * - Extended via components
 */
export abstract class CorePlayer_APlayer {
    public player: mod.Player
    public readonly id: number

    public teamId: number = 0

    protected listeners: CorePlayer_IPlayerEvents[] = []
    protected components: CorePlayer_IComponent[] = []

    private static nextId: number = 1

    constructor(player: mod.Player) {
        this.player = player
        this.id = CorePlayer_APlayer.nextId++

        this.teamId = mod.GetObjId(mod.GetTeam(player))
    }

    isAI(): boolean {
        return mod.GetSoldierState(
            this.player,
            mod.SoldierStateBool.IsAISoldier
        )
    }

    isLogicalAI(): boolean {
        return !!this.logicalAIComp
    }

    /* ------------------------------------------------------------
     * Common component shortcuts
     * ------------------------------------------------------------ */

    public get logicalAIComp():
        | CorePlayer_LogicalAIComponent
        | undefined {
        return this.getComponent(CorePlayer_LogicalAIComponent)
    }

    /* ------------------------------------------------------------
     * Event system
     * ------------------------------------------------------------ */

    public addListener(listener: CorePlayer_IPlayerEvents): void {
        this.listeners.push(listener)
    }

    public removeListener(listener: CorePlayer_IPlayerEvents): void {
        this.listeners = this.listeners.filter((l) => l !== listener)
    }

    public clearListeners(): void {
        this.listeners = []
    }

    public emit<E extends keyof CorePlayer_IPlayerEvents>(
        event: E,
        ...args: Parameters<NonNullable<CorePlayer_IPlayerEvents[E]>>
    ): void {
        for (const listener of this.listeners) {
            const fn = listener[event]
            if (typeof fn === 'function') {
                ;(fn as (...a: any[]) => void).call(listener, ...args)
            }
        }
    }

    /* ------------------------------------------------------------
     * Component system
     * ------------------------------------------------------------ */

    public addComponent(component: CorePlayer_IComponent): void {
        this.components.push(component)
        component.onAttach(this)
    }

    public removeComponent<T extends CorePlayer_IComponent>(
        ctor: new (...args: any[]) => T
    ): void {
        this.components = this.components.filter((c) => {
            if (c instanceof ctor) {
                c.onDetach(this)
                return false
            }
            return true
        })
    }

    public getComponent<T extends CorePlayer_IComponent>(
        ctor: new (...args: any[]) => T
    ): T | undefined {
        return this.components.find((c) => c instanceof ctor) as T | undefined
    }

    public getComponents(): readonly CorePlayer_IComponent[] {
        return this.components
    }

    /* ------------------------------------------------------------
     * Soldier rebinding
     * ------------------------------------------------------------ */

    public rebindTo(newPlayer: mod.Player): void {
        this.player = newPlayer
        this.teamId = mod.GetObjId(mod.GetTeam(newPlayer))

        for (const component of this.components) {
            const anyComp = component as any
            if (typeof anyComp.onRebind === 'function') {
                anyComp.onRebind(newPlayer)
            }
        }
    }
}

/* ------------------------------------------------------------
 * Component interface
 * ------------------------------------------------------------ */

export interface CorePlayer_IComponent {
    onAttach(ap: CorePlayer_APlayer): void
    onDetach(ap: CorePlayer_APlayer): void
}
