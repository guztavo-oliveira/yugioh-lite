import {
  DUEL_PHASES,
  DUEL_ACTIVITIES,
  CARD_TYPES,
  POSITIONS,
  VISIBILITY,
  ZONES,
  DUEL_PHASES_FLOW,
} from "./utils/constants.js";
import { showBoard } from "./utils/board.js";
import { gameState } from "./engine.js";
import { MonsterCard } from "./classes/MonsterCard.js";
import { SupportCard } from "./classes/SupportCard.js";
import { CARD_DATABASE } from "./cardsDatabase.js";
import readline from "node:readline";

let ACTUAL_PLAYER = gameState.currentTurnPlayer;

function removeCardFromDeck(player, position) {
  return gameState[player].deck.splice(position, 1)[0];
}

function putCardInHand(player, card) {
  gameState[player].hand.push(card);
}

function initialDraw(p) {
  let player = p === "p1" ? "p1" : "p2";
  let playerDeck = gameState[player].deck;
  for (let i = 0; i <= 3; i++) {
    let index = Math.floor(Math.random() * playerDeck.length);

    let card = removeCardFromDeck(player, index); //"c001"
    card = CARD_DATABASE[card];

    if (card.type === CARD_TYPES.MONSTER) {
      putCardInHand(player, new MonsterCard(card, "", "", player, ZONES.HAND));
    } else {
      putCardInHand(player, new SupportCard(card, "", player, ZONES.HAND));
    }
  }
}

function draw() {
  let nextCard = gameState[ACTUAL_PLAYER].deck.shift();
  nextCard = CARD_DATABASE[nextCard];

  if (nextCard.type === CARD_TYPES.MONSTER) {
    putCardInHand(
      ACTUAL_PLAYER,
      new MonsterCard(nextCard, "", "", ACTUAL_PLAYER, ZONES.HAND),
    );
  } else {
    putCardInHand(
      ACTUAL_PLAYER,
      new SupportCard(nextCard, "", "", ACTUAL_PLAYER, ZONES.HAND),
    );
  }
}

function waitBeforeLoop(ms = 3000) {
  setTimeout(() => {
    gameLoop()
  }, ms);
}

function executeFnAfterMs(fn, ms = 3000){
	setTimeout(() => {
    fn()
  }, ms);
}

function nextPhase() {
  let idxActualPhase = DUEL_PHASES_FLOW.findIndex(
    (phase) => phase === gameState.phase,
  );

  if (idxActualPhase === DUEL_PHASES_FLOW.length - 2) {//MAIN_2
	  gameState[ACTUAL_PLAYER].normalSummoned = false
    gameState.phase = DUEL_PHASES_FLOW[0]; //DRAW
    gameState.currentTurnPlayer = ACTUAL_PLAYER === "p1" ? "p2" : "p1";
    ACTUAL_PLAYER = gameState.currentTurnPlayer;
    gameState.turn++
    return 
  }

  gameState.phase = DUEL_PHASES_FLOW[idxActualPhase + 1]; //dynamically goes to the next phase
}

function gameStart() {
  console.log("======= DUEL START =======");

  initialDraw("p1");
  initialDraw("p2");

}

function handlePhases(gameState){
	if(gameState.phase === DUEL_PHASES.DRAW){
		draw()
		nextPhase() 
	}
}

function getMenuOptions(gameState) {
  let options = [];
  switch (gameState.phase) {
    case DUEL_PHASES.MAIN_1: {
      if (!gameState[ACTUAL_PLAYER].normalSummoned) {
        options.push(DUEL_ACTIVITIES.NORMAL_SUMMON);
      }
      options.push(DUEL_ACTIVITIES.SET);
      options.push(DUEL_ACTIVITIES.ACTIVE);
      options.push(DUEL_ACTIVITIES.NEXT_PHASE);

      return options;
    }

    case DUEL_PHASES.BATTLE: {
      if(gameState.turn !== 1 && gameState[ACTUAL_PLAYER].monsters.length !== 0){
        options.push(DUEL_ACTIVITIES.ATTACK);
      }
      options.push(DUEL_ACTIVITIES.ACTIVE);
      options.push(DUEL_ACTIVITIES.NEXT_PHASE);

      return options;
    }

    case DUEL_PHASES.MAIN_2: {
      if (!gameState[ACTUAL_PLAYER].normalSummoned) {
        options.push(DUEL_ACTIVITIES.NORMAL_SUMMON);
      }
      options.push(DUEL_ACTIVITIES.SET);
      options.push(DUEL_ACTIVITIES.ACTIVE);
      options.push(DUEL_ACTIVITIES.NEXT_PHASE);

      return options;
    }

    default:
      return [];
  }
}

function showMenu(gameState) {
  console.log(`==== ${gameState.phase} ====`);

  const options = getMenuOptions(gameState);

  options.forEach((el, index) => {
    console.log(`${index + 1} - ${el.text}`);
  });
}

