import {
  CARD_TYPES,
  DUEL_PHASES,
  DUEL_PHASES_FLOW,
  GAME_CONFIGS,
  POSITIONS,
  TRAP_TRIGGER_EVENTS,
  VISIBILITY,
  ZONES,
} from "./utils/constants.js";
import { MonsterCard } from "./classes/MonsterCard.js";
import { SupportCard } from "./classes/SupportCard.js";
import { CARD_DATABASE } from "./cardsDatabase.js";

export function createGameState() {
  return {
    currentTurnPlayer: "p1",
    phase: DUEL_PHASES.DRAW,
    turn: 1,
    p1: {
      lp: 8000,
      deck: ["c001", "c002", "c003", "c006", "c007", "c008", "c009", "c010", "c011", "c012", "c013", "c014", "c015"],
      hand: [], monsters: [], supports: [], graveyard: [], normalSummoned: false,
    },
    p2: {
      lp: 8000,
      deck: ["c005", "c004", "c003", "c006", "c007", "c008", "c009", "c010", "c011", "c012", "c013", "c014", "c015"],
      hand: [], monsters: [], supports: [], graveyard: [], normalSummoned: false,
    },
  };
}

export const gameState = createGameState();

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
  monster.setZone(ZONES.GRAVEYARD);
  state[player].graveyard.push(monster);
}

function sendAllMonstersToGraveyard(state, player) {
  while (state[player].monsters.length > 0) {
    sendMonsterToGraveyard(state, player, 0);
  }
}

function sendSupportToGraveyard(state, player, supportIndex) {
  const [card] = state[player].supports.splice(supportIndex, 1);
  card.setZone(ZONES.GRAVEYARD);
  state[player].graveyard.push(card);
}

function isMainPhase(phase) {
  return phase === DUEL_PHASES.MAIN_1 || phase === DUEL_PHASES.MAIN_2;
}

function getMonsterIndex(state, player, monster) {
  return state[player].monsters.findIndex((fieldMonster) => fieldMonster === monster);
}

function isEligibleTrap(card, state, player, event) {
  if (
    card.getType() !== CARD_TYPES.TRAP
    || card.getVisibility() !== VISIBILITY.FACE_DOWN
    || card.getSetTurn() === null
    || card.getSetTurn() >= state.turn
  ) {
    return false;
  }

  switch (card.getEffect()) {
    case "DESTROY_SUMMONED_MONSTER":
      return event.type === TRAP_TRIGGER_EVENTS.MONSTER_SUMMONED && event.player !== player;
    case "DESTROY_ALL_MONSTERS":
      return event.type === TRAP_TRIGGER_EVENTS.MONSTER_SUMMONED;
    case "DESTROY_ATTACKING_MONSTERS":
    case "NEGATE_ATTACK_AND_DAMAGE":
      return event.type === TRAP_TRIGGER_EVENTS.ATTACK_DECLARED && event.player !== player;
    default:
      return false;
  }
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
  if (state[player].normalSummoned) {
    return { ok: false, message: "You already normal summoned this turn." };
  }
  if (!card || card.getType() !== CARD_TYPES.MONSTER) {
    return { ok: false, message: "Only monster cards can be summoned." };
  }

  card.setPosition(POSITIONS.ATTACK);
  card.setVisibility(VISIBILITY.FACE_UP);
  card.setZone(ZONES.MONSTER_ZONE);
  state[player].monsters.push(card);
  state[player].normalSummoned = true;
  moveCardFromHand(state, player, handIndex);
  return {
    ok: true,
    message: `Summoning ${card.getName()}...`,
    event: { type: TRAP_TRIGGER_EVENTS.MONSTER_SUMMONED, player, monster: card },
  };
}

