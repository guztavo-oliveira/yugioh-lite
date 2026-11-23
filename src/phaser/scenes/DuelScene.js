import Phaser from "phaser";
import {
  advancePhase,
  activateSpell,
  activateSetSpell,
  activateTrap,
  createGameState,
  declareAttack,
  getEligibleTraps,
  getOpponent,
  handlePhase,
  normalSummon,
  resolveBattle,
  resolveSpell,
  resolveTrap,
  setCard,
  startDuel,
} from "../../engine.js";
import { CARD_TYPES, DUEL_PHASES, DUEL_PHASES_FLOW, POSITIONS, VISIBILITY } from "../../utils/constants.js";

const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;
const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;
const CARD_GAP = 28;
const CARD_TEXTURES = {
  "Blue-Eyes White Dragon": "blue-eyes",
  "La Jinn the Mystical Genie of the Lamp": "la-jinn",
  "Dark Magician": "dark_magician",
  "Summoned Skull": "summoned_skull",
  "Darkfire Soldier #1": "darkfire_soldier_1",
  "Feral Imp": "feral_imp",
  "Mystic Elf": "mystical_elf",
  "Dark Hole": "dark_hole",
  "Monster Reborn": "monster_reborn",
  "Raigeki": "raigeki",
  "Pot of Greed": "pot_of_greed",
  "Trap Hole": "trap_hole",
  "Mirror Force": "mirror_force",
  "Magic Cylinder": "magic_cylinder",
  "Torrential Tribute": "torrential_tribute"
};

export class DuelScene extends Phaser.Scene {
  constructor() {
    super("duel");
  }