function showHand(gameState) {
  let playerHand = gameState[ACTUAL_PLAYER].hand;

  console.log(`==== ${ACTUAL_PLAYER === "p1" ? "Player 1" : "Player 2"} HAND ====`);

  for (let i = 0; i < playerHand.length; i++) {
    let card = playerHand[i];
    console.log(`${i + 1}: [${card.getType()}] ${card.getName()} ${card.getType() === CARD_TYPES.MONSTER ? `[ATK ${card.getAtk()} | DEF ${card.getDef()}]` : ""}
    `);
  }
}

function removeCardFromHand(player, position) {
  gameState[player].hand.splice(position, 1);
}

function putMonsterCardOnField(player, monster) {
  monster.setPosition(POSITIONS.ATTACK);
  monster.setVisibility(VISIBILITY.FACE_UP);
  monster.setZone(ZONES.MONSTER_ZONE);

  gameState[player].monsters.push(monster);
  gameState[player].normalSummoned = true; //change to true for forbid a new normal summon (only one for player turn)

  console.log(`Summoning ${monster.getName()}...`);
}

function normalSummon() {
  console.clear();
  showHand(gameState);

  rl.question(
    "Which monster do you want to summon? (0 for turn back) > ",
    (answer) => {
      if (answer === "0") {
        return gameLoop();
      }

      let playerChoice = answer - 1;
      let cardInHand   = gameState[ACTUAL_PLAYER].hand[playerChoice];

      if (cardInHand.getType() !== CARD_TYPES.MONSTER) {
        console.log("Only monster cards can be summoned, spell/trap must be set or activated");
        return executeFnAfterMs(normalSummon);
      }

      putMonsterCardOnField(ACTUAL_PLAYER, cardInHand);
      removeCardFromHand(ACTUAL_PLAYER, playerChoice);

      waitBeforeLoop();
    },
  );
}

function setMonsterCardOnField(card, cardPosition) {
  let canSetMonster = gameState[ACTUAL_PLAYER].monsters.length < 5 && !gameState[ACTUAL_PLAYER].normalSummoned;

  if (!canSetMonster) {
    console.log("Field monsters card zones are full, you can't set.");
    return setMonsterCardOnField;
  }

  card.setPosition(POSITIONS.DEFENSE);
  card.setVisibility(VISIBILITY.FACE_DOWN);
  card.setZone(ZONES.MONSTER_ZONE);

  gameState[ACTUAL_PLAYER].monsters.push(card);
  gameState[ACTUAL_PLAYER].normalSummoned = true; //change to true for forbid a new normal summon (only one for player turn)

  removeCardFromHand(ACTUAL_PLAYER, cardPosition);

  console.log(
    `Setting ${card.getName()} face down in defense position on monsters cards zone`,
  );

  waitBeforeLoop();
}

function setSupportCardOnField(card, cardPosition) {
  let canSetSupport = gameState[ACTUAL_PLAYER].supports.length < 5;

  if (!canSetSupport) {
    console.log("Field spell and trap card zones are full, you can't set.");
    return setSupportCardOnField
  }

  card.setVisibility(VISIBILITY.FACE_DOWN);
  card.setZone(ZONES.SUPPORT_ZONE);

  gameState[ACTUAL_PLAYER].supports.push(card);

  removeCardFromHand(ACTUAL_PLAYER, cardPosition);

  console.log(
    `Setting ${card.getName()} face down on spell and trap cards zone`,
  );

  waitBeforeLoop();
}

function setCard() {
  console.clear();

  showHand(gameState);

  rl.question(
    "Which card do you want to set? (0 for turn back) > ",
    (answer) => {
      if (answer === "0") {
        return gameLoop();
      }

      let cardPosition = answer - 1;
      let cardInHand = gameState[ACTUAL_PLAYER].hand[cardPosition];
      let cardType = cardInHand.getType();

      if (cardType === CARD_TYPES.MONSTER) {
        setMonsterCardOnField(cardInHand, cardPosition);
      } else {
        setSupportCardOnField(cardInHand, cardPosition);
      }
    },
  );
}

