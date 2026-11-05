import readline from "node:readline";
import { CARD_TYPES, DUEL_ACTIVITIES, DUEL_PHASES } from "./utils/constants.js";
import { showBoard } from "./utils/board.js";
import {
  advancePhase,
  battle,
  gameState,
  normalSummon,
  handlePhase,
  setCard,
  startDuel,
} from "./engine.js";

function getMenuOptions(state) {
  const player = state.currentTurnPlayer;
  const options = [];

  switch (state.phase) {
    case DUEL_PHASES.MAIN_1:
    case DUEL_PHASES.MAIN_2:
      if (!state[player].normalSummoned) options.push(DUEL_ACTIVITIES.NORMAL_SUMMON);
      options.push(DUEL_ACTIVITIES.SET, DUEL_ACTIVITIES.ACTIVE, DUEL_ACTIVITIES.NEXT_PHASE);
      return options;

    case DUEL_PHASES.BATTLE:
      if (state.turn !== 1 && state[player].monsters.length !== 0) {
        options.push(DUEL_ACTIVITIES.ATTACK);
      }
      options.push(DUEL_ACTIVITIES.ACTIVE, DUEL_ACTIVITIES.NEXT_PHASE);
      return options;

    default:
      return options;
  }
}

function showMenu(state) {
  console.log(`==== ${state.phase} ====`);
  getMenuOptions(state).forEach((option, index) => console.log(`${index + 1} - ${option.text}`));
}

function showHand(state) {
  const player = state.currentTurnPlayer;
  console.log(`==== ${player === "p1" ? "Player 1" : "Player 2"} HAND ====`);

  state[player].hand.forEach((card, index) => {
    const stats = card.getType() === CARD_TYPES.MONSTER
      ? ` [ATK ${card.getAtk()} | DEF ${card.getDef()}]`
      : "";
    console.log(`${index + 1}: [${card.getType()}] ${card.getName()}${stats}`);
  });
}

function returnToLoop(message) {
  if (message) console.log(message);
  setTimeout(gameLoop, 1500);
}

function promptNormalSummon() {
  console.clear();
  showHand(gameState);
  rl.question("Which monster do you want to summon? (0 for turn back) > ", (answer) => {
    if (answer === "0") return gameLoop();
    const result = normalSummon(gameState, gameState.currentTurnPlayer, Number(answer) - 1);
    returnToLoop(result.message);
  });
}

function promptSetCard() {
  console.clear();
  showHand(gameState);
  rl.question("Which card do you want to set? (0 for turn back) > ", (answer) => {
    if (answer === "0") return gameLoop();
    const result = setCard(gameState, gameState.currentTurnPlayer, Number(answer) - 1);
    returnToLoop(result.message);
  });
}

function promptBattle() {
  rl.question(
    "Battle! Choose your monster and the opponent monster, e.g. 1 2. (0 for turn back) > ",
    (answer) => {
      if (answer === "0") return gameLoop();
      const [attacker, target] = answer.split(" ").map((value) => Number(value) - 1);
      const result = battle(gameState, gameState.currentTurnPlayer, attacker, target);
      returnToLoop(result.message);
    },
  );
}

function handleGameOptions(answer) {
  const selectedOption = getMenuOptions(gameState)[Number(answer) - 1];
  if (!selectedOption) return returnToLoop("Invalid option.");

  switch (selectedOption.type) {
    case DUEL_ACTIVITIES.NORMAL_SUMMON.type:
      return promptNormalSummon();
    case DUEL_ACTIVITIES.SET.type:
      return promptSetCard();
    case DUEL_ACTIVITIES.ATTACK.type:
      return promptBattle();
    case DUEL_ACTIVITIES.ACTIVE.type:
      return returnToLoop();
    case DUEL_ACTIVITIES.NEXT_PHASE.type:
      advancePhase(gameState);
      return gameLoop();
  }
}

function gameLoop() {
  console.clear();
  handlePhase(gameState);
  showBoard(gameState);
  showHand(gameState);
  showMenu(gameState);
  rl.question("> ", handleGameOptions);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("======= DUEL START =======");
startDuel(gameState);
gameLoop();
