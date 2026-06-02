export const CombatFeatureFlags = {
    /** Show a direction prompt in the UI while waiting for the player's first attack input. */
    ShowPlayerInputPrompt:     true,

    /** The player's first input each turn must match the last direction the enemy attacked with.
     *  Resets to free-input if the enemy dies. Has no effect if no enemy has acted yet. */
    ForceFollowLastEnemyInput: true,
};
