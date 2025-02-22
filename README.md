# FoundryVTT PF2e ToolBelt

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K6M2V13)

A collection of utilities and features that are not big enough to warrant standalone modules.

When disabled, the features will have no impact on your world/client whatsoever.

# WORLD FEATURES

## Automatic Rune Progression (Requires Reload)

This feature is made to replace the `Automatic Bonus Progression` variant rule, instead it will automatically give the `potency`, `striking` and `resilient` runes on character's equipment when appropriate. Nothing else from the regular `Automatic Bonus Progression` will be replicated.

Alchemical bombs, `Specific Magic` items, the `Shield Bash` weapon/maneuver and all the items that have been flagged by the `PF2e Companion Compedia` module are exceptions to this feature.

The module will automatically disable the system `Automatic Bonus Progression` variant rule to function properly when this feature is enabled.

## No Dropped Bulk (Requires Reload)

Dropped equipment in an actor's inventory won't be accounted for bulk value calculation

## Giveth

**IMPORTANT: A GM needs to be logged into your world to allow players to giveth their hard earned belongings.**

This module will allow players to give items to actors owned by the other players without any fuss, a simple drag & drop on a token and voila.

Players can also drag & drop effects/conditions that originated from them onto another actor that is owned by a player (the effect will lose its `unidentified` status and will have its `showIcon` set to `true` to avoid any possible weirdness), though this can sometimes result in some weirdness when effects rely on actor levels and such.

## Npc Lore Knowledges

This feature adds the ability to set custom lores for NPCs.

![](./readme/knowledges/edit.webp)

A new `Edit` button is added to the `Recall Knowledge` section of the NPC sheet which opens a new window where both the `Unspecified` and `Specific` lores can be set.

More than one of each can be set, simply by separating them with commas.

![](./readme/knowledges/result.webp)

Once saved, the custom Lores will replace the generic ones on the sheet.

## Set Un-Identified Image

Automatically set the un-identifed image of items to be the same as the regular image:

-   `On Creation Only:` Should the un-identified image be set for newly created or imported items
-   `On Creation & Update:` Should the un-identified image also be set when the image of an item is updated

## Custom Stances

This is the place to add the custom stances that are to be used in your world, you can provide a comma separated list of compendium pack id or world feat/features uuid directly.

> my-module.my-pack, Item.8qOVCzBzg0QaTTvM, Item.BdFirpMRuCjXENXf

Feat/features must both have the `Stance` trait and have a self-applied effect to be used by the module.

## Hero Actions

https://www.youtube.com/watch?v=8EezVnYQKyo

This feature integrates and automates the `Hero Deck` actions into the PF2e system.

It adds a new section in the `actions` tab of the character sheet where a player can **Draw**, **Discard** or **Use** `Hero Actions` in concert with the regular `Hero Points`.

-   If the character has more `Hero Points` than `Hero Actions`, the player will be asked to **Draw** new `Hero Actions` to fill in.

-   If the character has more `Hero Actions` than `Hero Points`, the player will be asked to **Discard** the excess of `Hero Actions`.

-   Otherwise the player will have the opportunity to **Use** any `Hero Actions` that are available to them, doing so will also spend one `Hero Point` from the character pool.

### Unique draw pool

By default, characters will draw randomly from a `hero Action` table without regard for which actions have already been drawn before.

If you want to have an unique action pool from which the actions are "removed" on draw until the pool is emptied (at which point, the pool will be refilled), you need to have a physical `Table` in your world.

Simply import the table from the compendium and uncheck the `Draw With Replacement?` option.

### Create Table Macro

You can create a script macro containing `game.modules.get("pf2e-toolbelt")?.api.heroActions.createTable()` to help you create a world Hero Action table

![](./readme/hero/create.webp)

You will be prompted with the option to create a `Default` or `Custom` table and if this table should or not use the `Unique Draw` feature.

When using that macro, the table will be created into your world with an obvious name and its UUID will also automatically be added to the settings.

### Remove Hero Actions Macro

You can create a script macro containing `game.modules.get("pf2e-toolbelt")?.api.heroActions.removeHeroActions()` to help you remove all the actions present on the `Characters` of your world

![](./readme/hero/remove.webp)

You will be prompted with the list of the `Characters` from whom you want the actions to be removed.

## Hero Actions - Table UUID

You can also have your own `Hero Actions` and table to draw them, to do so, you will need valid journal entries (in your world or in a compendium) and a table used to draw them.

![](./readme/hero/uuid.webp)

Because the module cannot infer which table you are using in the case of a custom table, you will need to provide its UUID manually in the settings, to do so, open your table and `Right-Click` on the 📔 next to its name in the title bar, this will copy its UUID to your clipboard.

## Hero Actions - Allow Trade

Characters can trade `Hero Action` between each others.

![](./readme/hero/trade.webp)

If the initiating player is the owner of both characters (or is the GM), the trade will automatically be accepted.

![](./readme/hero/request.webp)

The owner of the character traded with will receive a request popup and can accept or refuse the deal offered. If the player is not online, the GM will receive the request instead.

## Hero Actions - Private Draw

When enabled, the message generated when drawing hero actions will be private instead of public.

# CLIENT FEATURES

## Merge Damage

A new icon will appear in damage roll messages allowing the merging of the message with another one of the same type preceding it

