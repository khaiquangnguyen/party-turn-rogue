export const CombatFeatureFlags = {
    /** Show a direction prompt in the UI while waiting for the player's first attack input. */
    ShowPlayerInputPrompt:     true,

    /** The player's first input each turn must match the last direction the enemy attacked with.
     *  Resets to free-input if the enemy dies. Has no effect if no enemy has acted yet. */
    ForceFollowLastEnemyInput: true,

    /** Hide the direction arrow inside the enemy attack circle; the shrinking circle still shows. */
    HideEnemyAttackDirection:  true,

    /** Hide the shrinking timing circle for enemy attacks entirely; the sword still shows. */
    HideEnemyAttackCircle:     true,
};
