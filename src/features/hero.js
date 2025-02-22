import { Trade } from '../apps/hero/trade'
import {
    chatUUID,
    documentUuidFromTableResult,
    error,
    getSetting,
    isActiveGM,
    localize,
    refreshCharacterSheets,
    setSetting,
    socketEmit,
    socketOff,
    socketOn,
    subLocalize,
    templatePath,
    warn,
} from '../module'
import { createHook } from './shared/hook'

const MODULE_ID = 'pf2e-hero-actions'

const SOCKET = null
const setHook = createHook('renderCharacterSheetPF2e', renderCharacterSheetPF2e, setupSocket)

const JOURNAL_UUID = 'Compendium.pf2e.journals.JournalEntry.BSp4LUSaOmUyjBko'
const TABLE_UUID = 'Compendium.pf2e.rollable-tables.RollTable.zgZoI7h0XjjJrrNK'

const TABLE_ICON = 'systems/pf2e/icons/features/feats/heroic-recovery.webp'

export function registerHeroActions() {
    return {
        name: 'heroActions',
        settings: [
            {
                name: 'hero',
                type: Boolean,
                default: false,
                onChange: value => setHook(value),
            },
            {
                name: 'hero-table',
                type: String,
                default: '',
            },
            {
                name: 'hero-trade',
                type: Boolean,
                default: false,
                onChange: () => refreshCharacterSheets(),
            },
            {
                name: 'hero-private',
                type: Boolean,
                default: false,
            },
        ],
        conflicts: [MODULE_ID],
        api: {
            createTable,
            removeHeroActions,
            getHeroActions,
            useHeroAction,
            getHeroActionDetails,
            drawHeroAction,
            drawHeroActions,
            sendActionToChat,
            discardHeroActions,
            tradeHeroAction,
        },
        ready: isGM => {
            setHook(false, 'hero')
        },
    }
}

function setupSocket(value) {
    if (value && !SOCKET) socketOn(onSocket)
    else if (!value && SOCKET) socketOff(onSocket)
}

function onSocket(packet) {
    switch (packet.type) {
        case 'trade-reject':
            if (packet.sender.id !== game.user.id) return
            onTradeRejected(packet)
            break
        case 'trade-accept':
            if (!isActiveGM()) return
            onTradeAccepted(packet)
            break
        case 'trade-request':
            if (packet.receiver.id !== game.user.id) return
            onTradeRequest(packet)
            break
        case 'trade-error':
            if (!packet.users.includes(game.user.id)) return
            onTradeError(packet.error)
            break
    }
}

async function renderCharacterSheetPF2e(sheet, html) {
    const actor = sheet.actor
    if (!actor || actor.pack || !actor.id || !game.actors.has(actor.id)) return

    await addActionsToSheet(html, actor)
    addSheetEvents(html, actor)
}

async function addActionsToSheet(html, actor) {
    const actions = getHeroActions(actor)
    const diff = actor.heroPoints.value - actions.length
    const isOwner = actor.isOwner
    const localize = subLocalize('hero.templates.heroActions')

    const template = await renderTemplate(templatePath('hero/sheet'), {
        owner: isOwner,
        list: actions,
        canUse: diff >= 0 && isOwner,
        canDraw: diff > 0 && isOwner,
        canTrade: getSetting('hero-trade'),
        mustDiscard: diff < 0,
        diff: Math.abs(diff),
        i18n: (key, { hash }) => localize(key, hash),
    })

    html.find(
        '.sheet-body .sheet-content [data-tab=actions] .tab-content .actions-panels [data-tab=encounter] > .strikes-list:not(.skill-action-list)'
    )
        .first()
        .after(template)
}

