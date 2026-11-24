import Phaser from "phaser";
import {
  advancePhase,
  activateSpell,
  activateSetSpell,
  activateTrap,
  addGameLog,
  checkWinCondition,
  createGameState,
  declareAttack,
  flipSummon,
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
const CARD_GAP = 45;
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
    this.selectedCardPreview = this.registry.get("selectedCardPreview") ?? null;
    this.selectedAttackerIndex = this.registry.get("selectedAttackerIndex") ?? null;
    this.attackArrow = null;
    this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x07141d);
    this.renderBoard();

    const winner = checkWinCondition(this.state);
    if (winner) {
      this.showGameOverModal(winner);
      return;
    }

    this.resolvePendingSpell();
    this.resolvePendingTrap();
    this.showPendingTrapResponse();
  }

  showGameOverModal(winner) {
    const overlay = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.82)
      .setInteractive()
      .setDepth(50);

    const panel = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 700, 380, 0x102637)
      .setStrokeStyle(5, 0xfbbf24)
      .setDepth(51);

    const isDraw = winner === "DRAW";
    const headerText = isDraw ? "DUEL DRAW!" : (winner === "p1" ? "PLAYER 1 WON!" : "PLAYER 2 WON!");
    const headerColor = isDraw ? "#94a3b8" : "#fbbf24";

    const title = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 100, headerText, {
      color: headerColor,
      fontSize: "44px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(52);

    const reason = this.state.winReason || (isDraw ? "Both players reached 0 LP." : `${winner === "p1" ? "Player 1" : "Player 2"} wins the duel!`);
    const subtitle = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 25, reason, {
      color: "#f8fafc",
      fontSize: "20px",
      align: "center",
      wordWrap: { width: 600 },
    }).setOrigin(0.5).setDepth(52);

    const playAgainBtn = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 80, 240, 52, 0x15803d)
      .setStrokeStyle(3, 0xfef3c7)
      .setInteractive({ useHandCursor: true })
      .setDepth(52);

    const playAgainText = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 80, "PLAY AGAIN", {
      color: "#fef3c7",
      fontSize: "22px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(53);

    playAgainBtn.on("pointerdown", () => this.restartDuel());
    playAgainText.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.restartDuel());

    playAgainBtn.on("pointerover", () => playAgainBtn.setFillStyle(0x16a34a));
    playAgainBtn.on("pointerout", () => playAgainBtn.setFillStyle(0x15803d));
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
          addGameLog(this.state, `${player === "p1" ? "Player 1" : "Player 2"} passed their trap response.`);
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
    this.renderCardPreview();
    this.renderDuelLog();
    this.renderOpponentHand(opponent);

    this.renderPhaseControls();
    this.renderZone("OPPONENT SPELL / TRAP", 615, 160, this.state[opponent].supports, opponent);
    this.renderZone("OPPONENT MONSTERS", 615, 340, this.state[opponent].monsters, opponent, true);
    this.renderZone("YOUR MONSTERS", 615, 570, this.state[currentTurnPlayer].monsters, currentTurnPlayer);
    this.renderZone("YOUR SPELL / TRAP", 615, 750, this.state[currentTurnPlayer].supports, currentTurnPlayer);
    this.renderHand(this.state[currentTurnPlayer]);
  }

  renderPlaymat() {
    this.add.rectangle(1050, 515, 1000, 900, 0x153447).setStrokeStyle(5, 0x8aa5b5);
    this.add.image(1050, 515, "playmat")
      .setDisplaySize(990, 890)
      .setTint(0x4d6f82)
      .setAlpha(0.18);
    this.add.rectangle(1050, 525, 960, 8, 0xd5b362, 0.7);
    this.add.text(975, 94, "OPPONENT FIELD", this.labelStyle(18)).setOrigin(0.5);
    this.add.text(975, 920, "YOUR FIELD", this.labelStyle(18)).setOrigin(0.5);
  }

  renderPlayerPanel(opponent, player, turn, phase) {
    this.add.rectangle(1710, 259, 360, 390, 0x102637).setStrokeStyle(3, 0x8aa5b5);

    // Opponent status
    this.add.text(1545, 82, "OPPONENT", this.labelStyle(16));
    this.add.text(1545, 108, `LP  ${this.state[opponent].lp}`, this.labelStyle(24));

    this.add.line(1545, 150, 0, 0, 330, 0, 0x8aa5b5, 0.6).setOrigin(0, 0);

    // Player status
    this.add.text(1545, 168, "YOUR TURN", this.labelStyle(16));
    this.add.text(1545, 194, `LP  ${this.state[player].lp}`, this.labelStyle(24));

    this.add.line(1545, 236, 0, 0, 330, 0, 0x8aa5b5, 0.6).setOrigin(0, 0);

    // Turn & Phase
    this.add.text(1545, 254, `TURN ${turn}`, this.labelStyle(18));
    this.add.text(1545, 282, `PHASE: ${phase.replace("_", " ")}`, this.labelStyle(15));

    this.addRestartDuelButton();
  }

  addRestartDuelButton() {
    const x = 1710;
    const y = 390;
    const button = this.add.rectangle(x, y, 260, 42, 0x991b1b)
      .setStrokeStyle(2, 0xfef3c7)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, "RESTART DUEL", {
      color: "#fef3c7",
      fontSize: "16px",
      fontStyle: "bold",
    }).setOrigin(0.5);

    button.on("pointerdown", () => this.restartDuel());
    text.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.restartDuel());

    button.on("pointerover", () => button.setFillStyle(0xb91c1c));
    button.on("pointerout", () => button.setFillStyle(0x991b1b));
  }

  restartDuel() {
    const state = createGameState();
    startDuel(state);
    handlePhase(state);
    this.registry.set("gameState", state);
    this.registry.set("selectedAttackerIndex", null);
    this.registry.set("pendingTrapResponse", null);
    this.registry.set("pendingTrapResolution", null);
    this.registry.set("selectedCardPreview", null);
    this.scene.restart();
  }

  renderPiles(opponent, player) {
    this.renderPile("OPPONENT DECK", 1445, 205, this.state[opponent].deck.length);
    this.renderPile(
      "OPPONENT GRAVE",
      1445,
      400,
      this.state[opponent].graveyard.length,
      () => this.showGraveyardModal(opponent),
      this.state[opponent].graveyard.at(-1),
    );
    this.renderPile(
      "YOUR GRAVE",
      1445,
      650,
      this.state[player].graveyard.length,
      () => this.showGraveyardModal(player),
      this.state[player].graveyard.at(-1),
    );
    this.renderPile("YOUR DECK", 1445, 845, this.state[player].deck.length);
  }

  renderDuelLog() {
    const entries = this.state.log.slice(-14);
    this.add.rectangle(1710, 755, 360, 422, 0x102637).setStrokeStyle(3, 0x8aa5b5);
    this.add.text(1710, 565, "DUEL LOG", this.labelStyle(20)).setOrigin(0.5);
    this.add.text(1545, 590, entries.map((entry) => `• ${entry}`).join("\n") || "No actions yet.", {
      color: "#f8fafc",
      fontSize: "14px",
      wordWrap: { width: 330 },
      lineSpacing: 2,
    });
  }

  renderCardPreview() {
    const selection = this.selectedCardPreview;
    const panelObjects = this.cardPreviewObjects ?? [];
    panelObjects.forEach((object) => object.destroy());
    this.cardPreviewObjects = [];
    const addPreviewObject = (object) => {
      this.cardPreviewObjects.push(object);
      return object;
    };

    // Left panel: x: 285, y: 515, width: 480, height: 900 (spans x: 45 to x: 525)
    const panelCenterX = 285;
    const panelWidth = 480;
    const panelHeight = 900;
    addPreviewObject(this.add.rectangle(panelCenterX, 515, panelWidth, panelHeight, 0x102637).setStrokeStyle(4, 0x8aa5b5));

    if (!selection) {
      addPreviewObject(this.add.text(panelCenterX, 515, "Hover over a card to view its details.", {
        color: "#cbd5e1",
        fontSize: "20px",
        align: "center",
        wordWrap: { width: 380 },
      }).setOrigin(0.5));
      return;
    }

    const { card, owner } = selection;
    const isHiddenFromViewer = card.getVisibility() === VISIBILITY.FACE_DOWN
      && owner !== this.state.currentTurnPlayer;

    // Panel is at y = 515, height = 900 (spans y = 65 to y = 965).
    // Card with size 380x532: top edge at y = 84, bottom edge at y = 616 (well within y = 65).
    const cardWidth = 380;
    const cardHeight = 532;
    const cardCenterX = panelCenterX;
    const cardCenterY = 350;

    // Description box below card: spans y = 635 to y = 955 (height: 320, center: 795).
    const descBoxY = 795;
    const descBoxHeight = 320;
    const descBoxWidth = 450;

    if (isHiddenFromViewer) {
      addPreviewObject(this.add.image(cardCenterX, cardCenterY, "card-back").setDisplaySize(cardWidth, cardHeight));
      // Description box below card
      addPreviewObject(this.add.rectangle(panelCenterX, descBoxY, descBoxWidth, descBoxHeight, 0x0a1924).setStrokeStyle(2, 0x8aa5b5));
      addPreviewObject(this.add.text(panelCenterX, descBoxY - 80, "Face-Down Card", {
        color: "#fbbf24",
        fontSize: "22px",
        fontStyle: "bold",
      }).setOrigin(0.5));
      addPreviewObject(this.add.text(panelCenterX - descBoxWidth / 2 + 25, descBoxY - 20, "This card is face-down on the opponent's field.", {
        color: "#f8fafc",
        fontSize: "17px",
        wordWrap: { width: descBoxWidth - 50 },
      }));
      return;
    }

    const texture = CARD_TEXTURES[card.getName()];
    if (texture) {
      addPreviewObject(this.add.image(cardCenterX, cardCenterY, texture).setDisplaySize(cardWidth, cardHeight));
    } else {
      addPreviewObject(this.add.rectangle(cardCenterX, cardCenterY, cardWidth, cardHeight, 0xf1e0a7).setStrokeStyle(3, 0x362b1d));
      addPreviewObject(this.add.text(cardCenterX, cardCenterY, card.getName(), {
        color: "#1f2937",
        fontSize: "24px",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: cardWidth - 30 },
      }).setOrigin(0.5));
    }

    // Description box below the card
    addPreviewObject(this.add.rectangle(panelCenterX, descBoxY, descBoxWidth, descBoxHeight, 0x0a1924).setStrokeStyle(2, 0x8aa5b5));

    const contentLeft = panelCenterX - descBoxWidth / 2 + 20;

    // Card Name
    addPreviewObject(this.add.text(contentLeft, descBoxY - descBoxHeight / 2 + 16, card.getName(), {
      color: "#fef3c7",
      fontSize: "21px",
      fontStyle: "bold",
      wordWrap: { width: descBoxWidth - 40 },
    }));

    // Card Subtitle (Type & ATK/DEF)
    let statsText = `[${card.getType()}]`;
    if (card.getType() === CARD_TYPES.MONSTER) {
      statsText += `   ATK ${card.getAtk()} / DEF ${card.getDef()}`;
    }
    addPreviewObject(this.add.text(contentLeft, descBoxY - descBoxHeight / 2 + 50, statsText, {
      color: "#fbbf24",
      fontSize: "16px",
      fontStyle: "bold",
    }));

    // Divider line
    addPreviewObject(this.add.line(contentLeft - 5, descBoxY - descBoxHeight / 2 + 76, 0, 0, descBoxWidth - 30, 0, 0x8aa5b5, 0.5).setOrigin(0, 0));

    // Description / Effect text
    addPreviewObject(this.add.text(contentLeft, descBoxY - descBoxHeight / 2 + 88, card.getDescription() || "No effect text.", {
      color: "#f8fafc",
      fontSize: "15px",
      lineSpacing: 4,
      wordWrap: { width: descBoxWidth - 40 },
    }));
  }

  renderPile(label, x, y, count, onClick = null, topCard = null) {
    const pile = this.add.container(x, y);
    pile.add(this.add.rectangle(0, 0, 126, 166, 0x0b1f2c).setStrokeStyle(3, 0x8aa5b5));

    const topCardTexture = topCard ? CARD_TEXTURES[topCard.getName()] : null;
    if (topCardTexture) {
      pile.add(this.add.image(0, -9, topCardTexture).setDisplaySize(78, 108));
    } else {
      pile.add(this.add.image(0, -9, "card-back").setDisplaySize(78, 108));
    }

    pile.add(this.add.text(0, 65, `${label}\n${count}`, {
      color: "#f8fafc",
      fontSize: "12px",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5));
    if (label.includes("GRAVE")) {
      const clickHandler = onClick || (() => this.showGraveyardModal(label.startsWith("YOUR") ? this.state.currentTurnPlayer : getOpponent(this.state.currentTurnPlayer)));
      pile.setInteractive(new Phaser.Geom.Rectangle(-63, -83, 126, 166), Phaser.Geom.Rectangle.Contains)
        .on("pointerdown", clickHandler);
    }
  }

  showGraveyardModal(owner) {
    this.clearTargetModal();
    const cards = this.state[owner].graveyard;
    const overlay = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.72)
      .setInteractive({ useHandCursor: true }).setDepth(30);
    this.targetModal.push(overlay);
    overlay.on("pointerdown", () => this.clearTargetModal());

    if (cards.length === 0) {
      const title = this.add.text(SCREEN_WIDTH / 2, 480, `${owner === "p1" ? "PLAYER 1" : "PLAYER 2"} GRAVEYARD\n\nThe Graveyard is empty.`, {
        color: "#fef3c7", fontSize: "24px", fontStyle: "bold", align: "center",
      }).setOrigin(0.5).setDepth(32);
      this.targetModal.push(title);
      return;
    }

    const modalHeight = 330;
    const panel = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 1540, modalHeight, 0x102637)
      .setStrokeStyle(4, 0xfbbf24)
      .setDepth(31);
    const title = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - modalHeight / 2 + 42, `${owner === "p1" ? "PLAYER 1" : "PLAYER 2"} GRAVEYARD`, {
      color: "#fef3c7",
      fontSize: "24px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(32);
    this.targetModal.push(panel, title);

    const viewportWidth = 1320;
    const cardSpacing = 165;
    const viewportLeft = SCREEN_WIDTH / 2 - viewportWidth / 2;
    const viewportRight = SCREEN_WIDTH / 2 + viewportWidth / 2;
    const viewportCenterY = SCREEN_HEIGHT / 2 + 18;
    const contentWidth = (cards.length - 1) * cardSpacing + 130;
    const maxOffset = Math.max(0, contentWidth - viewportWidth);
    const scrollState = { offset: 0, pointerX: undefined };
    const cardSlots = [];

    cards.forEach((card, index) => {
      const baseX = viewportLeft + index * cardSpacing + 65;
      const slot = this.renderGraveyardCard(card, baseX, viewportCenterY);
      cardSlots.push({ slot, baseX });
    });

    const updatePositions = () => {
      cardSlots.forEach(({ slot, baseX }) => {
        const x = baseX - scrollState.offset;
        slot.setX(x);
        slot.setVisible(x > viewportLeft - 65 && x < viewportRight + 65);
      });
    };
    updatePositions();

    const updateScrollOffset = (delta) => {
      scrollState.offset = Phaser.Math.Clamp(scrollState.offset + delta, 0, maxOffset);
      updatePositions();
    };

    const onWheel = (pointer, deltaX, deltaY) => {
      if (maxOffset === 0) return;
      if (pointer.x < viewportLeft || pointer.x > viewportRight) return;
      if (pointer.y < viewportCenterY - 105 || pointer.y > viewportCenterY + 105) return;
      updateScrollOffset(deltaY !== 0 ? deltaY : deltaX);
    };
    const onPointerDown = (pointer) => {
      if (pointer.x < viewportLeft || pointer.x > viewportRight) return;
      if (pointer.y < viewportCenterY - 105 || pointer.y > viewportCenterY + 105) return;
      scrollState.pointerX = pointer.x;
    };
    const onPointerMove = (pointer) => {
      if (!pointer.isDown || scrollState.pointerX === undefined || maxOffset === 0) return;
      updateScrollOffset(scrollState.pointerX - pointer.x);
      scrollState.pointerX = pointer.x;
    };
    const onPointerUp = () => { scrollState.pointerX = undefined; };

    this.input.on("wheel", onWheel);
    this.input.on("pointerdown", onPointerDown);
    this.input.on("pointermove", onPointerMove);
    this.input.on("pointerup", onPointerUp);

    this.targetModal.push({
      destroy: () => {
        this.input.off("wheel", onWheel);
        this.input.off("pointerdown", onPointerDown);
        this.input.off("pointermove", onPointerMove);
        this.input.off("pointerup", onPointerUp);
      },
    });
  }

  renderGraveyardCard(card, x, y) {
    const texture = CARD_TEXTURES[card.getName()];
    const children = [];
    if (texture) {
      children.push(this.add.image(0, 0, texture).setDisplaySize(130, 182));
    } else {
      children.push(this.add.rectangle(0, 0, 130, 182, 0xf1e0a7).setStrokeStyle(2, 0x362b1d));
      children.push(this.add.text(-54, -68, `${card.getName()}\n\n${card.getDescription()}`, {
        color: "#1f2937", fontSize: "14px", wordWrap: { width: 108 },
      }));
    }
    const hoverBorder = this.add.rectangle(0, 0, 138, 190, 0x000000, 0)
      .setStrokeStyle(4, 0xfbbf24)
      .setVisible(false);
    const hoverZone = this.add.zone(0, 0, 130, 182).setInteractive();
    hoverZone.on("pointerover", () => hoverBorder.setVisible(true));
    hoverZone.on("pointerout", () => hoverBorder.setVisible(false));
    const slot = this.add.container(x, y, [...children, hoverBorder, hoverZone]).setDepth(33);
    this.targetModal.push(slot);
    return slot;
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

  renderZone(label, x, y, cards, owner, canDirectAttack = false) {
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

      if (card && card.getType() === CARD_TYPES.MONSTER) {
        this.addFlipSummonAction(card, cardX, y, index, owner);
      }

      if (card && card.getType() !== CARD_TYPES.MONSTER && card.getType() !== CARD_TYPES.SPELL) {
        this.addSupportPreviewArea(card, cardX, y, owner);
      }

      if (card && card.getType() === CARD_TYPES.MONSTER
        && !(owner === this.state.currentTurnPlayer
          && (this.state.phase === DUEL_PHASES.MAIN_1 || this.state.phase === DUEL_PHASES.MAIN_2)
          && card.getVisibility() === VISIBILITY.FACE_DOWN
          && card.getPosition() === POSITIONS.DEFENSE
          && card.getSetTurn() < this.state.turn)
        && !(this.state.phase === DUEL_PHASES.BATTLE && this.state.turn !== 1)) {
        this.addSupportPreviewArea(card, cardX, y, owner);
      }

      if (card && card.getType() === CARD_TYPES.MONSTER && this.state.phase === DUEL_PHASES.BATTLE) {
        this.addBattleTarget(card, cardX, y, index, owner);
      }
    }

    if (
      canDirectAttack
      && this.state.turn !== 1
      && cards.length === 0
      && this.selectedAttackerIndex !== null
      && this.state[this.state.currentTurnPlayer].monsters[this.selectedAttackerIndex]
    ) {
      const directAttackArea = this.add.zone(x + 2.5 * (CARD_WIDTH + CARD_GAP), y + CARD_HEIGHT / 2, 5 * (CARD_WIDTH + CARD_GAP), CARD_HEIGHT)
        .setInteractive({ useHandCursor: true }).setDepth(5);
      directAttackArea.on("pointerover", () => this.drawDirectAttackArrow());
      directAttackArea.on("pointerout", () => {
        if (this.attackArrow) {
          this.attackArrow.destroy();
          this.attackArrow = null;
        }
      });
      directAttackArea.on("pointerdown", () => {
        this.drawDirectAttackArrow();
        const result = declareAttack(this.state, this.state.currentTurnPlayer, this.selectedAttackerIndex, null);
        if (!result.ok) return;
        this.selectedAttackerIndex = null;
        this.registry.set("selectedAttackerIndex", null);
        this.beginTrapResponse(result.event);
      });
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

    activationArea.on("pointerover", () => this.setCardPreview(card, owner));
    activationArea.on("pointerout", () => this.clearCardPreview());

    activationArea.on("pointerdown", () => {
      this.clearActionMenu();
      this.addActionButton("Activate", x + CARD_WIDTH / 2, y - 25, () => {
        if (card.getEffect() === "SPECIAL_SUMMON_FROM_GRAVEYARD") {
          this.showSetMonsterRebornTargets(owner, supportIndex);
          return;
        }
        this.activateSetSpell(owner, supportIndex);
      });
    });
  }

  addSupportPreviewArea(card, x, y, owner) {
    const previewArea = this.add.zone(
      x + CARD_WIDTH / 2,
      y + CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
    ).setInteractive({ useHandCursor: true }).setDepth(5);
    previewArea.on("pointerover", () => this.setCardPreview(card, owner));
    previewArea.on("pointerout", () => this.clearCardPreview());
  }

  addFlipSummonAction(card, x, y, monsterIndex, owner) {
    const isMainPhase = this.state.phase === DUEL_PHASES.MAIN_1
      || this.state.phase === DUEL_PHASES.MAIN_2;
    const canFlipSummon = owner === this.state.currentTurnPlayer
      && isMainPhase
      && card.getVisibility() === VISIBILITY.FACE_DOWN
      && card.getPosition() === POSITIONS.DEFENSE
      && card.getSetTurn() < this.state.turn;
    if (!canFlipSummon) return;

    const actionArea = this.add.zone(
      x + CARD_WIDTH / 2,
      y + CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
    ).setInteractive({ useHandCursor: true }).setDepth(5);

    actionArea.on("pointerover", () => this.setCardPreview(card, owner));
    actionArea.on("pointerout", () => this.clearCardPreview());

    actionArea.on("pointerdown", () => {
      this.clearActionMenu();
      this.addActionButton("Flip Summon", x + CARD_WIDTH / 2, y - 25, () => {
        const result = flipSummon(this.state, owner, monsterIndex);
        if (result.ok) this.scene.restart();
      });
    });
  }

  setCardPreview(card, owner) {
    if (this.selectedCardPreview?.card === card) return;
    this.selectedCardPreview = { card, owner };
    this.registry.set("selectedCardPreview", this.selectedCardPreview);
    this.renderCardPreview();
  }

  clearCardPreview() {
    // Keep the last card previewed until the next card preview
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

    targetArea.on("pointerover", () => this.setCardPreview(card, owner));
    targetArea.on("pointerout", () => this.clearCardPreview());

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

    const attackerX = 615 + this.selectedAttackerIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
    const attackerY = 570 + CARD_HEIGHT / 2;
    const targetX = 615 + targetIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
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

  drawDirectAttackArrow() {
    if (this.selectedAttackerIndex === null) return;
    if (this.attackArrow) this.attackArrow.destroy();

    const attackerX = 615 + this.selectedAttackerIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;
    const attackerY = 570 + CARD_HEIGHT / 2;
    const targetX = 975;
    const targetY = 340;
    const angle = Phaser.Math.Angle.Between(attackerX, attackerY - 70, targetX, targetY + 70);
    const arrowLength = 24;
    const tipX = targetX;
    const tipY = targetY + 70;
    const leftX = tipX - arrowLength * Math.cos(angle - Math.PI / 6);
    const leftY = tipY - arrowLength * Math.sin(angle - Math.PI / 6);
    const rightX = tipX - arrowLength * Math.cos(angle + Math.PI / 6);
    const rightY = tipY - arrowLength * Math.sin(angle + Math.PI / 6);

    this.attackArrow = this.add.graphics().setDepth(15);
    this.attackArrow.lineStyle(8, 0xff3b30, 0.95);
    this.attackArrow.lineBetween(attackerX, attackerY - 70, tipX, tipY);
    this.attackArrow.fillStyle(0xff3b30, 1);
    this.attackArrow.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
  }

  renderHand(player) {
    const cards = player.hand;
    const startX = 615;
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

    if (!isSelectable && card.getType() === CARD_TYPES.MONSTER && card.getPosition() === POSITIONS.DEFENSE) {
      cardObjects.forEach((cardObject) => cardObject.setAngle(-90));
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
    hoverArea.setDepth(6);

    hoverArea.on("pointerover", () => {
      this.moveHandCard(cardObjects, restingPositions, -18, "Sine.Out");
      if (this.selectedHandIndex !== handIndex) this.clearActionMenu();
      this.setCardPreview(card, this.state.currentTurnPlayer);
    });

    hoverArea.on("pointerout", () => {
      this.moveHandCard(cardObjects, restingPositions, 0, "Sine.In");
      this.clearCardPreview();
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

    const setLabel = card.getType() === CARD_TYPES.TRAP
      ? x + CARD_WIDTH / 2
      : x + CARD_WIDTH;

    this.addActionButton("Set", setLabel, y - 46, () => {
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

    const modalHeight = 330;
    const panel = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 1540, modalHeight, 0x102637)
      .setStrokeStyle(4, 0xfbbf24)
      .setDepth(31);
    const title = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - modalHeight / 2 + 42, "MONSTER REBORN — CHOOSE A MONSTER", {
      color: "#fef3c7",
      fontSize: "24px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(32);
    this.targetModal.push(panel, title);

    const viewportWidth = 1330;
    const cardSpacing = 165;
    const viewportLeft = SCREEN_WIDTH / 2 - viewportWidth / 2;
    const viewportRight = SCREEN_WIDTH / 2 + viewportWidth / 2;
    const viewportCenterY = SCREEN_HEIGHT / 2 + 18;
    const contentWidth = (targets.length - 1) * cardSpacing + 130;
    const maxOffset = Math.max(0, contentWidth - viewportWidth);
    const scrollState = { offset: 0, pointerX: undefined, startPointerX: undefined };
    const cardSlots = [];

    targets.forEach(({ card, owner, graveyardIndex }, index) => {
      const baseX = viewportLeft + index * cardSpacing + 65;
      const slot = this.renderMonsterRebornTarget(card, baseX, viewportCenterY, () => {
        if (scrollState.startPointerX !== undefined && Math.abs(scrollState.pointerX - scrollState.startPointerX) > 6) return;
        onSelect({ player: owner, graveyardIndex });
      });
      cardSlots.push({ slot, baseX });
    });

    const updatePositions = () => {
      cardSlots.forEach(({ slot, baseX }) => {
        const x = baseX - scrollState.offset;
        slot.setX(x);
        slot.setVisible(x > viewportLeft - 65 && x < viewportRight + 65);
      });
    };
    updatePositions();

    const onWheelReborn = (pointer, deltaX, deltaY) => {
      if (maxOffset === 0) return;
      if (pointer.x < viewportLeft || pointer.x > viewportRight) return;
      if (pointer.y < viewportCenterY - 105 || pointer.y > viewportCenterY + 105) return;
      scrollState.offset = Phaser.Math.Clamp(scrollState.offset + (deltaY !== 0 ? deltaY : deltaX), 0, maxOffset);
      updatePositions();
    };
    const onPointerDownReborn = (pointer) => {
      if (pointer.x < viewportLeft || pointer.x > viewportRight) return;
      if (pointer.y < viewportCenterY - 105 || pointer.y > viewportCenterY + 105) return;
      scrollState.pointerX = pointer.x;
      scrollState.startPointerX = pointer.x;
    };
    const onPointerMoveReborn = (pointer) => {
      if (!pointer.isDown || scrollState.pointerX === undefined || maxOffset === 0) return;
      scrollState.offset = Phaser.Math.Clamp(scrollState.offset + (scrollState.pointerX - pointer.x), 0, maxOffset);
      updatePositions();
      scrollState.pointerX = pointer.x;
    };
    const onPointerUpReborn = () => { scrollState.pointerX = undefined; scrollState.startPointerX = undefined; };

    this.input.on("wheel", onWheelReborn);
    this.input.on("pointerdown", onPointerDownReborn);
    this.input.on("pointermove", onPointerMoveReborn);
    this.input.on("pointerup", onPointerUpReborn);

    this.targetModal.push({
      destroy: () => {
        this.input.off("wheel", onWheelReborn);
        this.input.off("pointerdown", onPointerDownReborn);
        this.input.off("pointermove", onPointerMoveReborn);
        this.input.off("pointerup", onPointerUpReborn);
      },
    });
  }

  renderMonsterRebornTarget(card, x, y, onSelect) {
    const texture = CARD_TEXTURES[card.getName()];
    const children = [];

    if (texture) {
      children.push(this.add.image(0, 0, texture).setDisplaySize(130, 182));
    } else {
      children.push(this.add.rectangle(0, 0, 130, 182, 0xf1e0a7).setStrokeStyle(3, 0x362b1d));
      children.push(this.add.text(-54, -68, `${card.getName()}\n\nATK ${card.getAtk()} / DEF ${card.getDef()}`, {
        color: "#1f2937",
        fontSize: "14px",
        wordWrap: { width: 108 },
      }));
    }

    const hoverBorder = this.add.rectangle(0, 0, 138, 190, 0x000000, 0)
      .setStrokeStyle(4, 0xfbbf24)
      .setVisible(false);
    const targetArea = this.add.zone(0, 0, 130, 182).setInteractive({ useHandCursor: true });
    targetArea.on("pointerdown", onSelect);
    targetArea.on("pointerover", () => hoverBorder.setVisible(true));
    targetArea.on("pointerout", () => hoverBorder.setVisible(false));
    const slot = this.add.container(x, y, [...children, hoverBorder, targetArea]).setDepth(33);
    this.targetModal.push(slot);
    return slot;
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
