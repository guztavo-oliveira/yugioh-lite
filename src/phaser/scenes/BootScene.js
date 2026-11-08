import Phaser from "phaser";

const assetUrl = (fileName) => new URL(`../../../assets/${fileName}`, import.meta.url).href;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    this.load.image("blue-eyes", assetUrl("blue_eyes_white_dragon.webp"));
    this.load.image("la-jinn", assetUrl("la_jinn.webp"));
    this.load.image("card-back", assetUrl("card_back.webp"));
    this.load.image("playmat", assetUrl("playmat.jpeg"));
  }

  create() {
    this.scene.start("duel");
  }
}
