export const CombatConfig = {
    // Player input timing windows (milliseconds)
    inputEarlyWindow:  150,   // how early before the expected beat a press is accepted
    inputLateWindow:   100,   // how late after the expected beat a press is accepted

    // Input phase rhythm strip
    // 1 = normal speed; 4 = nodes arrive 4x faster from the same starting position (800ms gap becomes 200ms)
    inputPhaseSpeed:   2,

    maxCompanions: 1,
} as const;
