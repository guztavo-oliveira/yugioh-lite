export const CARD_DATABASE = {

  // ===== MONSTERS =====

  "c001": {
    id: "c001",
    name: "Blue-Eyes White Dragon",
    type: "MONSTER",
    atk: 3000,
    def: 2500,
    level: 8,
    description: "A legendary dragon with devastating attack power.",
    imgKey: "blue_eyes"
  },

  "c002": {
    id: "c002",
    name: "La Jinn the Mystical Genie of the Lamp",
    type: "MONSTER",
    atk: 1800,
    def: 1000,
    level: 4,
    description: "A powerful genie of the lamp with 1,800 attack points.",
    imgKey: "la_jinn"
  },

  "c005": {
    id: "c005",
    name: "Dark Magician",
    type: "MONSTER",
    atk: 2500,
    def: 2100,
    level: 7,
    description: "The ultimate wizard in terms of attack and defense.",
    imgKey: "dark_magician"
  },

  "c006": {
    id: "c006",
    name: "Summoned Skull",
    type: "MONSTER",
    atk: 2500,
    def: 1200,
    level: 6,
    description: "A fiend with devastating attack and defense capabilities.",
    imgKey: "summoned_skull"
  },

  "c007": {
    id: "c007",
    name: "Darkfire Soldier #1",
    type: "MONSTER",
    atk: 1700,
    def: 1000,
    level: 4,
    description: "A fierce warrior trained for battle.",
    imgKey: "darkfire_soldier_1"
  },

  "c008": {
    id: "c008",
    name: "Feral Imp",
    type: "MONSTER",
    atk: 1300,
    def: 1400,
    level: 4,
    description: "A mischievous fiend with a dangerous attack.",
    imgKey: "feral_imp"
  },

  "c009": {
    id: "c009",
    name: "Mystic Elf",
    type: "MONSTER",
    atk: 800,
    def: 2000,
    level: 4,
    description: "A delicate elf whose magical defense is powerful.",
    imgKey: "mystical_elf"
  },

  // ===== SPELLS =====

  "c003": {
    id: "c003",
    name: "Dark Hole",
    type: "SPELL",
    effect: "DESTROY_ALL_MONSTERS",
    description: "Destroy all monsters on the field.",
    imgKey: "dark_hole"
  },

  "c010": {
    id: "c010",
    name: "Monster Reborn",
    type: "SPELL",
    effect: "SPECIAL_SUMMON_FROM_GRAVEYARD",
    description: "Special Summon one monster from either Graveyard.",
    imgKey: "monster_reborn"
  },

  "c011": {
    id: "c011",
    name: "Raigeki",
    type: "SPELL",
    effect: "DESTROY_ALL_OPPONENT_MONSTERS",
    description: "Destroy all monsters your opponent controls.",
    imgKey: "raigeki"
  },

  "c012": {
    id: "c012",
    name: "Pot of Greed",
    type: "SPELL",
    effect: "DRAW_2_CARDS",
    description: "Draw two cards from your Deck.",
    imgKey: "pot_of_greed"
  },

  // ===== TRAPS =====

  "c004": {
    id: "c004",
    name: "Trap Hole",
    type: "TRAP",
    effect: "DESTROY_SUMMONED_MONSTER",
    description: "When your opponent Normal Summons a monster with 1,000 or more ATK, destroy it.",
    imgKey: "trap_hole"
  },

  "c013": {
    id: "c013",
    name: "Mirror Force",
    type: "TRAP",
    effect: "DESTROY_ATTACKING_MONSTERS",
    description: "When your opponent declares an attack, destroy all their Attack Position monsters.",
    imgKey: "mirror_force"
  },

  "c014": {
    id: "c014",
    name: "Magic Cylinder",
    type: "TRAP",
    effect: "NEGATE_ATTACK_AND_DAMAGE",
    description: "When an opponent's monster declares an attack, negate it and inflict damage equal to its ATK.",
    imgKey: "magic_cylinder"
  },

  "c015": {
    id: "c015",
    name: "Torrential Tribute",
    type: "TRAP",
    effect: "DESTROY_ALL_MONSTERS",
    description: "When a monster is Summoned, destroy all monsters on the field.",
    imgKey: "torrential_tribute"
  }

};