-   the module will look at the 5 messages above it to find a matching message
-   the other message needs to have been initiated from the same `Item` (and therefore `Actor`)
-   the other message needs to have the same target (or both no target)

You can keep merging messages as long as the module find one appropriate

## Multi-Cast

A new `Multi` button will appear next to spells `Damage` button allowing the cast of multiple instances of the spell at once with only one chat message displayed

When this setting is enabled/disabled, the last 10 messages will be modified to add/remove the `Multi` button

## Remove Effect Shortcut

![](./readme/effects/remove.webp)

Using `[Shift + Right Click]` on effect icons in the effects panel will instantly remove all its charges/counters/badges

## Condition Sheet Icon

Adds the `open sheet` icon to conditions in the effects panel just like it would for non-condition effects

## Spells Summary

![](/readme/summary/before-after.webp)

This feature offers the ability to toggle between the regular and an alternate version of the character sheet's `Spellcasting` tab at any moment.

To toggle between both modes, you simply need to click on the spellcasting nav button <img src="./readme/summary/icon.webp" style="width:24px;"/> at the top of the sheet.

The alternate version gather, sort and display all the available spells into a single table per level regardless of their category or casting type.

New informations are displayed to make up for the lack of category grouping: `DC`, `Check` and type `Innate`, `Prepared`, `Spontaneous` or `Focus`. The spellcasting entry name is also displayed when hovering over the `Check/DC` values.

When hovering over a spell, the resources used by the spell will also be dislayed and can be interacted with as shown in the image below.

![](./readme/summary/resources.webp)

<sup>_Resources of a spontaneous `Magic Missile` displayed on hover_</sup>

The alternate mode does not allow to create, edit or delete the spells, nor does it allow to change the spells selected from a spellbook. It is there to make it easier to see what is available during playtime.

This feature is fully compatible with the module [PF2e Staves](https://foundryvtt.com/packages/pf2e-staves)

## Stances

When enabled, new stances buttons will be added to you character sheets allowing an easy way to toggle them and more.

The module automatically "upgrade" you stances if need be (e.g. `Cobra Envenom` instead of `Cobra Stance`), will remove the stances at the end of the encounter

The Module automatically add/ask for a stance when a character with the `Stance Savant` feat joins an encounter

# API

A set of functions is exposed from the module to be used by third parties:

```js
/**
 * Retrieves the API object containing the funtions
 */
game.modules.get('pf2e-toolbelt').api
```

```js
heroActions: {
    /**
     * creates a Hero Actions table in your world
     * NOTE: should be put into a script macro
     * @returns { Promise<void> }
     */
    createTable,
    /**
     * removes the hero actions from any/all characters in your world,
     * NOTE: should be put into a script macro
     * @returns { Promise<void> }
     */
    removeHeroActions,
    /**
     * @param { CharacterPF2e } actor
     * @returns { { uuid: string; name: string; }[] } the list of hero actions on this character
     */
    getHeroActions,
    /**
     * uses the hero action and spends a hero point
     * @param { CharacterPF2e } actor
     * @param { string } uuid - the uuid of the action
     * @returns { Promise<void> }
     */
    useHeroAction,
    /**
     * @param { string } uuid - the uuid of the action
     * @returns { Promise<{ name: any; description: any; }> } the name and description of the action
     */
    getHeroActionDetails,
    /**
     * @return { Promise<{ uuid: string; name: any; }> } the name and uuid of the newly drawn action
     */
    drawHeroAction,
    /**
     * draws as many hero actions as needed to fill the difference between
     * the number of current actions on the character and the number of hero points
     * @param { CharacterPF2e } actor
     * @returns { Promise<void> }
     */
    drawHeroActions,
    /**
     * sends the action description to chat
     * @param { CharacterPF2e } actor
     * @param { string } uuid - the uuid of the action
     * @returns { Promise<void> }
     */
    sendActionToChat,
    /**
     * discards as many action from the character to reach the current number of hero points
     * @param { CharacterPF2e } actor
     * @param { string } uuid - the uuid of the action
     * @returns { Promise<void> }
     */
    discardHeroActions,
    /**
     * starts a trade request, opens a dialog window where the target character,
     * the offered and requested actions can be chosen
     * @param { CharacterPF2e } actor
     */
    tradeHeroAction,
}
```

```js
stances: {
    /**
     * @param { object } stance
     * @returns { boolean } true if the provided object is usable by the module
     */
    isValidStance,
    /**
     * @param { CompendiumCollection } pack
     * @returns { Promise<{ uuid: string; name: string, effect: string; }[]> } the stances found in the pack
     */
    getPackStances,
    /**
     * @param { ChatacterPF2e } actor
     * @returns { Promise<{ name: string; img: string; effectUUID: string; effectID: string; }[]> } the stances available on the actor,
     * effectID is only provided if the effect of the stance is currently present on the actor
     */
    getStances,
    /**
     * will toggle the provided stance effect and remove all other stance effects in the process
     * @param { ChatacterPF2e } actor
     * @param { string } effectUUID
     * @returns { Promise<void> }
     */
    toggleStance,
    /**
     * @returns { Set<string> } list of all the stances actions uuids
     */
    getActionsUUIDS,
}
```

# CHANGELOG

You can see the changelog [HERE](./CHANGELOG.md)
