import { CoreAI_SensorOptions } from './AProfile'

import { CoreAI_BaseProfile } from './BaseProfile'

export type CoreAI_CombatantProfileOptions = CoreAI_SensorOptions

export class CoreAI_CombatantProfile extends CoreAI_BaseProfile {
    constructor(options: CoreAI_CombatantProfileOptions = {}) {
        super(options)

        /* this.scoring = [
            // your custom scoring entries here
        ] */
    }
}
