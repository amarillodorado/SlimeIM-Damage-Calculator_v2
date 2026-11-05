# Super Critical, “+” attribute effects and investigation tools

The investigation uses the supplied official Android 5.0.20 ARM64 client and the additional Unity cache folders copied from the user’s device. Version 6.5.0 recovers the two formerly missing Super Critical constants from MasterBattleDefineValue; they now apply automatically.

## Super Critical

**Confirmed in code and supplied data:** Super Critical exists. Official English localization `En.L10NBuff`, target **2000000159**, calls parameter **1701** “Super Critical Rate”; six decoded `MasterBuffEffect` rows grant it.

`BattleDamageReceiveParam.IsHitCriticalSuper` is at RVA **0xBC758A0**. The main path checks it at **0xBC7060C**, after ordinary Critical succeeds. It chooses `GetCriticalSuperRate` at **0xBC70624** or ordinary Critical at **0xBC70634**, then performs one multiplication at **0xBC7066C**. Super Critical replaces the ordinary Critical factor; its rate does not increase ordinary Critical chance.

The newly supplied official `MasterBattleDefineValue` payload confirms both coefficients:

| Key                                          |     Row ID | FlatBuffer row offset | Native value | Factor |
| -------------------------------------------- | ---------: | --------------------- | -----------: | -----: |
| `battle.rate.critical.common.coefficient`    | 8700000008 | `0x1d4`               |        15000 |    1.5 |
| `battle.rate.critical.up.effect.coefficient` | 8700000009 | `0x16c`               |        13000 |    1.3 |

Both rows use release label `3.0.20_system_common`. The table has 12 rows. Its 1,352-byte decrypted body passed its embedded SHA-256 check: `9fe88ad9751557f7654f4246f1d52f3dc15f22a82b30d4f6fb8a17e9c35a1af2`. The source 2,611-byte bundle has SHA-256 `698f43f626c6fa694cb9defaf6a70022b2cec36c8df9d821d2fb872c7a8d3082`.

`GetCriticalSuperRate`, RVA **0xBC759EC**, computes, in native basis-point units:

```text
max(0, (15000 + (positivePower - negativeEnemyResistance) * 13000 / 10000
              + negativePower - positiveEnemyResistance) / 10000)
```

In calculator percentage units, this is `max(0, 1.5 + 1.3 × favorableBonuses / 100 + unfavorableBonuses / 100)`. Favorable bonuses are Critical Power UP and enemy Critical Resistance DOWN. Critical Power DOWN and enemy Critical Resistance UP stay unscaled. Keep simultaneous signed sources separate. Unlike Super Pierce, Synergy and Aegis, whose favorable scale is 1.2, Super Critical uses **1.3**.

Selecting **Critical → Super** applies these constants without extra coefficient inputs. Older saved manual coefficient fields are ignored on load/share; the selected outcome and buff sources are retained. Synthetic coefficients exist only in low-level Decimal-oracle tests and cannot override a player calculation.

The second supplied table, `MasterPcEnhancedElementOverride`, confirms an `EpicAddWeakDamageRate` of 4000 (40%) for level-120 [Armored Dragonoid] Milim, row **190000500000577**, offset **0x229c**, `MasterPcId=150521`. Its raw Int32 field is at **0x22dc**, bytes `a0 0f 00 00`. The English title/name join comes from `En.L10NPc` target150521 at offsets0x6778/0x67e8. With natural advantage, an eligible Ultimate uses **1.5 + 0.1 + 0.4 = 2.0**; an ordinary Dark+ soul uses1.6. This addition replaces the shared fallback; there is no hidden subtraction of1 or universal affinity cap2.

The new override payload has **475 rows** and a different content hash from the original APK catalog. Its supplied bundle SHA-256 is `ba1811501c728622476fb47b93016503ca4eaa01d43ef6392f3af7a6328dbcf4`; its decrypted body SHA-256 is `9cc382213cdcb137d7c1b077141bf8200390f70b4ef1594264626a500422c9d4`. Embedded integrity verification passed. The table contains28 Epic rows with1000 and62 with4000; Special/SpecialPlus rows have zero. The character/level resolver and Ultimate eligibility must be satisfied before using a row. The matching [Avatar of Omnipotence] Rimuru row also has4000, but requires level120 and must not be applied to the earlier level108 test. The calculator retains the editable40% starting value because the addition is character- and upgrade-dependent.

