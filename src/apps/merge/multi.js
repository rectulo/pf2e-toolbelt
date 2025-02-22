import { subLocalize, templatePath } from '../../module'

const localize = subLocalize('merge.multi')

export class MultiCast extends Application {
    constructor(spell, options) {
        super(options)
        this._spell = spell
    }

    get spell() {
        return this._spell
    }

    get title() {
        return localize('title', this.spell)
    }

    get template() {
        return templatePath('merge/multi')
    }

    getData(options) {
        return mergeObject(super.getData(options), {
            i18n: localize,
        })
    }

    activateListeners(html) {
        html.find('[data-action=cast]').on('click', this.#onCast.bind(this))
        html.find('[data-action=cancel]').on('click', this.#onCancel.bind(this))
    }

    async #onCast(event) {
        event.preventDefault()

        const nb = this.element.find('[name=multi]').val()
        if (nb < 1) {
            localize.error('zero')
            this.close()
            return
        }

        const spell = this.spell
        const damages = deepClone(spell._source.system.damage.value)
        const heightening = deepClone(spell._source.system.heightening) ?? {}

        for (const [id, damage] of Object.entries(damages)) {
            for (let i = 0; i < nb - 1; i++) {
                const newId = randomID()

                damages[newId] = damage

                if (heightening.type === 'interval') {
                    const damage = heightening.damage[id]
                    if (damage) heightening.damage[newId] = damage
                } else if (heightening.type === 'fixed') {
                    for (const [level, data] of Object.entries(heightening.levels)) {
                        const damage = data.damage.value[id]
                        if (damage) heightening.levels[level].damage.value[newId] = damage
                    }
                }
            }
        }

        const newSpell = spell.clone({ 'system.damage.value': damages, 'system.heightening': heightening })
        newSpell.rollDamage(event)

        this.close()
    }

    #onCancel(event) {
        event.preventDefault()
        this.close()
    }
}
