import {
  CARD_TYPES,
  DUEL_PHASES,
  DUEL_PHASES_FLOW,
  POSITIONS,
  VISIBILITY,
  ZONES,
} from "./utils/constants.js";
import { MonsterCard } from "./classes/MonsterCard.js";
import { SupportCard } from "./classes/SupportCard.js";
import { CARD_DATABASE } from "./cardsDatabase.js";

export const gameState = {
  currentTurnPlayer: "p1",
  phase: DUEL_PHASES.DRAW,
  turn: 1,
  p1: {
    lp: 8000,
    deck: ["c001", "c002", "c003", "c006", "c007", "c008", "c009", "c010", "c011", "c012", "c013"],
    hand: [], monsters: [], supports: [], graveyard: [], normalSummoned: false,
  },
  p2: {
    lp: 8000,
    deck: ["c005", "c004", "c003", "c006", "c007", "c008", "c009", "c010", "c011", "c012", "c013"],
    hand: [], monsters: [], supports: [], graveyard: [], normalSummoned: false,
  },
};

export function getOpponent(player) {
  return player === "p1" ? "p2" : "p1";
}

function createCardInstance(cardId, player) {
  const card = CARD_DATABASE[cardId];
  return card.type === CARD_TYPES.MONSTER
    ? new MonsterCard(card, "", "", player, ZONES.HAND)
    : new SupportCard(card, "", player, ZONES.HAND);
}

function removeCardFromDeck(state, player, position) {
  return state[player].deck.splice(position, 1)[0];
}

function moveCardFromHand(state, player, handIndex) {
  return state[player].hand.splice(handIndex, 1)[0];
}

function sendMonsterToGraveyard(state, player, monsterIndex) {
  const [monster] = state[player].monsters.splice(monsterIndex, 1);
  state[player].graveyard.push(monster);
}

export function drawCard(state, player) {
  const cardId = removeCardFromDeck(state, player, 0);
  state[player].hand.push(createCardInstance(cardId, player));
}

export function drawStartingHand(state, player) {
  for (let index = 0; index < 4; index++) {
    const deckIndex = Math.floor(Math.random() * state[player].deck.length);
    const cardId = removeCardFromDeck(state, player, deckIndex);
    state[player].hand.push(createCardInstance(cardId, player));
  }
}

export function startDuel(state) {
  drawStartingHand(state, "p1");
  drawStartingHand(state, "p2");
}

export function advancePhase(state) {
  const phaseIndex = DUEL_PHASES_FLOW.indexOf(state.phase);

  if (phaseIndex === DUEL_PHASES_FLOW.length - 2) {
    const player = state.currentTurnPlayer;
    state[player].normalSummoned = false;
    state.phase = DUEL_PHASES_FLOW[0];
    state.currentTurnPlayer = getOpponent(player);
    state.turn++;
    return;
  }

  state.phase = DUEL_PHASES_FLOW[phaseIndex + 1];
}

export function handlePhase(state) {
  if (state.phase === DUEL_PHASES.DRAW) {
    drawCard(state, state.currentTurnPlayer);
    advancePhase(state);
  }
}

export function normalSummon(state, player, handIndex) {
  const card = state[player].hand[handIndex];
  if (!card || card.getType() !== CARD_TYPES.MONSTER) {
    return { ok: false, message: "Only monster cards can be summoned." };
  }

  card.setPosition(POSITIONS.ATTACK);
  card.setVisibility(VISIBILITY.FACE_UP);
  card.setZone(ZONES.MONSTER_ZONE);
  state[player].monsters.push(card);
  state[player].normalSummoned = true;
  moveCardFromHand(state, player, handIndex);
  return { ok: true, message: `Summoning ${card.getName()}...` };
}

export function setCard(state, player, handIndex) {
  const card = state[player].hand[handIndex];
  if (!card) return { ok: false, message: "Choose a card from your hand." };

  if (card.getType() === CARD_TYPES.MONSTER) {
    card.setPosition(POSITIONS.DEFENSE);
    card.setVisibility(VISIBILITY.FACE_DOWN);
    card.setZone(ZONES.MONSTER_ZONE);
    state[player].monsters.push(card);
    state[player].normalSummoned = true;
    moveCardFromHand(state, player, handIndex);
    return { ok: true, message: `Setting ${card.getName()} face down in defense position.` };
  }

  card.setVisibility(VISIBILITY.FACE_DOWN);
  card.setZone(ZONES.SUPPORT_ZONE);
  state[player].supports.push(card);
  moveCardFromHand(state, player, handIndex);
  return { ok: true, message: `Setting ${card.getName()} face down.` };
}

export function battle(state, player, attackerIndex, targetIndex) {
  const opponent = getOpponent(player);
  const attacker = state[player].monsters[attackerIndex];
  const target = state[opponent].monsters[targetIndex];

  if (!attacker || !target) {
    return { ok: false, message: "Choose a valid attacking monster and target." };
  }
  if (attacker.getAlreadyAttacked()) {
    return { ok: false, message: "This monster already attacked this turn." };
  }
  if (attacker.getPosition() !== POSITIONS.ATTACK) {
    return { ok: false, message: "Only monsters in attack position can attack." };
  }

  attacker.setAlreadyAttacked();
  if (target.getPosition() === POSITIONS.ATTACK) {
    if (attacker.getAtk() > target.getAtk()) {
      state[opponent].lp -= attacker.getAtk() - target.getAtk();
      sendMonsterToGraveyard(state, opponent, targetIndex);
      return { ok: true, message: `${target.getName()} was destroyed and sent to the graveyard.` };
    }
    if (attacker.getAtk() === target.getAtk()) {
      sendMonsterToGraveyard(state, opponent, targetIndex);
      sendMonsterToGraveyard(state, player, attackerIndex);
      return { ok: true, message: "Both monsters were destroyed and sent to the graveyard." };
    }
    state[player].lp -= target.getAtk() - attacker.getAtk();
    sendMonsterToGraveyard(state, player, attackerIndex);
    return { ok: true, message: `${attacker.getName()} was destroyed and sent to the graveyard.` };
  }

  if (attacker.getAtk() > target.getDef()) {
    sendMonsterToGraveyard(state, opponent, targetIndex);
    return { ok: true, message: `${target.getName()} was destroyed and sent to the graveyard.` };
  }
  if (attacker.getAtk() < target.getDef()) {
    state[player].lp -= target.getDef() - attacker.getAtk();
    return { ok: true, message: `${attacker.getName()} have less atk points than ${target.getName()} defense points and the difference between then will be substract to your life points.` };
  }
  return { ok: true, message: "The attack and defense values are equal; nothing happens." };
}