function addSheetEvents(html, actor) {
    const list = html.find('.tab.actions .heroActions-list')
    list.find('[data-action=draw]').on('click', event => onClickHeroActionsDraw(actor, event))
    list.find('[data-action=expand]').on('click', onClickHeroActionExpand)
    list.find('[data-action=use]').on('click', event => onClickHeroActionUse(actor, event))
    list.find('[data-action=display]').on('click', event => onClickHeroActionDisplay(actor, event))
    list.find('[data-action=discard]').on('click', onClickHeroActionDiscard)
    list.find('[data-action=discard-selected]').on('click', () => onClickHeroActionsDiscard(actor, html))
    html.find('[data-action=hero-actions-trade]').on('click', () => tradeHeroAction(actor))
}

async function onClickHeroActionsDiscard(actor, html) {
    const discarded = html.find('.tab.actions .heroActions-list .action.discarded')
    const uuids = discarded.toArray().map(x => x.dataset.uuid)
    discardHeroActions(actor, uuids)
}

function onClickHeroActionDiscard(event) {
    event.preventDefault()

    const action = $(event.currentTarget).closest('.action')
    const list = action.closest('.heroActions-list')

    action.toggleClass('discarded')

    const toDiscard = Number(list.attr('data-discard') ?? '0')
    const $discarded = list.find('.action.discarded')

    list.toggleClass('discardable', $discarded.length === toDiscard)
}

async function onClickHeroActionDisplay(actor, event) {
    event.preventDefault()
    const uuid = $(event.currentTarget).closest('.action').attr('data-uuid')
    sendActionToChat(actor, uuid)
}

async function onClickHeroActionUse(actor, event) {
    event.preventDefault()
    const uuid = $(event.currentTarget).closest('.action').attr('data-uuid')
    useHeroAction(actor, uuid)
}

async function onClickHeroActionsDraw(actor, event) {
    event.preventDefault()
    drawHeroActions(actor)
}

export function getHeroActions(actor) {
    return getProperty(actor, `flags.${MODULE_ID}.heroActions`) ?? []
}

function setHeroActions(actor, actions) {
    return actor.update({ [`flags.${MODULE_ID}.heroActions`]: actions })
}

async function onClickHeroActionExpand(event) {
    event.preventDefault()

    const action = $(event.currentTarget).closest('.action')
    const summary = action.find('.item-summary')

    if (!summary.hasClass('loaded')) {
        const uuid = action.attr('data-uuid')
        const details = await getHeroActionDetails(uuid)
        if (!details) return

        const text = await TextEditor.enrichHTML(details.description, { async: true })

        summary.find('.item-description').html(text)
        summary.addClass('loaded')
    }

    action.toggleClass('expanded')
}

async function getHeroActionDetails(uuid) {
    let document = await fromUuid(uuid)
    if (!document) return undefined

    const parent = document instanceof JournalEntry ? document : document.parent
    const page = document instanceof JournalEntry ? document.pages.contents[0] : document

    let text = page?.text.content
    if (!text) return undefined

    if (parent.uuid === JOURNAL_UUID) text = text.replace(/^<p>/, '<p><strong>Trigger</strong> ')
    return { name: page.name, description: text }
}

export async function drawHeroActions(actor) {
    const actions = getHeroActions(actor)
    const nb = actor.heroPoints.value - actions.length

    const drawn = []
    for (let i = 0; i < nb; i++) {
        const action = await drawHeroAction()

        if (action === undefined) continue
        else if (action === null) return

        actions.push(action)
        drawn.push(action)
    }

    if (!drawn.length) return

    setHeroActions(actor, actions)

    const { content, size } = chatActions(drawn)
    const data = {
        flavor: `<h4 class="action">${localize('hero.actions-draw.header', { nb: size })}</h4>`,
        content,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
    }

    if (getSetting('hero-private')) {
        data.type = CONST.CHAT_MESSAGE_TYPES.ROLL
        data.rollMode = CONST.DICE_ROLL_MODES.PRIVATE
    }

    ChatMessage.create(data)
}

function chatActions(actions) {
    const links = actions.map(({ uuid, name }) => chatUUID(uuid, name))
    return {
        content: links.map(x => `<div style="line-height: 1.6;">${x}</div>`).join(''),
        size: links.length,
    }
}

