# SOP 08 — Excel Output

## Goal
Build 4-tab Excel file matching the exact visual spec.

## Tabs
1. **📋 Ad Intelligence Records** — Full forensic analysis (13 cols, row height 320, freeze D4)
2. **🎬 Production Formulas** — Ready-to-brief scripts (7 cols, row height 280, freeze D3)
3. **⚡ Key Takeaways** — STEAL/KAIZEN/UPGRADE parsed (6 cols, row height 220, freeze D3)
4. **📖 Legend & Instructions** — Field definitions + usage guide (2 cols)

## Visual Spec
- Theme: DARK_BG=#1A1A2E, PANEL_BG=#0F3460, ROW_ALT=#F8F9FA, BORDER=#DEE2E6
- Font: Arial, Header=white bold 10pt, Body=9pt
- Grid lines: HIDDEN on all sheets
- All sheets: freeze panes, auto-filter on header row
- Hyperlinks: blue underline on AD LINK and LANDING PAGE columns

## Quality Rules
- No empty-string fields in exported records
- Records sorted by adScore DESC in Tab 1
- productionFormula untruncated in Tab 2
- STEAL/KAIZEN/UPGRADE correctly parsed from keyTakeaways in Tab 3
- Tab 4 must have section headers with light blue background
