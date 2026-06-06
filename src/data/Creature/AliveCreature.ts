import { CreatureTemplate } from './CreatureTemplate.ts';
import { SupportPassive   } from './SupportPassive.ts';

export class AliveCreature {
    readonly template:        CreatureTemplate;
    readonly personalizedName: string;
    readonly activePassives:  SupportPassive[];

    constructor(template: CreatureTemplate, personalizedName: string) {
        this.template         = template;
        this.personalizedName = personalizedName;
        // By default all template passives are active for this instance.
        this.activePassives   = [...template.supportPassives];
    }
}
