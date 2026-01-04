// Opaque identifier type for player loadouts.
// Prevents accidental mixing with other string IDs.

export type CorePlayer_LoadoutId = string & {
    readonly __corePlayerLoadoutId: unique symbol
}
