Coordinator message to send to repository collaborators when performing history rewrite

Subject: Urgent — Repository history rewrite to purge committed secrets (Action required)

Hi team,

We found that `backend/.env` (development credentials and secrets) was accidentally committed to this repository. To mitigate the risk, we are planning a repository history rewrite to remove the file from all commits.

Planned actions (summary):
- Rotate all exposed credentials immediately (DB, JWT secrets, admin secret, third-party tokens).
- Perform a mirror clone + `git-filter-repo` (or BFG) to remove `backend/.env` from history, then force-push cleaned history.
- All contributors must re-clone the repository after the force-push. Local branches and forks will need special handling.

Required actions from you:
1) Do NOT push any commits until we confirm the purge is complete.
2) Back up any local branches you care about (create patches or push to a temporary remote).
3) After we announce the force-push, delete local clones and re-clone, or follow the safe rebase steps in the full remediation guide.

If you have any active work, create patches using `git format-patch` or push to a personal fork before the purge.

We will announce the exact time and provide the push logs and verification steps.

Thanks — Security Team
