I need to push my ENTIRE CURRENT PROJECT CODE to an already-created
GitHub branch.

Repository:
Paati-Padaippu-Veedu

Existing/main branch:
Shri-Udayammai-Paati-Padaippu-Veedu

Target branch:
Paati-Padaippu_veedu_2

IMPORTANT:
The target branch `Paati-Padaippu_veedu_2` already exists on GitHub.

My current local branch is:
Shri-Udayammai-Paati-Padaippu-Veedu

I currently have many UNCOMMITTED changes in my working directory.
These changes are the latest complete implementation of my project,
including UI integration, backend changes, invoice functionality,
WhatsApp functionality, migrations, services, and other updates.

MY GOAL:

I want the COMPLETE CURRENT PROJECT STATE to be committed and pushed
to:

Paati-Padaippu_veedu_2

I do NOT want only selected files pushed.

I want the entire current project code/state represented in the
working directory to be present in the target branch.

==================================================
CRITICAL SAFETY RULES
==================================================

DO NOT modify any source code.

DO NOT refactor anything.

DO NOT fix bugs.

DO NOT change the database.

DO NOT change MySQL configuration.

DO NOT modify .env secrets.

DO NOT run migrations.

DO NOT run database reset/flush commands.

DO NOT delete files.

DO NOT discard any current changes.

DO NOT use git reset --hard.

DO NOT use git restore to discard changes.

DO NOT overwrite my current implementation.

This task is ONLY for Git branch management and pushing the current
project state.

==================================================
STEP 1 — INSPECT CURRENT STATE
==================================================

First run:

git status
git branch
git remote -v

Confirm that the current branch is:

Shri-Udayammai-Paati-Padaippu-Veedu

Confirm that there are uncommitted changes.

DO NOT modify anything yet.

==================================================
STEP 2 — PROTECT CURRENT WORK
==================================================

Because my current changes are uncommitted, safely preserve them
before switching branches.

If necessary, use:

git stash push -u -m "Save current Paati Veedu implementation"

The `-u` option is important because I have untracked files including
new migrations, services, and documentation.

The stash must include ALL current uncommitted and untracked project
changes.

IMPORTANT:
The stash is only temporary local storage.
It is NOT the final push.

==================================================
STEP 3 — FETCH TARGET BRANCH
==================================================

Run:

git fetch origin

Verify that:

origin/Paati-Padaippu_veedu_2

exists.

Do NOT delete or recreate the remote branch.

==================================================
STEP 4 — SWITCH TO TARGET BRANCH
==================================================

Switch/create the local tracking branch for:

Paati-Padaippu_veedu_2

Use the existing remote branch as its starting point.

Do NOT reset the target branch.

Do NOT overwrite the remote branch history.

==================================================
STEP 5 — RESTORE MY COMPLETE CURRENT WORK
==================================================

Restore the stash containing my current implementation.

After restoring, run:

git status

Verify that ALL my previous modified and untracked files are present
again.

The current working tree should contain the implementation that was
previously on:

Shri-Udayammai-Paati-Padaippu-Veedu

including all current changes.

==================================================
STEP 6 — CHECK FOR SECRETS
==================================================

Before staging files, inspect git status carefully.

IMPORTANT:

Do NOT commit real secret files such as:

- backend/.env
- .env
- environment files containing real passwords
- Django secret keys
- MySQL passwords
- Meta WhatsApp access tokens
- API tokens
- private credentials

If a real secret file is currently untracked or modified and would be
included by `git add .`, STOP and report it to me.

Do NOT automatically delete or modify the secret.

`.env.example` may be committed only if it contains placeholders and
does not contain real credentials.

==================================================
STEP 7 — STAGE THE COMPLETE PROJECT
==================================================

Once secrets have been checked, stage the complete current project:

git add .

Do NOT selectively stage only frontend files.

The goal is to include the complete current project implementation.

Then run:

git status

Show/inspect the staged files.

==================================================
STEP 8 — COMMIT
==================================================

Create one commit containing the current complete implementation.

Suggested commit message:

"Update complete Paati Veedu application"

Do NOT amend an old commit.

Create a new commit.

==================================================
STEP 9 — PUSH
==================================================

Push the commit to:

origin/Paati-Padaippu_veedu_2

Use:

git push -u origin Paati-Padaippu_veedu_2

IMPORTANT:

The push must go ONLY to:

Paati-Padaippu_veedu_2

DO NOT push to:

Shri-Udayammai-Paati-Padaippu-Veedu

DO NOT push to:

main

==================================================
STEP 10 — VERIFY
==================================================

After pushing:

Run:

git branch --show-current

It must show:

Paati-Padaippu_veedu_2

Then:

git status

The working tree should ideally be clean.

Then:

git log -1 --oneline

Confirm the new commit exists.

Finally:

git status -sb

Confirm the local branch is tracking:

origin/Paati-Padaippu_veedu_2

==================================================
IMPORTANT FINAL REQUIREMENT
==================================================

Do NOT modify my application code during this task.

This is purely a Git operation.

The final result must be:

GitHub
│
├── Shri-Udayammai-Paati-Padaippu-Veedu
│      └── Existing main/stable code remains untouched
│
└── Paati-Padaippu_veedu_2
       └── Complete current project implementation
           including all my current uncommitted changes

The existing main branch MUST remain untouched.

Before executing any potentially destructive Git command,
STOP and ask me for confirmation.

At the end, report:
1. Current local branch.
2. Target remote branch.
3. Commit hash.
4. Whether the push succeeded.
5. Whether the working tree is clean.
6. Confirmation that the main branch was not modified.