export function setCard(state, player, handIndex) {
  const card = state[player].hand[handIndex];
  if (!card) return { ok: false, message: "Choose a card from your hand." };

  if (card.getType() === CARD_TYPES.MONSTER) {
    if (state[player].normalSummoned) {
      return { ok: false, message: "You already normal summoned this turn." };
    }
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
  if (card.getType() === CARD_TYPES.TRAP) card.markSet(state.turn);
  state[player].supports.push(card);
  moveCardFromHand(state, player, handIndex);
  return { ok: true, message: `Setting ${card.getName()} face down.` };
}

export function activateSpell(state, player, handIndex) {
  const card = state[player]?.hand[handIndex];
  if (!isMainPhase(state.phase)) {
    return { ok: false, message: "Spells can only be activated during a Main Phase." };
  }
  if (!card || card.getType() !== CARD_TYPES.SPELL) {
    return { ok: false, message: "Choose a spell card from your hand." };
  }

  if (card.getEffect() === "DRAW_2_CARDS" && state[player].deck.length < 2) {
    return { ok: false, message: "There are not enough cards left in your deck." };
  }

  card.setVisibility(VISIBILITY.FACE_UP);
  card.setZone(ZONES.SUPPORT_ZONE);
  state[player].supports.push(card);
  moveCardFromHand(state, player, handIndex);
  return {
    ok: true,
    message: `${card.getName()} was activated.`,
    supportIndex: state[player].supports.length - 1,
  };
}

export function activateSetSpell(state, player, supportIndex) {
  const card = state[player]?.supports[supportIndex];
  if (!isMainPhase(state.phase)) {
    return { ok: false, message: "Spells can only be activated during a Main Phase." };
  }
  if (!card || card.getType() !== CARD_TYPES.SPELL) {
    return { ok: false, message: "Choose a spell card from your Spell/Trap Zone." };
  }
  if (card.getEffect() === "DRAW_2_CARDS" && state[player].deck.length < 2) {
    return { ok: false, message: "There are not enough cards left in your deck." };
  }

  card.setVisibility(VISIBILITY.FACE_UP);
  return { ok: true, message: `${card.getName()} was activated.`, supportIndex };
}

export function resolveSpell(state, player, supportIndex, target = null) {
  const card = state[player]?.supports[supportIndex];
  if (!card || card.getType() !== CARD_TYPES.SPELL) {
    return { ok: false, message: "Choose an activated spell card." };
  }

  switch (card.getEffect()) {
    case "DESTROY_ALL_MONSTERS":
      sendAllMonstersToGraveyard(state, "p1");
      sendAllMonstersToGraveyard(state, "p2");
      break;

    case "DESTROY_ALL_OPPONENT_MONSTERS":
      sendAllMonstersToGraveyard(state, getOpponent(player));
      break;

    case "DRAW_2_CARDS":
      drawCard(state, player);
      drawCard(state, player);
      break;

    case "SPECIAL_SUMMON_FROM_GRAVEYARD": {
      const targetPlayer = target?.player;
      const targetIndex = target?.graveyardIndex;
      const monster = state[targetPlayer]?.graveyard[targetIndex];
      if (!monster || monster.getType() !== CARD_TYPES.MONSTER) {
        return { ok: false, message: "Choose a monster from a graveyard." };
      }
      if (state[player].monsters.length >= GAME_CONFIGS.MAX_MOSTER_ZONES) {
        return { ok: false, message: "Your Monster Zone is full." };
      }

      state[targetPlayer].graveyard.splice(targetIndex, 1);
      monster.setVisibility(VISIBILITY.FACE_UP);
      monster.setPosition(POSITIONS.ATTACK);
      monster.setZone(ZONES.MONSTER_ZONE);
      state[player].monsters.push(monster);
      break;
    }

    default:
      return { ok: false, message: "This spell does not have an implemented effect." };
  }

  sendSupportToGraveyard(state, player, supportIndex);
  return { ok: true, message: `${card.getName()} resolved.` };
}

export function getEligibleTraps(state, player, event) {
  if (!state[player] || !event) return [];

  return state[player].supports
    .map((card, supportIndex) => ({ card, supportIndex }))
    .filter(({ card }) => isEligibleTrap(card, state, player, event));
}

export function activateTrap(state, player, supportIndex, event) {
  const card = state[player]?.supports[supportIndex];
  if (!card || !isEligibleTrap(card, state, player, event)) {
    return { ok: false, message: "That trap cannot be activated for this event." };
  }

  card.setVisibility(VISIBILITY.FACE_UP);
  return { ok: true, message: `${card.getName()} was activated.`, supportIndex };
}

export function resolveTrap(state, player, supportIndex, event) {
  const card = state[player]?.supports[supportIndex];
  if (!card || card.getType() !== CARD_TYPES.TRAP || card.getVisibility() !== VISIBILITY.FACE_UP) {
    return { ok: false, message: "Choose an activated trap card." };
  }

  const result = { ok: true, message: `${card.getName()} resolved.`, cancelAttack: false };
  switch (card.getEffect()) {
    case "DESTROY_SUMMONED_MONSTER": {
      const monsterIndex = getMonsterIndex(state, event.player, event.monster);
      if (event.type !== TRAP_TRIGGER_EVENTS.MONSTER_SUMMONED || monsterIndex === -1) {
        return { ok: false, message: "The summoned monster is no longer on the field." };
      }
      sendMonsterToGraveyard(state, event.player, monsterIndex);
      break;
    }
    case "DESTROY_ALL_MONSTERS":
      if (event.type !== TRAP_TRIGGER_EVENTS.MONSTER_SUMMONED) {
        return { ok: false, message: "This trap requires a monster summon." };
      }
      sendAllMonstersToGraveyard(state, "p1");
      sendAllMonstersToGraveyard(state, "p2");
      break;
    case "DESTROY_ATTACKING_MONSTERS": {
      const attackerIndex = getMonsterIndex(state, event.player, event.attacker);
      if (event.type !== TRAP_TRIGGER_EVENTS.ATTACK_DECLARED || attackerIndex === -1) {
        return { ok: false, message: "The attacking monster is no longer on the field." };
      }
      sendMonsterToGraveyard(state, event.player, attackerIndex);
      result.cancelAttack = true;
      break;
    }
    case "NEGATE_ATTACK_AND_DAMAGE":
      if (event.type !== TRAP_TRIGGER_EVENTS.ATTACK_DECLARED || !event.attacker) {
        return { ok: false, message: "This trap requires an attack declaration." };
      }
      state[event.player].lp -= event.attacker.getAtk();
      result.cancelAttack = true;
      break;
    default:
      return { ok: false, message: "This trap does not have an implemented effect." };
  }

  sendSupportToGraveyard(state, player, supportIndex);
  return result;
}

export function declareAttack(state, player, attackerIndex, targetIndex) {
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
  return {
    ok: true,
    event: {
      type: TRAP_TRIGGER_EVENTS.ATTACK_DECLARED,
      player,
      opponent,
      attacker,
      target,
    },
  };
}

export function resolveBattle(state, event) {
  const player = event.player;
  const opponent = event.opponent;
  const attackerIndex = getMonsterIndex(state, player, event.attacker);
  const targetIndex = getMonsterIndex(state, opponent, event.target);
  const attacker = state[player].monsters[attackerIndex];
  const target = state[opponent].monsters[targetIndex];

  if (!attacker || !target) {
    return { ok: false, message: "The attack can no longer be resolved." };
  }

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

export function battle(state, player, attackerIndex, targetIndex) {
  const declaration = declareAttack(state, player, attackerIndex, targetIndex);
  if (!declaration.ok) return declaration;
  return resolveBattle(state, declaration.event);
}
