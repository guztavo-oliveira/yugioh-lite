import Phaser from "phaser";
import { advancePhase, handlePhase, normalSummon, setCard } from "../../engine.js";
import { CARD_TYPES, DUEL_PHASES, DUEL_PHASES_FLOW, VISIBILITY } from "../../utils/constants.js";

const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;
const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;
const CARD_GAP = 28;
const CARD_TEXTURES = {
  "Blue-Eyes White Dragon": "blue-eyes",
  "La Jinn the Mystical Genie of the Lamp": "la-jinn",
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
    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x07141d);
    this.renderBoard();
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
      console.log(card)
      if (card) this.renderCard(card, cardX, y, owner !== this.state.currentTurnPlayer);
    }
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
      normalSummon(this.state, player, handIndex);
      this.scene.restart();
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
      this.addActionButton("Activate (soon)", x - 7, y - 46, null, true);
    }

    this.addActionButton("Set", x + CARD_WIDTH, y - 46, () => {
      setCard(this.state, player, handIndex);
      this.scene.restart();
    });
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
