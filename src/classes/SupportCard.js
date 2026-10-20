import {Card} from "./Card.js"

export class SupportCard extends Card {
    #subtype
    #effect

    constructor({name, type, subtype, effect}, visibility, player, zone){
        super(name, type, visibility, player, zone)
        this.#subtype = subtype
        this.#effect  = effect
    }
}