/*
 * Shared UI color palette.
 * Colors are normalized RGB mod.Vector values.
 * Do not mutate at runtime.
 */
export const CoreUI_Colors = {
    White: mod.CreateVector(1, 1, 1),
    Black: mod.CreateVector(0.031, 0.043, 0.043),

    GreyLight: mod.CreateVector(0.835, 0.922, 0.976), // d5ebf9
    Grey: mod.CreateVector(0.329, 0.369, 0.388), // 545e63
    GreyDark: mod.CreateVector(0.212, 0.224, 0.235), // 36393c

    BlueLight: mod.CreateVector(0.439, 0.922, 1), // 70ebff
    BlueDark: mod.CreateVector(0.075, 0.184, 0.247), // 132f3f

    RedLight: mod.CreateVector(1, 0.514, 0.38), // ff8361
    RedDark: mod.CreateVector(0.251, 0.094, 0.067), // 401811

    GreenLight: mod.CreateVector(0.678, 0.992, 0.525), // adfd86
    GreenDark: mod.CreateVector(0.278, 0.447, 0.212), // 477236

    YellowLight: mod.CreateVector(1, 0.988, 0.612), // fffc9c
    YellowDark: mod.CreateVector(0.443, 0.376, 0), // 716000
}
