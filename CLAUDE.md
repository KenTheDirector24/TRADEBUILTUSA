# Git commits

Do NOT add a `Co-Authored-By: Claude ...` trailer to commit messages in this repo. This project deploys via Vercel on the Hobby plan, which checks the commit author against team members (only the account owner on Hobby) and rejects deployments when it sees a second co-author — the Anthropic trailer gets misread as a second collaborator and blocks the deploy. Commit as the configured git user only (Kenneth Thompson <ssgthompson24@gmail.com>).
