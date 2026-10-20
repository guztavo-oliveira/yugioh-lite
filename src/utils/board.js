import {
  CARD_TYPES,
  VISIBILITY,
} from "./constants.js";
import { gameState } from "../engine.js";

function getCardDescription(card, player) {
    if (!card) return "[EMPTY]";

    if (card.getVisibility() === VISIBILITY.FACE_DOWN) {
        return `[SET CARD] ${player === gameState.currentTurnPlayer ? card.getName() : ""}`;
    }

    if (card.getType() === CARD_TYPES.MONSTER) {
        return `[${card.getVisibility()} ${card.getPosition()} position] ${card.getName()} | ATK: ${card.getAtk()} | DEF: ${card.getDef()}`;
    }

    return card.getName();
}

function showPlayerStatus(player, playerName, playerState) {
    console.log(`\n========== ${playerName} ==========`)
    console.log(`LP: ${player.lp}`)
    console.log(`Deck: ${player.deck.length}`)
    console.log(`Graveyard: ${player.graveyard.length}`)

    console.log("\nMONSTER ZONE")

    player.monsters.forEach((monster, index) => {
        console.log(`${index + 1}. ${getCardDescription(monster, playerState)}`);
    });

    console.log("\nSPELL / TRAP ZONE");

    player.supports.forEach((support, index) => {
        console.log(`${index + 1}. ${getCardDescription(support, playerState)}`);
    });
}

export function showBoard() {
    let opponent = gameState.currentTurnPlayer === "p1" ? "p2" : "p1"
    let player   = gameState.currentTurnPlayer
    console.log(`========== TURN ${gameState.turn} ==========`)
    showPlayerStatus(gameState[opponent], "OPPONENT", opponent);
    showPlayerStatus(gameState[player], "YOUR FIELD", player);
}