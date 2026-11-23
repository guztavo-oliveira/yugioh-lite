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
    this.load.image("dark_hole", assetUrl("dark_hole.jpg"));
    this.load.image("dark_magician", assetUrl("dark_magician.webp"));
    this.load.image("darkfire_soldier_1", assetUrl("darkfire_soldier_1.jpg"));
    this.load.image("feral_imp", assetUrl("feral_imp.jpg"));
    this.load.image("magic_cylinder", assetUrl("magic_cylinder.jpg"));
    this.load.image("mirror_force", assetUrl("mirror_force.jpg"));
    this.load.image("monster_reborn", assetUrl("monster_reborn.jpg"));
    this.load.image("mystical_elf", assetUrl("mystical_elf.jpg"));
    this.load.image("pot_of_greed", assetUrl("pot_of_greed.jpg"));
    this.load.image("raigeki", assetUrl("raigeki.jpg"));
    this.load.image("summoned_skull", assetUrl("summoned_skull.jpg"));
    this.load.image("torrential_tribute", assetUrl("torrential_tribute.jpg"));
    this.load.image("trap_hole", assetUrl("trap_hole.jpg"));
  }

  create() {
    this.scene.start("duel");
  }
}
