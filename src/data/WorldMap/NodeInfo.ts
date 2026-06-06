export abstract class NodeInfo {
    abstract readonly type:        string;
    abstract readonly title:       string;
    abstract readonly description: string;
}

export enum EncounterDifficulty {
    Easy   = 'Easy',
    Normal = 'Normal',
    Hard   = 'Hard',
    Elite  = 'Elite',
    Boss   = 'Boss',
}

export abstract class EncounterNodeInfo extends NodeInfo {
    readonly type = 'encounter' as const;
    abstract readonly difficulty: EncounterDifficulty;
}

export enum ResourceType {
    Gold      = 'Gold',
    Healing   = 'Healing',
    Equipment = 'Equipment',
    ComboMod  = 'ComboMod',
}

export abstract class ResourceNodeInfo extends NodeInfo {
    readonly type         = 'resource' as const;
    abstract readonly resourceType: ResourceType;
}
