export abstract class Food {
    abstract readonly name:        string;
    abstract readonly description: string;
}

export class EdibleLightning extends Food {
    readonly name        = 'Edible Lightning';
    readonly description = 'A crackling bolt of condensed electrical energy, safely edible for storm creatures.';
}

export class EdibleCloud extends Food {
    readonly name        = 'Edible Cloud';
    readonly description = 'A soft, billowing mass of flavored cloud matter favoured by sky creatures.';
}
