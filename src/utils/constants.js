export const CARD_TYPES = {
    MONSTER: "MONSTER",
    SPELL:   "SPELL",
    TRAP:    "TRAP",
    SUPPORT: "SUPPORT" //it's not a truly card type from game, i use for concatenate spell/trap i only one key
}

export const MONSTER_TYPES = {
    NORMAL: "NORMAL",
    EFFECT: "EFFECT",
    FUSION: "FUSION",
    RITUAL: "RITUAL"
}

export const POSITIONS = {
    ATTACK:  "ATTACK",
    DEFENSE: "DEFENSE"
}

export const VISIBILITY = {
    FACE_UP:   "FACE_UP",
    FACE_DOWN: "FACE_DOWN"
}

export const ZONES = {
    DECK:         "DECK",
    HAND:         "HAND",
    MONSTER_ZONE: "MONSTER_ZONE",
    SUPPORT_ZONE: "SPELL_TRAP_ZONE",
    GRAVEYARD:    "GRAVEYARD",
    EXTRA_DECK:   "EXTRA_DECK"
}

export const SPELL_TYPES = {
    NORMAL:     "NORMAL",
    CONTINUOUS: "CONTINUOUS",
    QUICK:      "QUICK",
    RITUAL:     "RITUAL"
}

export const TRAP_TYPES = {
    NORMAL:     "NORMAL",
    CONTINUOUS: "CONTINUOUS",
    COUNTER:    "COUNTER"
}

export const DUEL_PHASES = {
    DRAW:    "DRAW",
    STANDBY: "STANDBY",
    MAIN_1:  "MAIN_1",
    BATTLE:  "BATTLE",
    MAIN_2:  "MAIN_2",
    END:     "END"
}

export const GAME_CONFIGS = {
    STARTING_LP:          8000,
    STARTING_HAND_SIZE:   5,
    MAX_MOSTER_ZONES:     5,
    MAX_SPELL_TRAP_ZONES: 5,
    MIN_DECK_SIZE:        40
}

export const DUEL_ACTIVITIES = {
    NORMAL_SUMMON: {type: "NORMAL_SUMMON", text: "Normal summon"},
    SET:           {type: "SET", text: "Set"},
    ACTIVE:        {type: "ACTIVE", text: "Active spell/trap cards"},
    ATTACK:        {type: "ATTACK", text: "Attack a monster"},
    NEXT_PHASE:    {type: "NEXT_PHASE", text: "Advance to next phase"}
}

export const TRAP_TRIGGER_EVENTS = {
    MONSTER_SUMMONED: "MONSTER_SUMMONED",
    ATTACK_DECLARED: "ATTACK_DECLARED"
}

export const DUEL_PHASES_FLOW = ["DRAW", "MAIN_1", "BATTLE", "MAIN_2", "END"]
