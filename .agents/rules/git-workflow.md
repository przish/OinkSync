# Git Workflow & Design Rules

## Git Workflow Rules

Always follow this exact branching and PR workflow:

1. **Branch for New Patch**:
   - Every new patch/feature request begins by branching from `main` to a patch branch (e.g., `patch/<patch-name>`).
2. **Sub-branch for Changes**:
   - For specific changes/tasks within the patch, create a sub-branch off the patch branch (e.g., `sub/<feature-name>`).
   - **Per-file Git Commits**: Every single modified file must be committed individually with its own focused commit message describing the exact change for that file.
3. **Sub-branch merge to Patch Branch**:
   - Merge the completed sub-branch into the patch branch.
4. **DO NOT Merge Locally to Main**:
   - Never merge the patch branch into `main` locally in the IDE.
   - Never push directly to `main` locally.
5. **GitHub Pull Request**:
   - The patch branch is pushed to GitHub (`git push origin patch/<patch-name>`).
   - The user creates and merges a Pull Request on GitHub.
   - The user then pulls the updated `main` branch from GitHub locally.

---

## Strict 4-Color Design Palette Rule

The web app MUST strictly use ONLY these 4 colors throughout the entire application:

1. `#86A788` (Muted Sage Green)
   - Used for: Sidebar background, primary buttons, primary borders, active indicators, brand accents.
2. `#FFFDEC` (Warm Cream)
   - Used for: Main page background, body surface, light panels, input backgrounds.
3. `#FFE2E2` (Soft Pink / Rose)
   - Used for: Card backgrounds, modal containers, secondary surfaces, summary cards.
4. `#FFCFCF` (Blush Pink)
   - Used for: Accent highlights, hover states, card borders, badge accents, table header highlights.

Do NOT introduce other arbitrary colors (no blues, dark forest greens `#1A2E0A`, browns, golds, or unapproved palettes).
Text contrast on `#FFFDEC`, `#FFE2E2`, and `#FFCFCF` must remain crisp and readable (e.g., `#2D4433` deep sage or high-contrast deep text ensuring >= 4.5:1 ratio).
