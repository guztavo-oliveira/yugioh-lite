import {Card} from "./Card.js"

export class SupportCard extends Card {
    #subtype
    #effect
    #setTurn = null

    constructor({name, type, subtype, effect}, visibility, player, zone){
        super(name, type, visibility, player, zone)
        this.#subtype = subtype
        this.#effect  = effect
    }

    getEffect(){
        return this.#effect
    }

    getSubtype(){
        return this.#subtype
    }

    markSet(turn){
        this.#setTurn = turn
    }

    getSetTurn(){
        return this.#setTurn
    }
}
