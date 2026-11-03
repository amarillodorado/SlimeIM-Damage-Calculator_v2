# Save, import and export buff providers

The **Teams → Buff providers** section saves your candidate list automatically in the current browser. The saved data belongs to the website address you use, including the localhost port. The save indicator reports success or unavailable browser storage.

## Export a backup

Choose **Export providers** to download `slimeim-buff-providers.json`. It contains the current candidate list: names, skill costs, individual effect entries, attribute/attack-type/target restrictions, guaranteed special-hit outcomes, notes and permitted local preset image paths.

The Calculator setup, damage results and combination rules are separate and are not included.

## Import a backup

Choose **Import providers** and select a provider JSON file. The app validates the complete file before changing your list.

- A new provider ID adds an entry.
- A matching ID updates that entry in place.
- Providers absent from the imported file remain in your list.
- Reimporting the same backup does not duplicate its entries.
- Matching names with different IDs remain separate providers, allowing different builds.
- Invalid files and imports exceeding the library limit leave the current list unchanged.

The result message shows how many entries were added, updated or unchanged. To keep an older revision before importing a newer one, export your current list first.

## Format and limits

The current export is a UTF-8 JSON object with `format: "slimeim-buff-providers"`, `version: 1` and a `providers` array. Older raw provider arrays are also accepted. Unsupported file versions or fields are rejected instead of being silently discarded.

A library supports 60 providers, with up to 20 effects per provider. Names can contain up to 60 characters. Skill costs are whole numbers from 0 to 9,999; effect values can be signed decimals from −100,000 to 100,000. Files must be no larger than 1 MB.

Saving occurs immediately when the provider list changes. Export provides a portable backup when changing browsers or website addresses, or when browser storage is unavailable.
