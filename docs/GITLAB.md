# GitLab Deployment Notes

Steps we followed to push Kiro Assistant to `https://gitlab.aws.dev/wwps-asean-sa-genai/Kiro-Cowork`:

1. **Clone / existing repo**
   - Repo started as Agent Cowork fork (GitHub remote). We added the AWS GitLab remote and force-pushed when ready.

2. **Midway-signed SSH key**

`ssh-keygen -t ecdsa`

`mwinit -k ~/.ssh/id_ecdsa.pub`

```
echo "Host ssh.gitlab.aws.dev     
    User git
    IdentityFile ~/.ssh/id_ecdsa
    CertificateFile ~/.ssh/id_ecdsa-cert.pub
    IdentitiesOnly yes
    ProxyCommand none
    ProxyJump none" >> ~/.ssh/config
```

`ssh -T ssh.gitlab.aws.dev # tests SSH can reach Gitlab`

3. **Git remote**
   - Set origin to the Midway SSH URL:
     ```
     git remote set-url origin ssh://git@ssh.gitlab.aws.dev/wwps-asean-sa-genai/Kiro-Cowork.git
     ```
   - Verify with `git remote -v`.

4. **Protected branch**
   - `main` was protected on GitLab; force pushes were blocked (`pre-receive hook`). We temporarily removed branch protection, force-pushed, then re-enabled protection.

5. **Push sequence**
   - Stage and commit: `git add .` / `git commit -m "..."`.
   - Push: `git push origin main` (or `-f` if overwriting, once protection disabled).

6. **Troubleshooting**
   - If Git still prompts for Github, check `git remote -v`.
   - If GitLab rejects with HTTPS errors, ensure the remote uses `ssh.gitlab.aws.dev`.
   - For connection timeouts to `gitlab.aws.dev:22`, switch to the `ssh.` host and Midway config.
   - To refresh a single file from remote: `git checkout origin/main -- README.md`.
   - To reset everything to remote: `git reset --hard origin/main` (beware: discards local changes).

7. **Staging vs untracked**
   - `git status` shows tracked files (modified) vs untracked. Stage new files (`git add <file>`) before committing or they won’t be pushed.
   - To stage only specific files (e.g., updated images or docs), run `git add images/<name>.png docs/<file>.md`, then commit/push. No need to add everything if only a few files changed.

8. **Rebase / conflicts**
   - If `git push` is rejected because your branch is behind, pull or rebase first:
     ```
     git pull origin main
     # or:
     git fetch origin
     git rebase origin/main
     ```
     - `git fetch` only downloads remote commits (no merge). `git pull` = fetch + merge.
     - Use `fetch` when you want to review before merging; use `pull` for a quick sync.
   - When conflicts occur, edit the files to resolve differences, remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), then:
     ```
     git add <file>
     git rebase --continue   # or git commit if you were merging
     ```
   - After resolving all conflicts, run `git push origin main` again.
    - Rebase requires a clean working tree (no unstaged changes). Commit or stash local edits before running `git rebase`.

Keep this guide handy when setting up a new workstation or pushing significant updates to the AWS GitLab mirror.
