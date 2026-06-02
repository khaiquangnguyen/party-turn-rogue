export const CombatConfig = {
    // Player input timing windows (milliseconds)
    inputEarlyWindow: 150,  // how early before the expected beat a press is accepted
    inputLateWindow:  100,  // how late after the expected beat a press is accepted
} as const;
