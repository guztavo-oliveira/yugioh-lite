export class Card {
    name
    #type
    #player
    #visibility
    #zone
    #description

    constructor(name, type, visibility, player, zone, description){
        this.name        = name
        this.#type       = type
        this.#player     = player
        this.#visibility = visibility
        this.#zone       = zone
        this.#description = description
    }

    getName(){
        return this.name
    }

    getType(){
        return this.#type
    }

    getDescription(){
        return this.#description ?? "No description available."
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
