import Phaser from "phaser";
import { gameState, handlePhase, startDuel } from "../engine.js";
import { BootScene } from "./scenes/BootScene.js";
import { DuelScene } from "./scenes/DuelScene.js";

startDuel(gameState);
handlePhase(gameState);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1920,
  height: 1080,
  backgroundColor: "#173c3c",
  scene: [BootScene, DuelScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

game.registry.set("gameState", gameState);
