export class Card {
    name
    #type
    #player
    #visibility
    #zone

    constructor(name, type, visibility, player, zone){
        this.name        = name
        this.#type       = type
        this.#player     = player
        this.#visibility = visibility
        this.#zone       = zone
    }

    getName(){
        return this.name
    }

    getType(){
        return this.#type
    }

    setVisibility(visibility){
        this.#visibility = visibility
    }

    getVisibility(){
        return this.#visibility
    }

    setZone(zone){
        this.#zone = zone
    }

    toString(){
        return `Name: ${this.name} | Type: ${this.#type} | Visibility: ${this.#visibility} | Zone: ${this.#zone}| Player: ${this.#player}`
    }
}