function tradeHeroAction(actor) {
    const actions = getHeroActions(actor)
    if (!actions || !actions.length) {
        warn('hero.no-action')
        return
    }

    const diff = actions.length - actor.heroPoints.value
    if (diff > 0) {
        warn('hero.no-points', { nb: diff.toString() })
        return
    }

    new Trade(actor).render(true)
}

async function drawHeroAction() {
    const table = await getDeckTable()
    const localize = subLocalize('hero.table')

    if (!table) {
        localize.error('drawError', true)
        return null
    }

    if (!table.formula) {
        if (game.user.isGM) {
            if (table.compendium) {
                localize.error('noFormulaCompendium', true)
                return null
            }
            await table.normalize()
        } else {
            localize.error('noFormula', true)
            return null
        }
    }

    if (table.replacement === false) {
        const notDrawn = table.results.some(r => !r.drawn)
        if (!notDrawn) await table.resetResults()
    }

    const draw = (await table.draw({ displayChat: false })).results[0]
    if (!draw) return

    const uuid = documentUuidFromTableResult(draw)
    if (uuid) return { uuid, name: await getLabelfromTableResult(draw, uuid) }
}

async function useHeroAction(actor, uuid) {
    const points = actor.heroPoints.value
    if (points < 1) return warn('hero.use.noPoints')

    const actions = getHeroActions(actor)

    const index = actions.findIndex(x => x.uuid === uuid)
    if (index === -1) return

    const details = await getHeroActionDetails(uuid)
    if (!details) error('hero.use.noDetails')

    actions.splice(index, 1)

    if (details) {
        actor.update({
            ['system.resources.heroPoints.value']: points - 1,
            [`flags.${MODULE_ID}.heroActions`]: actions,
        })

        ChatMessage.create({
            flavor: `<h4 class="action">${localize('hero.actions-use.header')}</h4>`,
            content: `<h2>${details.name}</h2>${details.description}`,
            speaker: ChatMessage.getSpeaker({ actor }),
        })
    } else {
        setHeroActions(actor, actions)
    }
}

async function discardHeroActions(actor, uuids) {
    uuids = typeof uuids === 'string' ? [uuids] : uuids

    const actions = getHeroActions(actor)
    const removed = []

    for (const uuid of uuids) {
        const index = actions.findIndex(x => x.uuid === uuid)
        if (index === -1) continue
        removed.push(actions[index])
        actions.splice(index, 1)
    }

    setHeroActions(actor, actions)

    const { content, size } = chatActions(removed)
    ChatMessage.create({
        flavor: `<h4 class="action">${localize('hero.actions-discard.header', { nb: size })}</h4>`,
        content,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
    })
}

async function getLabelfromTableResult(result, uuid) {
    if (result.type !== CONST.TABLE_RESULT_TYPES.TEXT) return result.text
    const label = /@UUID\[[\w\.]+\]{([\w -]+)}/.exec(result.text)?.[1]
    return label ?? (uuid && (await fromUuid(uuid))?.name)
}

async function getTableFromUuid(uuid) {
    if (!uuid) return undefined
    const table = await fromUuid(uuid)
    return table && table instanceof RollTable ? table : undefined
}

async function getDefaultCompendiumTable() {
    return getTableFromUuid(TABLE_UUID)
}

function getDefaultWorldTable() {
    return game.tables.find(x => x.getFlag('core', 'sourceId') === TABLE_UUID)
}

async function getCustomTable() {
    return getTableFromUuid(getSetting('hero-table'))
}

async function getDeckTable() {
    return (await getCustomTable()) ?? getDefaultWorldTable() ?? (await getDefaultCompendiumTable())
}

async function sendActionToChat(actor, uuid) {
    const details = await getHeroActionDetails(uuid)
    if (!details) return error('hero.details.missing')

    ChatMessage.create({
        content: `<h2>${details.name}</h2>${details.description}`,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
    })
}

export function sendTradeRequest(trade) {
    if (trade.receiver.id === game.user.id) {
        acceptRequest(trade)
        return
    }

    socketEmit({
        ...trade,
        type: 'trade-request',
    })
}