## Ordinary and “+” attribute effects

**Confirmed in code:** the ordinary and enhanced families multiply independently. Choosing a “+” attacker enables its matching additional fields under **All types**. All seven attributes are supported.

| Field family      | Ordinary Dark parameter | Additional Dark+ parameter | Where it applies       |
| ----------------- | ----------------------: | -------------------------: | ---------------------- |
| ATK UP            |                     315 |                       1507 | Before DEF subtraction |
| Resistance        |                     416 |                       1514 | Effective DEF          |
| Damage UP         |                     514 |                       1521 | After the base kernel  |
| Damage Resistance |                     614 |                       1528 | After the base kernel  |

The official English labels distinguish **Dark+ Resistance** (`MasterBuff` **2000000130**) from **Dark+ Damage Resistance** (`MasterBuff` **2000000144**). These are separate categories.

The user's wording, “Decrease all targets’ all enhanced attribute damage resistance”, belongs to this additional damage-resistance family. For a Dark+ attack, enter the amount in **Dark+ damage resistance DOWN**. In a Teams provider, choose the “+” damage-resistance effect with **Any attribute** if all enhanced attributes are covered. “All targets” means the enemies receiving the debuff; it does not imply an AoE-only attack restriction.

A supplied master example, `HinataTeacher_bless_02`, has seven enhanced damage-resistance rows **20310000001136–20310000001142**, parameters **1522–1528**, each −2000. Its separate ordinary-resistance rows **20310000001143–20310000001149** have −5000. This confirms the categories can coexist independently. One Dark+ hit uses its matching 1528 contribution once, not seven multipliers.

Native helpers include `GetElementEnhancedResistRate` **0xBC27480** and `GetElementEnhancedDamageResistRate` **0xBC268B0**. Shared multiplication of ordinary then enhanced factors occurs in `GetAttackRateBase`, **0xBC261D4 / 0xBC261E8**. Ordinary attacks use no additional enhanced factor.

For a simple arithmetic illustration, ordinary resistance DOWN 20% and matching “+” resistance DOWN 30% scale DEF by `0.8 × 0.7 = 0.56`. They are not summed to 50%. Damage-resistance DOWN 20% and 30% instead multiply damage by `1.2 × 1.3 = 1.56`. These examples illustrate the recovered operations; they are not new recorded battles.

## Investigation tools used

- **Il2CppDumper 6.7.46:** recovered metadata declarations, method addresses and symbol inputs from the supplied IL2CPP files.
- **Ghidra 12.2 with a Java runtime:** focused native analysis and pseudocode; ARM64 instructions are used to verify arithmetic where decompilation is incomplete.
- **Python, Capstone and pyelftools:** bounded disassembly, ELF address/offset mapping, relocation and constant-table checks.
- **UnityPy, cryptography and custom FlatBuffer readers:** supplied asset-bundle inventory, verified master-data decoding and localization joins.
- **Exact Decimal implementations and a .NET oracle:** arithmetic-order and rounding checks.
- **TypeScript, Vitest and Vite:** calculator implementation, regression checks and production builds; browser checks verify the interface.

### REA trial

The suggested [official REA project](https://github.com/morluto/rea) was installed task-locally as **rea-agents 6.8.0**, without registering an MCP server or changing global Codex settings.

Its IL2CPP metadata command was run on the supplied metadata plus matching ELF. It identified the files and validated header counts, including 244,007 method rows, but stopped at its fixed **64 MiB retained-report limit**. It did not retain a complete method/address inventory or recover the missing Super Critical master values. The CLI exposes no filter that bypasses that initial complete-inventory step.

The documented [Windows Ghidra adapter boundary](https://github.com/morluto/rea/blob/main/docs/windows-ghidra-p0.md) excludes this Android ELF target. Direct Ghidra analysis remains usable; the existing project was not changed. REA is an additional analysis interface, not a replacement for missing game data.
