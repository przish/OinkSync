# Git Workflow Rules

Always follow this exact git branching and commit workflow:

1. **Branch for New Patch**:
   - Every new patch/feature request begins by branching from `main` to a patch branch (e.g., `patch/<patch-name>`).
2. **Sub-branch for Changes**:
   - For specific changes/tasks within the patch, create a sub-branch off the patch branch (e.g., `sub/<feature-name>`).
   - **Per-file Git Commits**: Every single modified file must be committed individually with its own focused commit message describing the exact change for that file.
3. **Sub-branch to Patch Branch**:
   - Merge the sub-branch into the patch branch.
4. **Patch Branch to Main Branch**:
   - Merge or prepare the patch branch for merge to `main`.
5. **Remote Sync / Pull**:
   - The user pulls the patch branch to GitHub and pulls changes from GitHub into the local `main` branch.