  create() {
    this.state = this.registry.get("gameState");
    this.selectedHandCard = null;
    this.selectedHandIndex = null;
    this.actionMenu = [];
    this.targetModal = [];
    this.responseModal = [];
    this.selectedAttackerIndex = this.registry.get("selectedAttackerIndex") ?? null;
    this.attackArrow = null;
    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x07141d);
    this.renderBoard();
    this.resolvePendingSpell();
    this.resolvePendingTrap();
    this.showPendingTrapResponse();
  }

  resolvePendingSpell() {
    const pendingSpell = this.registry.get("pendingSpellResolution");
    if (!pendingSpell) return;

    this.time.delayedCall(650, () => {
      resolveSpell(
        this.state,
        pendingSpell.player,
        pendingSpell.supportIndex,
        pendingSpell.target,
      );
      this.registry.set("pendingSpellResolution", null);
      this.scene.restart();
    });
  }

  resolvePendingTrap() {
    const pendingTrap = this.registry.get("pendingTrapResolution");
    if (!pendingTrap) return;

    this.time.delayedCall(650, () => {
      resolveTrap(
        this.state,
        pendingTrap.player,
        pendingTrap.supportIndex,
        pendingTrap.event,
      );
      this.registry.set("pendingTrapResolution", null);
      this.scene.restart();
    });
  }

  beginTrapResponse(event) {
    const responders = event.type === "MONSTER_SUMMONED"
      ? [event.player, getOpponent(event.player)]
      : [event.opponent];
    this.registry.set("pendingTrapResponse", { event, responders, responderIndex: 0 });
    this.scene.restart();
  }

  showPendingTrapResponse() {
    const pendingResponse = this.registry.get("pendingTrapResponse");
    if (!pendingResponse || this.registry.get("pendingTrapResolution")) return;

    const { event, responders } = pendingResponse;
    let responderIndex = pendingResponse.responderIndex;
    while (responderIndex < responders.length) {
      const player = responders[responderIndex];
      const traps = getEligibleTraps(this.state, player, event);
      if (traps.length > 0) {
        this.showTrapResponseModal(player, traps, () => {
          pendingResponse.responderIndex = responderIndex + 1;
          this.registry.set("pendingTrapResponse", pendingResponse);
          this.scene.restart();
        }, (supportIndex) => {
          const result = activateTrap(this.state, player, supportIndex, event);
          if (!result.ok) return;
          this.registry.set("pendingTrapResponse", null);
          this.registry.set("pendingTrapResolution", {
            event,
            player,
            supportIndex: result.supportIndex,
          });
          this.scene.restart();
        });
        return;
      }
      responderIndex++;
    }

    this.registry.set("pendingTrapResponse", null);
    if (event.type === "ATTACK_DECLARED") resolveBattle(this.state, event);
    this.scene.restart();
  }

  renderBoard() {
    const { currentTurnPlayer, phase, turn } = this.state;
    const opponent = currentTurnPlayer === "p1" ? "p2" : "p1";

    this.renderPlaymat();
    this.renderPlayerPanel(opponent, currentTurnPlayer, turn, phase);
    this.renderPiles(opponent, currentTurnPlayer);
    this.renderOpponentHand(opponent);

    this.renderPhaseControls();
    this.renderZone("OPPONENT SPELL / TRAP", 615, 160, this.state[opponent].supports, opponent);
    this.renderZone("OPPONENT MONSTERS", 615, 340, this.state[opponent].monsters, opponent);
    this.renderZone("YOUR MONSTERS", 615, 570, this.state[currentTurnPlayer].monsters, currentTurnPlayer);
    this.renderZone("YOUR SPELL / TRAP", 615, 750, this.state[currentTurnPlayer].supports, currentTurnPlayer);
    this.renderHand(this.state[currentTurnPlayer]);
  }

  renderPlaymat() {
    this.add.rectangle(975, 515, 1150, 900, 0x153447).setStrokeStyle(5, 0x8aa5b5);
    this.add.image(975, 515, "playmat")
      .setDisplaySize(1140, 890)
      .setTint(0x4d6f82)
      .setAlpha(0.18);
    this.add.rectangle(975, 525, 960, 8, 0xd5b362, 0.7);
    this.add.text(975, 94, "OPPONENT FIELD", this.labelStyle(18)).setOrigin(0.5);
    this.add.text(975, 920, "YOUR FIELD", this.labelStyle(18)).setOrigin(0.5);
  }

  renderPlayerPanel(opponent, player, turn, phase) {
    this.add.rectangle(200, 515, 330, 900, 0x102637).setStrokeStyle(4, 0x8aa5b5);
    this.add.text(200, 115, "DUEL STATUS", this.labelStyle(26)).setOrigin(0.5);
    this.add.line(45, 150, 25, 0, 305, 0, 0x8aa5b5, 0.8);

    this.add.text(65, 185, "OPPONENT", this.labelStyle(20));
    this.add.text(65, 225, `LP  ${this.state[opponent].lp}`, this.labelStyle(30));
    this.add.text(65, 275, `Deck: ${this.state[opponent].deck.length}`, this.labelStyle(18));
    this.add.text(65, 305, `Graveyard: ${this.state[opponent].graveyard.length}`, this.labelStyle(18));

    this.add.line(45, 445, 25, 0, 305, 0, 0x8aa5b5, 0.8);
    this.add.text(65, 485, "YOUR TURN", this.labelStyle(20));
    this.add.text(65, 525, `LP  ${this.state[player].lp}`, this.labelStyle(30));
    this.add.text(65, 575, `Deck: ${this.state[player].deck.length}`, this.labelStyle(18));
    this.add.text(65, 605, `Graveyard: ${this.state[player].graveyard.length}`, this.labelStyle(18));

    this.add.line(45, 735, 25, 0, 305, 0, 0x8aa5b5, 0.8);
    this.add.text(65, 775, `TURN ${turn}`, this.labelStyle(22));
    this.add.text(65, 815, `PHASE: ${phase.replace("_", " ")}`, this.labelStyle(18));
    this.addRestartDuelButton();
  }

  addRestartDuelButton() {
    const x = 200;
    const y = 870;
    const button = this.add.rectangle(x, y, 235, 48, 0x991b1b)
      .setStrokeStyle(3, 0xfef3c7)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, "RESTART DUEL", {
      color: "#fef3c7",
      fontSize: "18px",
      fontStyle: "bold",
    }).setOrigin(0.5);

    button.on("pointerdown", () => this.restartDuel());
    text.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.restartDuel());
  }

  restartDuel() {
    const state = createGameState();
    startDuel(state);
    handlePhase(state);
    this.registry.set("gameState", state);
    this.registry.set("selectedAttackerIndex", null);
    this.registry.set("pendingTrapResponse", null);
    this.registry.set("pendingTrapResolution", null);
    this.scene.restart();
  }

  renderPiles(opponent, player) {
    this.renderPile("OPPONENT DECK", 1445, 250, this.state[opponent].deck.length);
    this.renderPile("OPPONENT GRAVE", 1445, 445, this.state[opponent].graveyard.length);
    this.renderPile("YOUR GRAVE", 1445, 650, this.state[player].graveyard.length);
    this.renderPile("YOUR DECK", 1445, 845, this.state[player].deck.length);
  }

  renderPile(label, x, y, count) {
    this.add.rectangle(x, y, 126, 166, 0x0b1f2c).setStrokeStyle(3, 0x8aa5b5);
    this.add.image(x, y - 9, "card-back").setDisplaySize(78, 108);
    this.add.text(x, y + 65, `${label}\n${count}`, {
      color: "#f8fafc",
      fontSize: "12px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5);
  }

  renderOpponentHand(opponent) {
    const cards = this.state[opponent].hand.slice(0, 5);
    const startX = 760;
    cards.forEach((card, index) => {
      this.add.image(startX + index * 98, 105, "card-back").setDisplaySize(74, 104);
    });
    this.add.text(600, 96, `HAND (${this.state[opponent].hand.length})`, this.labelStyle(14));
  }

  renderPhaseControls() {
    const startX = 758;
    const y = 525;
    const currentPhaseIndex = DUEL_PHASES_FLOW.indexOf(this.state.phase);

    DUEL_PHASES_FLOW.forEach((phase, index) => {
      const x = startX + index * 86;
      const isCurrentPhase = phase === this.state.phase;
      const isForwardPhase = index > currentPhaseIndex;
      const phaseButton = this.add.rectangle(
        x,
        y,
        72,
        32,
        isCurrentPhase ? 0xfbbf24 : isForwardPhase ? 0x991b1b : 0x172554,
      )
        .setStrokeStyle(2, 0xfef3c7);
      const phaseText = this.add.text(x, y, phase.replace("_", " "), {
        color: isCurrentPhase ? "#1f2937" : "#fef3c7",
        fontSize: "12px",
        fontStyle: "bold",
      }).setOrigin(0.5);

      if (isForwardPhase) {
        phaseButton.setInteractive({ useHandCursor: true });
        phaseText.setInteractive({ useHandCursor: true });
        phaseButton.on("pointerdown", () => this.advanceToPhase(phase));
        phaseText.on("pointerdown", () => this.advanceToPhase(phase));
      }
    });
  }

  advanceToPhase(targetPhase) {
    this.registry.set("selectedAttackerIndex", null);
    if (targetPhase === DUEL_PHASES.END) {
      while (this.state.phase !== DUEL_PHASES.MAIN_2) advancePhase(this.state);
      advancePhase(this.state);
    } else {
      while (this.state.phase !== targetPhase) advancePhase(this.state);
    }

    handlePhase(this.state);
    this.scene.restart();
  }

  renderZone(label, x, y, cards, owner) {
    this.add.text(x, y - 26, label, this.labelStyle(15));

    for (let index = 0; index < 5; index++) {
      const card = cards[index];
      const cardX = x + index * (CARD_WIDTH + CARD_GAP);
      this.add.rectangle(cardX + CARD_WIDTH / 2, y + CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 0x0c202c, 0.85)
        .setStrokeStyle(3, 0x8aa5b5, 0.8);
      if (card && [CARD_TYPES.SPELL, CARD_TYPES.TRAP].includes(card.getType())) {
        this.renderCard(card, cardX, y, owner !== this.state.currentTurnPlayer);
      } else if (card) {
        this.renderCard(card, cardX, y, false)
      };

      if (card && card.getType() === CARD_TYPES.SPELL) {
        this.addSetSpellActivation(card, cardX, y, index, owner);
      }

      if (card && card.getType() === CARD_TYPES.MONSTER && this.state.phase === DUEL_PHASES.BATTLE) {
        this.addBattleTarget(card, cardX, y, index, owner);
      }
    }
  }

  addSetSpellActivation(card, x, y, supportIndex, owner) {
    const isMainPhase = this.state.phase === DUEL_PHASES.MAIN_1
      || this.state.phase === DUEL_PHASES.MAIN_2;
    if (owner !== this.state.currentTurnPlayer || !isMainPhase || this.registry.get("pendingSpellResolution")) {
      return;
    }

    const activationArea = this.add.zone(
      x + CARD_WIDTH / 2,
      y + CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
    ).setInteractive({ useHandCursor: true }).setDepth(5);

    activationArea.on("pointerdown", () => {
      this.clearActionMenu();
      if (card.getEffect() === "SPECIAL_SUMMON_FROM_GRAVEYARD") {
        this.showSetMonsterRebornTargets(owner, supportIndex);
        return;
      }
      this.addActionButton("Activate", x + CARD_WIDTH / 2, y - 25, () => {
        this.activateSetSpell(owner, supportIndex);
      });
    });
  }

  addBattleTarget(card, x, y, index, owner) {
    if (this.state.turn === 1) return;

    const ownerIsCurrentPlayer = owner === this.state.currentTurnPlayer;
    if (ownerIsCurrentPlayer && this.selectedAttackerIndex === index) {
      this.add.rectangle(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2, CARD_WIDTH + 10, CARD_HEIGHT + 10, 0, 0)
        .setStrokeStyle(5, 0xfbbf24)
        .setDepth(4);
    }
    const targetArea = this.add.zone(
      x + CARD_WIDTH / 2,
      y + CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
    ).setInteractive({ useHandCursor: true }).setDepth(5);

    if (ownerIsCurrentPlayer) {
      targetArea.on("pointerdown", () => {
        const canAttack = card.getVisibility() === VISIBILITY.FACE_UP
          && card.getPosition() === POSITIONS.ATTACK
          && !card.getAlreadyAttacked();
        if (!canAttack) return;

        this.selectedAttackerIndex = this.selectedAttackerIndex === index ? null : index;
        this.registry.set("selectedAttackerIndex", this.selectedAttackerIndex);
        this.scene.restart();
      });
      return;
    }

    targetArea.on("pointerover", () => {
      if (this.selectedAttackerIndex !== null) this.drawAttackArrow(index);
    });
    targetArea.on("pointerout", () => {
      if (this.attackArrow) {
        this.attackArrow.clear();
        this.attackArrow = null;
      }
    });
    targetArea.on("pointerdown", () => {
      if (this.selectedAttackerIndex === null) return;

      const attackerIndex = this.selectedAttackerIndex;
      this.drawAttackArrow(index);
      const result = declareAttack(this.state, this.state.currentTurnPlayer, attackerIndex, index);
      this.selectedAttackerIndex = null;
      this.registry.set("selectedAttackerIndex", null);
      if (!result.ok) {
        this.time.delayedCall(650, () => this.scene.restart());
        return;
      }
      this.beginTrapResponse(result.event);
    });
  }

  drawAttackArrow(targetIndex) {
    if (this.attackArrow) this.attackArrow.destroy();

    const attackerX = 665 + this.selectedAttackerIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
    const attackerY = 570 + CARD_HEIGHT / 2;
    const targetX = 665 + targetIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
    const targetY = 340 + CARD_HEIGHT / 2;
    const angle = Phaser.Math.Angle.Between(attackerX, attackerY, targetX, targetY);
    const arrowLength = 24;
    const leftX = targetX - arrowLength * Math.cos(angle - Math.PI / 6);
    const leftY = targetY - arrowLength * Math.sin(angle - Math.PI / 6);
    const rightX = targetX - arrowLength * Math.cos(angle + Math.PI / 6);
    const rightY = targetY - arrowLength * Math.sin(angle + Math.PI / 6);

    this.attackArrow = this.add.graphics().setDepth(15);
    this.attackArrow.lineStyle(8, 0xff3b30, 0.95);
    this.attackArrow.lineBetween(attackerX, attackerY - 70, targetX, targetY + 70);
    this.attackArrow.fillStyle(0xff3b30, 1);
    this.attackArrow.fillTriangle(targetX, targetY + 70, leftX, leftY + 70, rightX, rightY + 70);
  }

  renderHand(player) {
    const cards = player.hand.slice(0, 5);
    const startX = 665;
    const y = 925;
    this.add.text(startX, y - 25, "YOUR HAND", this.labelStyle(16));
    cards.forEach((card, index) => {
      this.renderCard(card, startX + index * (CARD_WIDTH + CARD_GAP), y, false, true, index);
    });
  }

  renderCard(card, x, y, hidden, isSelectable = false, handIndex = null) {
    const faceDown = hidden || card.getVisibility() === VISIBILITY.FACE_DOWN;
    const texture = faceDown ? "card-back" : CARD_TEXTURES[card.getName()];
    const cardObjects = [];

    if (texture) {
      cardObjects.push(
        this.add.image(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2, texture)
          .setDisplaySize(CARD_WIDTH, CARD_HEIGHT),
      );
    } else {
      cardObjects.push(
        this.add.rectangle(x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 0xf1e0a7)
          .setStrokeStyle(2, 0x362b1d),
      );
      const details = card.getType() === CARD_TYPES.MONSTER
        ? `\nATK ${card.getAtk()} / DEF ${card.getDef()}`
        : "";
      cardObjects.push(this.add.text(x + 7, y + 12, `${card.getName()}${details}`, {
        color: "#1f2937",
        fontSize: "12px",
        wordWrap: { width: CARD_WIDTH - 14 },
      }));
    }

    if (isSelectable) {
      const selectionBorder = this.add.rectangle(
        x + CARD_WIDTH / 2,
        y + CARD_HEIGHT / 2,
        CARD_WIDTH + 6,
        CARD_HEIGHT + 6,
        0x000000,
        0,
      ).setStrokeStyle(4, 0xfbbf24).setVisible(false);
      cardObjects.push(selectionBorder);
      this.addHandHoverArea(x, y, card, cardObjects, selectionBorder, handIndex);
    }
  }

  addHandHoverArea(x, y, card, cardObjects, selectionBorder, handIndex) {
    const restingPositions = cardObjects.map((cardObject) => cardObject.y);
    const hoverArea = this.add.zone(
      x + CARD_WIDTH / 2,
      y + CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
    ).setInteractive({ useHandCursor: true });

    hoverArea.on("pointerover", () => {
      this.moveHandCard(cardObjects, restingPositions, -18, "Sine.Out");
      if (this.selectedHandIndex !== handIndex) this.clearActionMenu();
    });

    hoverArea.on("pointerout", () => {
      this.moveHandCard(cardObjects, restingPositions, 0, "Sine.In");
    });

    hoverArea.on("pointerdown", () => {
      this.selectHandCard(selectionBorder, handIndex);
      card.getType() === CARD_TYPES.MONSTER 
      ? this.showMonsterActions(card, x, y, handIndex)
      : this.showSupportActions(card, x, y, handIndex)
    });
  }

  selectHandCard(selectionBorder, handIndex) {
    if (this.selectedHandCard) this.selectedHandCard.setVisible(false);
    selectionBorder.setVisible(true);
    this.selectedHandCard = selectionBorder;
    this.selectedHandIndex = handIndex;
  }

  showMonsterActions(card, x, y, handIndex) {
    this.clearActionMenu();

    const player = this.state.currentTurnPlayer;
    const isMainPhase = this.state.phase === DUEL_PHASES.MAIN_1
      || this.state.phase === DUEL_PHASES.MAIN_2;
    const canNormalSummon = isMainPhase && !this.state[player].normalSummoned;

    if (card.getType() !== CARD_TYPES.MONSTER || !canNormalSummon) return;

    this.addActionButton("Normal Summon", x - 7, y - 46, () => {
      const result = normalSummon(this.state, player, handIndex);
      if (!result.ok) return;
      this.beginTrapResponse(result.event);
    });
    this.addActionButton("Set", x + CARD_WIDTH, y - 46, () => {
      setCard(this.state, player, handIndex);
      this.scene.restart();
    });
  }

  showSupportActions(card, x, y, handIndex) {
    this.clearActionMenu();

    const player = this.state.currentTurnPlayer;
    const isMainPhase = this.state.phase === DUEL_PHASES.MAIN_1
      || this.state.phase === DUEL_PHASES.MAIN_2;

    if (!isMainPhase || ![CARD_TYPES.SPELL, CARD_TYPES.TRAP].includes(card.getType())) {
      return;
    }

    if (card.getType() === CARD_TYPES.SPELL) {
      this.addActionButton("Activate", x - 7, y - 46, () => {
        if (card.getEffect() === "SPECIAL_SUMMON_FROM_GRAVEYARD") {
          this.showMonsterRebornTargets(handIndex);
          return;
        }
        this.activateSpellFromHand(player, handIndex);
      });
    }

    this.addActionButton("Set", x + CARD_WIDTH, y - 46, () => {
      setCard(this.state, player, handIndex);
      this.scene.restart();
    });
  }

  showMonsterRebornTargets(handIndex) {
    this.showMonsterRebornTargetModal((target) => {
      this.activateSpellFromHand(this.state.currentTurnPlayer, handIndex, target);
    });
  }

  showSetMonsterRebornTargets(player, supportIndex) {
    this.showMonsterRebornTargetModal((target) => {
      this.activateSetSpell(player, supportIndex, target);
    });
  }

  showMonsterRebornTargetModal(onSelect) {
    this.clearActionMenu();
    this.clearTargetModal();
    const targets = ["p1", "p2"].flatMap((owner) => (
      this.state[owner].graveyard.map((card, graveyardIndex) => ({ card, owner, graveyardIndex }))
    )).filter(({ card }) => card.getType() === CARD_TYPES.MONSTER);

    const overlay = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.68)
      .setInteractive({ useHandCursor: true })
      .setDepth(30);
    this.targetModal.push(overlay);
    overlay.on("pointerdown", () => this.clearTargetModal());

    if (targets.length === 0) {
      const message = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "No monster cards are available to revive.", {
        color: "#f8fafc",
        fontSize: "24px",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(32);
      this.targetModal.push(message);
      return;
    }

    const columns = Math.min(targets.length, 5);
    const rows = Math.ceil(targets.length / columns);
    const modalHeight = 110 + rows * 220;
    const panel = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 1540, modalHeight, 0x102637)
      .setStrokeStyle(4, 0xfbbf24)
      .setDepth(31);
    const title = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - modalHeight / 2 + 42, "MONSTER REBORN — CHOOSE A MONSTER", {
      color: "#fef3c7",
      fontSize: "24px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(32);
    this.targetModal.push(panel, title);

    targets.forEach(({ card, owner, graveyardIndex }, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const cardX = SCREEN_WIDTH / 2 - ((columns - 1) * 165) / 2 + column * 165;
      const cardY = SCREEN_HEIGHT / 2 - modalHeight / 2 + 165 + row * 220;
      this.renderMonsterRebornTarget(card, cardX, cardY, () => {
        onSelect({ player: owner, graveyardIndex });
      });
    });
  }

  renderMonsterRebornTarget(card, x, y, onSelect) {
    const texture = CARD_TEXTURES[card.getName()];
    const cardObjects = [];

    if (texture) {
      cardObjects.push(this.add.image(x, y, texture).setDisplaySize(130, 182));
    } else {
      cardObjects.push(this.add.rectangle(x, y, 130, 182, 0xf1e0a7).setStrokeStyle(3, 0x362b1d));
      cardObjects.push(this.add.text(x - 54, y - 68, `${card.getName()}\n\nATK ${card.getAtk()} / DEF ${card.getDef()}`, {
        color: "#1f2937",
        fontSize: "14px",
        wordWrap: { width: 108 },
      }));
    }

    cardObjects.forEach((cardObject) => cardObject.setDepth(32));
    const hoverBorder = this.add.rectangle(x, y, 138, 190, 0x000000, 0)
      .setStrokeStyle(4, 0xfbbf24)
      .setVisible(false)
      .setDepth(32);
    const targetArea = this.add.zone(x, y, 130, 182).setInteractive({ useHandCursor: true }).setDepth(33);
    targetArea.on("pointerdown", onSelect);
    targetArea.on("pointerover", () => hoverBorder.setVisible(true));
    targetArea.on("pointerout", () => hoverBorder.setVisible(false));
    this.targetModal.push(...cardObjects, hoverBorder, targetArea);
  }

  showTrapResponseModal(player, traps, onPass, onSelect) {
    this.clearResponseModal();
    const overlay = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.72)
      .setInteractive()
      .setDepth(30);
    const panel = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 980, 440, 0x102637)
      .setStrokeStyle(4, 0xfbbf24)
      .setDepth(31);
    const title = this.add.text(SCREEN_WIDTH / 2, 400, "TRAP RESPONSE", {
      color: "#fef3c7",
      fontSize: "26px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(32);
    const prompt = this.add.text(SCREEN_WIDTH / 2, 435, `${player === "p1" ? "PLAYER 1" : "PLAYER 2"}: choose a set trap or pass.`, {
      color: "#f8fafc",
      fontSize: "18px",
    }).setOrigin(0.5).setDepth(32);
    this.responseModal.push(overlay, panel, title, prompt);

    const startX = SCREEN_WIDTH / 2 - ((traps.length - 1) * 150) / 2;
    traps.forEach(({ card, supportIndex }, index) => {
      this.renderTrapResponseCard(card, startX + index * 150, 560, () => onSelect(supportIndex));
    });

    const passButton = this.add.rectangle(SCREEN_WIDTH / 2, 710, 150, 38, 0x475569)
      .setStrokeStyle(2, 0xfef3c7)
      .setInteractive({ useHandCursor: true })
      .setDepth(33);
    const passText = this.add.text(SCREEN_WIDTH / 2, 710, "PASS", {
      color: "#f8fafc",
      fontSize: "16px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(34);
    passButton.on("pointerdown", onPass);
    passText.setInteractive({ useHandCursor: true }).on("pointerdown", onPass);
    this.responseModal.push(passButton, passText);
  }

  renderTrapResponseCard(card, x, y, onSelect) {
    const texture = CARD_TEXTURES[card.getName()];
    const cardObjects = [];
    if (texture) {
      cardObjects.push(this.add.image(x, y, texture).setDisplaySize(120, 168));
    } else {
      cardObjects.push(this.add.rectangle(x, y, 120, 168, 0xd8b4fe).setStrokeStyle(3, 0x581c87));
      cardObjects.push(this.add.text(x - 48, y - 45, card.getName(), {
        color: "#1f2937",
        fontSize: "14px",
        wordWrap: { width: 96 },
      }));
    }
    cardObjects.forEach((cardObject) => cardObject.setDepth(32));
    const hoverBorder = this.add.rectangle(x, y, 128, 176, 0x000000, 0)
      .setStrokeStyle(4, 0xfbbf24)
      .setVisible(false)
      .setDepth(32);
    const targetArea = this.add.zone(x, y, 120, 168).setInteractive({ useHandCursor: true }).setDepth(33);
    targetArea.on("pointerdown", onSelect);
    targetArea.on("pointerover", () => hoverBorder.setVisible(true));
    targetArea.on("pointerout", () => hoverBorder.setVisible(false));
    this.responseModal.push(...cardObjects, hoverBorder, targetArea);
  }

  activateSpellFromHand(player, handIndex, target = null) {
    const result = activateSpell(this.state, player, handIndex);
    if (!result.ok) return;

    this.registry.set("pendingSpellResolution", {
      player,
      supportIndex: result.supportIndex,
      target,
    });
    this.scene.restart();
  }

  activateSetSpell(player, supportIndex, target = null) {
    const result = activateSetSpell(this.state, player, supportIndex);
    if (!result.ok) return;

    this.registry.set("pendingSpellResolution", {
      player,
      supportIndex: result.supportIndex,
      target,
    });
    this.scene.restart();
  }

  addActionButton(label, x, y, onClick, disabled = false) {
    const button = this.add.rectangle(x, y, 100, 30, disabled ? 0x475569 : 0x172554)
      .setStrokeStyle(2, 0xfbbf24)
      .setDepth(20);
    const text = this.add.text(x, y, label, {
      color: disabled ? "#cbd5e1" : "#fef3c7",
      fontSize: "12px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(21);

    if (!disabled) button.setInteractive({ useHandCursor: true }).on("pointerdown", onClick);
    this.actionMenu.push(button, text);
  }

  clearActionMenu() {
    this.actionMenu.forEach((item) => item.destroy());
    this.actionMenu = [];
  }

  clearTargetModal() {
    this.targetModal.forEach((item) => item.destroy());
    this.targetModal = [];
  }

  clearResponseModal() {
    this.responseModal.forEach((item) => item.destroy());
    this.responseModal = [];
  }

  moveHandCard(cardObjects, restingPositions, offset, ease) {
    cardObjects.forEach((cardObject, index) => {
      this.tweens.killTweensOf(cardObject);
      this.tweens.add({
        targets: cardObject,
        y: restingPositions[index] + offset,
        duration: 120,
        ease,
      });
    });
  }

  labelStyle(fontSize = 18) {
    return { color: "#f8fafc", fontSize: `${fontSize}px`, fontStyle: "bold" };
  }
}
