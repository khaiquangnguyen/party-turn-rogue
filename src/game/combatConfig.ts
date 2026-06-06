export const CombatConfig = {
    // Player input timing windows (milliseconds)
    inputEarlyWindow:  150,   // how early before the expected beat a press is accepted
    inputLateWindow:   100,   // how late after the expected beat a press is accepted

    // Input phase rhythm strip
    // 1 = nodes travel at exactly the declared timing distance; 2 = twice as fast (nodes start further right)
    inputPhaseSpeed:   2,

    maxCompanions: 1,
} as const;