function acceptRequest(trade) {
    if (game.user.isGM) {
        onTradeAccepted(trade)
        return
    }

    socketEmit({
        ...trade,
        type: 'trade-accept',
    })
}

async function onTradeAccepted(trade) {
    const { sender, receiver } = trade
    const senderActor = game.actors.get(sender.cid)
    const receiverActor = game.actors.get(receiver.cid)

    if (!senderActor || !receiverActor) {
        sendTradeError(trade)
        return
    }

    const senderActions = getHeroActions(senderActor)
    const receiverActions = getHeroActions(receiverActor)

    const senderActionIndex = senderActions.findIndex(x => x.uuid === sender.uuid)
    const receiverActionIndex = receiverActions.findIndex(x => x.uuid === receiver.uuid)

    if (senderActionIndex === -1 || receiverActionIndex === -1) {
        sendTradeError(trade)
        return
    }

    const senderAction = senderActions.splice(senderActionIndex, 1)[0]
    const receiverAction = receiverActions.splice(receiverActionIndex, 1)[0]

    senderActions.push(receiverAction)
    receiverActions.push(senderAction)

    setHeroActions(senderActor, senderActions)
    setHeroActions(receiverActor, receiverActions)

    const sentLink = chatUUID(senderAction.uuid)
    const receivedLink = chatUUID(receiverAction.uuid)

    const localize = subLocalize('hero.trade-success')

    let content = `<div style="line-height: 1.6">${localize('offer', { offer: sentLink })}</div>`
    content += `<div style="line-height: 1.6">${localize('receive', { receive: receivedLink })}</div>`

    console.log('content')

    ChatMessage.create({
        flavor: `<h4 class="action">${localize('header', { name: receiverActor.name })}</h4>`,
        content,
        speaker: ChatMessage.getSpeaker({ actor: senderActor }),
    })
}

function sendTradeError({ sender, receiver }, error = 'trade-error') {
    const users = new Set([sender.id, receiver.id])

    if (users.has(game.user.id)) {
        users.delete(game.user.id)
        onTradeError(error)
    }

    if (!users.size) return

    socketEmit({
        type: 'trade-error',
        users: Array.from(users),
        error,
    })
}

function onTradeError(err) {
    error('hero.trade-error')
}

async function onTradeRequest(trade) {
    const { sender, receiver } = trade
    const senderActor = game.actors.get(sender.cid)
    const receiverActor = game.actors.get(receiver.cid)

    if (!senderActor || !receiverActor) {
        sendTradeError(trade)
        return
    }

    const localize = subLocalize('hero.trade-request')

    let content = `<p>${localize('header', { sender: senderActor.name, receiver: receiverActor.name })}</p>`
    content += `<p>${localize('give', { give: chatUUID(sender.uuid) })}</p>`
    content += `<p>${localize('want', { want: chatUUID(receiver.uuid) })}</p>`
    content += `<p style="margin-bottom: 1em;">${localize('accept')}</p>`

    const accept = await Dialog.confirm({
        title: localize('title'),
        content: await TextEditor.enrichHTML(content, { async: true }),
    })

    if (accept) acceptRequest(trade)
    else rejectRequest(trade)
}

function rejectRequest(trade) {
    if (trade.sender.id === game.user.id) {
        onTradeRejected(trade)
        return
    }

    socketEmit({
        ...trade,
        type: 'trade-reject',
    })
}

async function onTradeRejected({ receiver }) {
    const actor = game.actors.get(receiver.cid)
    warn('hero.trade-rejected', { name: actor.name }, true)
}

