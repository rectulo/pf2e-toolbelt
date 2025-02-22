import { getSetting } from '../../module'

export function createHook(event, listener, callback = () => {}) {
    let HOOK = null

    return function (value, otherSettings = []) {
        if (typeof otherSettings === 'string') otherSettings = [otherSettings]

        value ||= otherSettings.some(s => getSetting(s))

        if (value && !HOOK) {
            HOOK = Hooks.on(event, listener)
        } else if (!value && HOOK) {
            Hooks.off(event, HOOK)
            HOOK = null
        }

        callback(value)
    }
}

export function createChoicesHook(event, listener, callback = () => {}) {
    let HOOK = null

    return function (value) {
        if (value === 'disabled' && HOOK) {
            Hooks.off(event, HOOK)
            HOOK = null
        } else if (value !== 'disabled' && !HOOK) {
            HOOK = Hooks.on(event, listener)
        }

        callback(value)
    }
}
