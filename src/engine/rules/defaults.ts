import type { ForgeWeights, RulesConfig } from './types'

/** Tiers and multipliers from the guide; see forgeScore.ts for the readings. */
export const DEFAULT_FORGE: ForgeWeights = {
  mainTier: { SPD: 100, CDmg: 93, 'ATK%': 91, CRate: 89, ACC: 80, 'HP%': 76, 'DEF%': 73, RES: 71 },
  flatOddMain: 72,
  flatEvenMain: 30,
  subTier: {
    SPD: 100, CRate: 95, CDmg: 93, 'ATK%': 90, ACC: 84, 'HP%': 78, 'DEF%': 74,
    RES: 72, ATK: 62, DEF: 60, HP: 58,
  },
  subWeight: 1,
  qualityCap: 1.12,
  innateMul: 0.38,
  evenFlatSubMul: 0.88,
  unlistedEvenSyn: 0.94,
  dupPenalty: 0.88,
  goldenMul: 1.04,
  divisor: 295,
}

/** Mirrors reference/verdict.py: Mid stage, Strictness 4. */
export const DEFAULT_RULES: RulesConfig = {
  rollMax: {
    'HP%': 8, 'ATK%': 8, 'DEF%': 8, SPD: 6, CRate: 6, CDmg: 7,
    RES: 8, ACC: 8, HP: 375, ATK: 20, DEF: 20,
  },
  effMax: {
    'HP%': 40, 'ATK%': 40, 'DEF%': 40, SPD: 30, CRate: 30, CDmg: 35,
    RES: 40, ACC: 40, HP: 1875, ATK: 100, DEF: 100,
  },
  high: {
    SPD: 12, 'HP%': 16, 'ATK%': 16, 'DEF%': 16, CRate: 12, CDmg: 14, ACC: 16, RES: 16,
  },
  god: {
    SPD: 22, 'HP%': 28, 'ATK%': 28, 'DEF%': 28, CRate: 21, CDmg: 25, ACC: 28, RES: 28,
  },
  duos: [
    ['SPD', 'HP%', 14, 16], ['SPD', 'DEF%', 14, 16], ['SPD', 'ATK%', 14, 16],
    ['SPD', 'ACC', 14, 16], ['CRate', 'CDmg', 12, 14], ['ATK%', 'CDmg', 16, 14],
    ['SPD', 'CRate', 14, 12],
  ],
  roles: [
    { name: 'Fast CC', good: ['SPD', 'ACC', 'HP%', 'DEF%', 'RES'], bad: ['ATK%', 'CDmg'], must: ['SPD'],
      mains: { 2: ['SPD', 'HP%', 'DEF%'], 4: ['HP%', 'DEF%'], 6: ['HP%', 'DEF%', 'ACC', 'RES'] } },
    { name: 'Classic DPS', good: ['SPD', 'ATK%', 'CRate', 'CDmg'], bad: ['DEF%', 'RES'], must: ['CRate', 'CDmg'],
      mains: { 2: ['SPD', 'ATK%'], 4: ['CRate', 'CDmg', 'ATK%'], 6: ['ATK%'] } },
    { name: 'Bomber', good: ['SPD', 'ATK%', 'ACC', 'ATK'], bad: ['DEF%', 'RES', 'HP%'], must: ['ATK%'],
      mains: { 2: ['SPD', 'ATK%'], 4: ['ATK%'], 6: ['ATK%', 'ACC'] } },
    { name: 'Tank', good: ['SPD', 'HP%', 'DEF%', 'RES', 'HP', 'DEF'], bad: ['ATK%', 'CRate', 'CDmg'], must: ['HP%', 'DEF%'],
      mains: { 2: ['SPD', 'HP%', 'DEF%'], 4: ['HP%', 'DEF%'], 6: ['HP%', 'DEF%', 'RES'] } },
    { name: 'Bruiser', good: ['SPD', 'HP%', 'DEF%', 'CRate', 'CDmg'], bad: ['ATK%', 'ACC'], must: ['CRate', 'CDmg'],
      mains: { 2: ['SPD', 'HP%', 'DEF%'], 4: ['CRate', 'CDmg', 'HP%', 'DEF%'], 6: ['HP%', 'DEF%'] } },
    { name: 'Slow DPS', good: ['ATK%', 'CRate', 'CDmg', 'HP%', 'DEF%'], bad: ['RES', 'ACC'], must: ['CRate', 'CDmg'],
      mains: { 2: ['ATK%', 'HP%', 'DEF%'], 4: ['CRate', 'CDmg'], 6: ['ATK%', 'HP%', 'DEF%'] } },
  ],
  wastedMaxRolls: 1.5,
  minLinesOdd: 3,
  minLinesEven: 2,
  needBase: 3.0,
  needPerRoll: 0.5,
  needRollsCap: 4,
  scoreSpan: 2.5,
  anchorFromLevel: 12,
  relaxedRetry: false,
  relaxedNeedDrop: 0.5,
  upgradeBelow: 9,
  finishBelow: 12,
  sellLowGradeWithoutSpd: true,
  universalEff: 85,
  universalFromLevel: 12,
  grind: { stats: ['SPD', 'HP%', 'DEF%', 'ATK%'], spdAdd: 4, pctAdd: 8, evalLevel: 12 },
  reapp: {
    sets: ['Violent', 'Will', 'Swift', 'Despair'],
    innates: ['none', 'SPD', 'HP%', 'ACC', 'DEF%'],
    mains: ['SPD', 'HP%', 'DEF%', 'ATK%', 'CRate', 'CDmg', 'ACC'],
    effCap: 75,
    allowOddSlots: true,
    legendOnly: true,
  },
  gem: { enabled: true },
  forge: DEFAULT_FORGE,
}