async function createTable() {
    const localize = subLocalize('hero.templates.createTable.choice')
    const template = templatePath('hero/dialogs/create-table')

    const buttons = {
        yes: {
            label: localize('create'),
            icon: '<i class="fas fa-border-all"></i>',
            callback: html => {
                const type = html.find('.window-content input[name="type"]:checked').val()
                const unique = html.find('.window-content input[name="draw"]:checked').val() === 'unique'
                return { type, unique }
            },
        },
        no: {
            label: localize('cancel'),
            icon: '<i class="fas fa-times"></i>',
            callback: () => null,
        },
    }

    const data = {
        content: await renderTemplate(template, { i18n: localize }),
        title: localize('title'),
        buttons,
        default: 'yes',
        close: () => null,
    }

    const result = await Dialog.wait(data, undefined, { id: 'pf2e-hero-actions-create-table' })
    if (!result) return

    if (result.type === 'default') createDefaultTable(result.unique)
    else createCustomTable(result.unique)
}

async function createCustomTable(unique) {
    const table = await createCustomActionsTable(unique)
    await setTable(table)
    table.sheet?.render(true)
}

function createCustomActionsTable(unique = true) {
    const source = getTableSource(unique)
    return RollTable.create(source, { temporary: false })
}

async function createDefaultTable(unique) {
    const localize = subLocalize('templates.createTable.default.confirm')
    let table = await getDefaultWorldTable()

    if (table) {
        const override = await Dialog.confirm({
            title: localize('title'),
            content: localize('content'),
        })

        if (override) {
            const update = getTableSource(unique)
            await table.update(update)
            return setTable(table, true)
        }
    }

    table = await createDefautActionsTable(unique)
    await setTable(table)
}

async function createDefautActionsTable(unique = true) {
    const table = await fromUuid(TABLE_UUID)
    const source = getTableSource(unique, table)
    return RollTable.create(source, { temporary: false })
}

async function setTable(table, normalize = false) {
    if (normalize) await table.normalize()
    await setSetting('hero-table', table.uuid)
}

function getTableSource(unique = true, table) {
    const source = {
        name: localize('hero.table.name'),
        replacement: !unique,
        img: TABLE_ICON,
        description: localize('hero.table.description'),
        flags: {
            core: {
                sourceId: TABLE_UUID,
            },
        },
    }
    if (!table) return source
    return mergeObject(deepClone(table._source), source)
}

async function removeHeroActions() {
    const localize = subLocalize('hero.templates.removeActions')
    const template = templatePath('hero/dialogs/remove-actions')

    const buttons = {
        yes: {
            label: localize('remove'),
            icon: '<i class="fas fa-trash"></i>',
            callback: html =>
                html
                    .find('input[name="actor"]:checked')
                    .toArray()
                    .map(x => game.actors.get(x.value))
                    .filter(x => x),
        },
        no: {
            label: localize('cancel'),
            icon: '<i class="fas fa-times"></i>',
            callback: () => [],
        },
    }

    const data = {
        content: await renderTemplate(template, {
            actors: game.actors.filter(x => x.type === 'character'),
            i18n: localize,
        }),
        title: localize('title'),
        buttons,
        default: 'yes',
        render: html => {
            html.on('change', 'input[name="all"]', () => removeActionsToggleAll(html))
            html.on('change', 'input[name="actor"]', () => removeActionsToggleActor(html))
        },
        close: () => [],
    }

    const actors = await Dialog.wait(data, undefined, { id: 'pf2e-hero-actions-remove-actions' })
    if (!actors.length) {
        localize.warn('noSelection')
        return
    }

    for (const actor of actors) {
        setHeroActions(actor, [])
    }

    localize.info('removed')
}

function removeActionsToggleAll(html) {
    const state = html.find('input[name="all"]')[0].checked
    html.find('input[name="actor"]').prop('checked', state)
}

function removeActionsToggleActor(html) {
    const actors = html.find('input[name="actor"]')
    const checked = actors.filter(':checked')
    const all = html.find('input[name="all"]')

    if (actors.length === checked.length) {
        all.prop('checked', true).prop('indeterminate', false)
        actors.prop('checked', true)
    } else if (!checked.length) {
        all.prop('checked', false).prop('indeterminate', false)
        actors.prop('checked', false)
    } else {
        all.prop('checked', false).prop('indeterminate', true)
    }
}
