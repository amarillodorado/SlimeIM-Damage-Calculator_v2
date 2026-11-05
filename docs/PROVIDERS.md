# Save, import and export buff providers

**Teams → Test pool → Add from Library** opens the Provider Library. Search names or buffs, select portraits, then add the selected providers to this setup's Test pool. Both views offer icon buttons for list and grid layouts. The Library and each setup's pool save immediately in the current browser, for the website address you use, including the localhost port. The save indicator reports success or unavailable browser storage.

Bundled presets become ordinary Library entries on first use. They can be edited, exported or deleted. Deleting from the Library asks for confirmation and removes the provider from every Test pool. Deleted presets are not restored automatically. Removing a provider from a Test pool is immediate and silent; its Library entry remains available to add again. Unchecking a provider only excludes it from that pool's comparisons.

Library filters appear below search: **Effect** (including guaranteed special-hit outcomes), **Attribute**, **Attack type** and **Test pool** membership. Filters combine with search and work across all pages in both views. Attribute and attack-type choices include unrestricted effects; all chosen conditions must match the same effect. **Already added** includes excluded providers still present in the current pool. **Clear filters** clears search and filters without changing your selected providers.

## Export a backup

In the Library, choose **Export providers** to download `slimeim-buff-providers.json` (or `slimeim-buff-provider.json` for a single entry). Each provider also has an export icon. Exports contain Library definitions: names, skill costs, individual effect entries, attribute/attack-type/target restrictions, guaranteed special-hit outcomes, notes and permitted local preset image paths.

Calculator setups, Test pool membership and inclusion choices, damage results and combination rules are separate and are not included. Library backups no longer store comparison inclusion on provider definitions; older files containing `enabled` remain accepted.

## Import a backup

Choose **Import providers** and select a provider JSON file. The app validates the complete file before changing your list.

- A new provider ID adds an entry.
- A matching ID updates that entry in place.
- Providers absent from the imported file remain in your list.
- Reimporting the same backup does not duplicate its entries.
- Matching names with different IDs remain separate providers, allowing different builds.
- Invalid files leave the current list unchanged.

The result message shows how many entries were added, updated or unchanged. To keep an older revision before importing a newer one, export your current list first.

Importing updates the Library; it does not add providers to a Test pool automatically. Select imported entries in the Library to use them in a comparison. Older saved candidate lists migrate to the Library and preserve their inclusion choices in the existing setups' pools.

## Format and limits

The current export is a UTF-8 JSON object with `format: "slimeim-buff-providers"`, `version: 1` and a `providers` array. Older raw provider arrays are also accepted. Unsupported file versions or fields are rejected instead of being silently discarded.

Libraries, Test pools and their JSON backups have no fixed provider-count or file-size caps. Top and bottom Previous/Next controls browse large collections. Each provider supports up to 20 effects. Names can contain up to 60 characters. Skill costs are whole numbers from 0 to 9,999; effect values can be signed decimals from −100,000 to 100,000.

Saving occurs immediately when the provider list changes. Export provides a portable backup when changing browsers or website addresses, or when browser storage is unavailable.
