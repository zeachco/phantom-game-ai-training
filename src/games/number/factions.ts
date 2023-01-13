import { lerp } from "../../utilities/math"

export const MAX_FACTIONS = 3
export const FACTIONS: number[] = Array(MAX_FACTIONS).fill(0).map((_, index) => lerp(0, 360, (index + 1) / MAX_FACTIONS))

export function factionOffset(index, offset) {
    const next = index + offset
    if (next > MAX_FACTIONS - 1) return 0
    if (next < 0) return MAX_FACTIONS - 1
    return next
}
