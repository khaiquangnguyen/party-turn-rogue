import { Need } from './Need.ts';
import { Food } from './Food.ts';

export class FoodNeed extends Need {
    readonly title:       string;
    readonly description: string;
    readonly acceptedFoods: readonly Food[];

    constructor(acceptedFoods: Food[]) {
        super();
        this.acceptedFoods = acceptedFoods;
        const names        = acceptedFoods.map(f => f.name).join(', ');
        this.title         = 'Food';
        this.description   = `Requires regular feeding. Accepts: ${names}.`;
    }
}
