import {Card} from "./Card.js"

export class MonsterCard extends Card {
    #atk
    #def
    #level
    #position
    #alreadyAttacked = false

    constructor({name, atk, def, level, type}, position, visibility, player, zone){
        super(name, type, visibility, player, zone)
        this.#atk      = atk
        this.#def      = def
        this.#level    = level
        this.#position = position
    }

    getAtk() {
        return this.#atk
    }

    getDef(){
        return this.#def
    }

    setPosition(position){
        this.#position = position
    }

    getPosition(){
        return this.#position
    }

    setAlreadyAttacked(){
        this.#alreadyAttacked = true
    }

    getAlreadyAttacked(){
        return this.#alreadyAttacked
    }

    toString(){
        return super.toString() + ` | Atk: ${this.#atk} | Def: ${this.#def} | Level: ${this.#level} | Position: ${this.#position}`
    }
}