function battle(){
  rl.question(
    "Battle! Choose one of your monster (number) and one opponent monster (number), if the opponent have no monsters on the field you can attack directly, e. g., [1 2] (without []) (0 for turn back) > ",
    (answer) => {
      if (answer === "0") {
              return gameLoop();
            }

      console.log(answer)

      let opponent = ACTUAL_PLAYER === "p1" ? "p2" : "p1"

      let [playerMonster, opponentMonster] = answer.split(" ")

      let attackingMonster = gameState[ACTUAL_PLAYER].monsters[playerMonster - 1]

      let targetMonster   = gameState[opponent].monsters[opponentMonster - 1]

      if(attackingMonster.getAlreadyAttacked()){
        console.log("This monster already attacked in this turn")
        return executeFnAfterMs(battle)
      }

      if(attackingMonster.getPosition() !== POSITIONS.ATTACK){
        console.log("Only monsters in attack position can attack")
        return executeFnAfterMs(battle)
      }

      console.log(`${attackingMonster.getName()} attacking ${targetMonster.getName()} !`)

      let damage

      if(targetMonster.getPosition() === POSITIONS.ATTACK){
        if(attackingMonster.getAtk() > targetMonster.getAtk()){
          damage = attackingMonster.getAtk() - targetMonster.getAtk()
          gameState[opponent].lp -= damage
          console.log(`The monster ${targetMonster.getName()} was destroyed and sent to graveyard`)
          let destroyedMonster = gameState[opponent].monsters.splice(opponentMonster - 1,1)
          gameState[opponent].graveyard.push(destroyedMonster)
          attackingMonster.setAlreadyAttacked()
          return waitBeforeLoop()
        }

        if(attackingMonster.getAtk() === targetMonster.getAtk()){
          console.log(`The monsters atks draw, both are destroyed and sent to graveyard `)
          let destroyedMonster = gameState[opponent].monsters.splice(opponentMonster - 1,1)
          gameState[opponent].graveyard.push(destroyedMonster)

          destroyedMonster = gameState[ACTUAL_PLAYER].monsters.splice(attackingMonster - 1,1)
          gameState[ACTUAL_PLAYER].graveyard.push(destroyedMonster)
          
          attackingMonster.setAlreadyAttacked()
          return waitBeforeLoop()
        }

        if(attackingMonster.getAtk() < targetMonster.getAtk()){
          damage = targetMonster.getAtk() - attackingMonster.getAtk()
          gameState[ACTUAL_PLAYER].lp -= damage
          console.log(`You monster ${attackingMonster.getName()} have less atk than ${targetMonster.getName()} and was destroyed and sent to graveyard`)
          let destroyedMonster = gameState[ACTUAL_PLAYER].monsters.splice(attackingMonster - 1,1)
          gameState[ACTUAL_PLAYER].graveyard.push(destroyedMonster)
          attackingMonster.setAlreadyAttacked()
          return waitBeforeLoop()
        }
      }

      if(targetMonster.getPosition() === POSITIONS.DEFENSE){
        if(attackingMonster.getAtk() > targetMonster.getDef()){
          console.log(`The monster ${targetMonster.getName()} was destroyed and sent to graveyard`)
          let destroyedMonster = gameState[opponent].monsters.splice(opponentMonster - 1,1)
          gameState[opponent].graveyard.push(destroyedMonster)
          attackingMonster.setAlreadyAttacked()
          return waitBeforeLoop()
        }

        if(attackingMonster.getAtk() === targetMonster.getDef()){
          console.log(`The monster ${targetMonster.getName()} atk draw whit ${targetMonster.getName()} defense, nothing happens`)
          attackingMonster.setAlreadyAttacked()
          return waitBeforeLoop()
        }

        if(attackingMonster.getAtk() < targetMonster.getDef()){
          damage = targetMonster.getDef() - attackingMonster.getAtk()
          gameState[ACTUAL_PLAYER].lp -= damage
          console.log(`You monster ${attackingMonster.getName()} have less atk than ${targetMonster.getName()} defense and the difference between then will be substract in you life points.`)
          attackingMonster.setAlreadyAttacked()
          return waitBeforeLoop()
        }
      }
    }
  )
}

function handleGameOptions(opt) {
  let options = getMenuOptions(gameState);

  if (opt > options.length) {
    console.log("Opção inválida");
    gameLoop();
    return;
  }

  let playerChoice = options[opt - 1].type;

  switch (playerChoice) {
    case DUEL_ACTIVITIES.NORMAL_SUMMON.type:
      return normalSummon();

    case DUEL_ACTIVITIES.SET.type:
      return setCard();

    case DUEL_ACTIVITIES.ATTACK.type:
      return battle();      

    case DUEL_ACTIVITIES.ACTIVE.type:
      console.log(DUEL_ACTIVITIES.ACTIVE.text);
      break;

    case DUEL_ACTIVITIES.NEXT_PHASE.type:
      nextPhase();
	  gameLoop()
      break;

    default:
      console.log("Escolha errada");
      break;
  }
}

function gameLoop() {
  console.clear()

  handlePhases(gameState)

  showBoard(gameState);

  showHand(gameState);

  showMenu(gameState);

  rl.question("> ", handleGameOptions);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//let game = true

gameStart();

gameLoop();

// console.log("Hand:", gameState[ACTUAL_PLAYER].hand)
// console.log("Monsters zone:", gameState[ACTUAL_PLAYER].monsters)
// console.log("Supports zone:", gameState[ACTUAL_PLAYER].supports)
