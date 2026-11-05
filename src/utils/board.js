import {
  CARD_TYPES,
  VISIBILITY,
} from "./constants.js";

function getCardDescription(state, card, player) {
    if (!card) return "[EMPTY]";

    if (card.getVisibility() === VISIBILITY.FACE_DOWN) {
        return `[SET CARD] ${player === state.currentTurnPlayer ? card.getName() : ""}`;
    }

    if (card.getType() === CARD_TYPES.MONSTER) {
        return `[${card.getVisibility()} ${card.getPosition()} position] ${card.getName()} | ATK: ${card.getAtk()} | DEF: ${card.getDef()}`;
    }

    return card.getName();
}

function showPlayerStatus(state, actualPlayer, playerName, playerState) {
    let player = state[actualPlayer]
    console.log(`\n========== ${playerName} ==========`)
    console.log(`LP: ${player.lp}`)
    console.log(`Deck: ${player.deck.length}`)
    console.log(`Graveyard: ${player.graveyard.length}`)

    console.log("\nMONSTER ZONE")

    player.monsters.forEach((monster, index) => {
        console.log(`${index + 1}. ${getCardDescription(state, monster, playerState)}`);
    });

    console.log("\nSPELL / TRAP ZONE");

    player.supports.forEach((support, index) => {
        console.log(`${index + 1}. ${getCardDescription(state, support, playerState)}`);
    });
}

export function showBoard(state) {
    let opponent = state.currentTurnPlayer === "p1" ? "p2" : "p1"
    let player   = state.currentTurnPlayer
    console.log(`========== TURN ${state.turn} ==========`)
    showPlayerStatus(state, opponent, "OPPONENT", opponent);
    showPlayerStatus(state, player, "YOUR FIELD", player);
}