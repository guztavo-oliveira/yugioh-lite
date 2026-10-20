export const gameState = {
    currentTurnPlayer: "p1", // "p1" or "p2"
    phase: "DRAW",      // "DRAW", "MAIN1", "BATTLE", "MAIN2", "END"
    turn: 1,
    p1: {
        lp: 8000,
        deck: ["c001", "c002", "c003", "c006", "c007", "c008", "c009", "c010", "c011", "c012", "c013"], // Array of card IDs
        hand: [],                       // Will hold instantiated card objects
        monsters: [], // 5 slots
        supports: [],   // 5 slots spell/trap   
        graveyard: [],
        normalSummoned: false
    },
    p2: { 
        lp: 8000, 
        deck: ["c005", "c004", "c003", "c006", "c007", "c008", "c009", "c010", "c011", "c012", "c013"], 
        hand: [], 
        monsters: [], 
        supports: [], 
        graveyard: [],
        normalSummoned: false }
};