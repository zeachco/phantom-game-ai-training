# phantom-game-ai-training
An arcade game to train a basic AI

very basic vanilla AI trained on cheesy arcade games

the goal is to collect many models and train de AI over different games

## Automated TODO work

`scripts/cron-todo.sh` can be run by cron to pull the latest fast-forwardable
changes, ask the coding agent to complete the easiest unfinished bug (or
feature), validate it, and commit and push the result. It refuses to run with
local changes and skips overlapping runs.

The cron environment must be able to find `git`, `flock`, and `pi`, and must
have credentials configured for both git push and the coding agent. For
example:

```cron
0 * * * * cd /home/olivier/dev/phantom-game-ai-training && PATH=/home/olivier/.local/bin:/usr/local/bin:/usr/bin:/bin /home/olivier/dev/phantom-game-ai-training/scripts/cron-todo.sh >>/home/olivier/.cache/phantom-game-ai-training-cron.log 2>&1
```

Optional environment variables include `PI_BIN`, `PI_PROVIDER`, `PI_MODEL`,
`PI_THINKING`, `VERIFY_COMMAND`, `COMMIT_MESSAGE`, and `TODO_DIR`.
