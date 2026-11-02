import type { SupportUnit } from '../../domain/teams';

/**
 * Default support units carried over from the Beta 4 preset list (values unchanged,
 * mapped to the new effect types). They are community data from 2024 — check them in game.
 */
export const PRESET_UNITS: SupportUnit[] = [
  {
    id: 'violet-wm',
    name: 'Violet WM',
    skillCost: 80,
    icon: 'units/VioletHA2023_5_CharaPartyM.png',
    effects: [
      { type: 'soulDmgResDown', value: 55, attribute: 'any' },
      { type: 'critDmg', value: 40, attribute: 'any' },
    ],
    triggers: { crit: true },
  },
  {
    id: 'aqua',
    name: 'Aqua',
    skillCost: 80,
    icon: 'units/AquaDefault_5_CharaPartyM.png',
    effects: [{ type: 'piercePower', value: 60, attribute: 'any' }],
    triggers: { pierce: true },
  },
  {
    id: 'hinata-wom',
    name: 'Hinata WoM',
    skillCost: 40,
    icon: 'units/Hinata2Anniv_5_CharaPartyM.png',
    effects: [{ type: 'elementAtk', value: 50, attribute: 'any' }],
    triggers: {},
  },
  {
    id: 'violet-voc',
    name: 'Violet VoC',
    skillCost: 80,
    icon: 'units/Violet2Anniv_5_CharaPartyM.png',
    effects: [{ type: 'typeAtk', value: 100, attribute: 'any' }],
    triggers: {},
  },
  {
    id: 'jaune-voc',
    name: 'Jaune VoC',
    skillCost: 80,
    icon: 'units/Jaune2Anniv_5_CharaPartyM.png',
    effects: [{ type: 'soulDmg', value: 100, attribute: 'any' }],
    triggers: {},
  },
  {
    id: 'blanc-voc',
    name: 'Blanc VoC',
    skillCost: 80,
    icon: 'units/Buran2Anniv_5_CharaPartyM.png',
    effects: [{ type: 'weakDmg', value: 100, attribute: 'any' }],
    triggers: {},
  },
  {
    id: 'rimuru-fow',
    name: 'Rimuru FoW',
    skillCost: 80,
    icon: 'units/RimuruSchool2023_5_CharaPartyM.png',
    effects: [
      { type: 'typeAtk', value: 65, attribute: 'any' },
      { type: 'typeAtk', value: -20, attribute: 'any' },
    ],
    triggers: {},
  },
  {
    id: 'shinsha-nyb',
    name: 'Shinsha NYB',
    skillCost: 80,
    icon: 'units/CynthiaArmor_5_CharaPartyM.png',
    effects: [
      { type: 'soulDmg', value: 80, attribute: 'any' },
      { type: 'critDmg', value: 40, attribute: 'any' },
    ],
    triggers: {},
  },
  {
    id: 'milim-v2-nyb',
    name: 'Milim V2 NYB',
    skillCost: 40,
    icon: 'units/Milim1kuji2024_5_CharaPartyM.png',
    effects: [
      { type: 'soulDmgResDown', value: 40, attribute: 'any' },
      { type: 'synergyPower', value: 20, attribute: 'any' },
    ],
    triggers: {},
  },
  {
    id: 'guy-wm',
    name: 'Guy WM',
    skillCost: 80,
    icon: 'units/GuyHA2023_5_CharaPartyM.png',
    effects: [{ type: 'soulDmg', value: 80, attribute: 'any' }],
    triggers: { crit: true },
  },
];
