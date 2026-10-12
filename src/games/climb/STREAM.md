# Currently working on

## The tower

A fixed-width column of one-way platforms that grows forever upward,
seed-generated. The ground at the bottom is solid and always there, the
side walls are invisible, and the only way up is to jump platform by
platform. The camera pins x to the middle of the tower and rides the
highest living player, so the whole screen is the race to the top.

## how it works

- The tower is a pure function of a seed kept in the URL hash
  (`#climb=<seed>`): same seed, same rows. Rows are generated on demand as
  the players climb (and are never culled, a full seed is a few dozen
  platforms). Each row's landing point is drawn from the band reachable
  from the previous row, so every row is jumpable from the one below. As the
  seed number or the player's height rises, rows get narrower and gaps wider
  — a fresh tower is forgiving, a high one is a knife edge.
- Platforms are one-way: you can jump up through them and only land on top
  of them while falling. A single jump, no double jump, but with coyote
  time (a jump press right after walking off an edge still fires) and a
  jump buffer (a press just before landing still fires on touchdown). Jump
  momentum matters: launching at top movement speed gives up to 2x the normal
  jump height, so the longer gaps can be crossed by carrying speed.
- Score is height: +1 per new floor (50 units) of personal-best height on
  the current seed. Dying while falling subtracts the impact speed from the
  brain's score, and idling is punished — an AI player that fails to set a
  new personal-best for 450 simulation frames dies to the height budget,
  which costs a flat stall penalty on top.
- Falling too far kills: the fall is measured from the last surface the feet
  stood on, so a jump's own rise never counts against it; 260 units below
  that platform the player dies. The corpse keeps falling to the ground and
  fades from 50% opacity to 0 over 3 s. A missed row that lands you on the
  one below is cheap; a long fall is not.
- There are no generations: a brain category waits until every player in
  its pool is dead and the corpses are gone, then respawns the whole pool
  together — slot 0 clones the group's best brain, the higher slots carry
  progressively bolder mutations, with the slot ladder capped and the
  mutation level floored at 10% so exploration never fully dies no matter
  how many towers have been climbed. The last slot of each pool is an
  explorer: a fully fresh random brain while the group has banked fewer
  than 10 floors on the current seed — a standing source of novelty for a
  stuck line — and a regular mutation player once the line is proven. The
  second-to-last slot is a scout: it re-explores the oldest line of the
  group's hall of fame — the last three champion lines are kept per
  category, not just one. Once a group's players have reached the seed
  target (50 floors), that group is demoted: it respawns 5 players on
  slots 1..5, every one of them a mutation, and the untouched original is
  out of the pool for good. Returning to a previously completed seed
  restores that group's mutation-only pool; a new seed starts its own
  ladder.
- The moment a player sets a new high on the current tower, its brain is
  saved at the front of the group's hall of fame, the new best (live, not
  at death). The seed advances when three groups hold the 50-floor target:
  a 10 s countdown runs, then the seed increments and the next tower is
  harder. Each finished seed's high is recorded separately for HUD
  reference, but every generated seed starts with a fresh comparison bar,
  including when a seed is revisited, so mutated brains have a reachable
  goal. Groups that finished that seed return with mutation runs only. The
  scoreboard and promotion never compare against a blended cross-seed
  total, and training history lives in the weights the pools respawn from.

player names use a capital brain ID followed by the mutation index:

- `A3` = one hidden layer, mutation index 3.
- `Z3` = mixed brain, mutation index 3.

### Score legend

- 💀 player has died (the corpse fades from 50% opacity to 0 over 3 s)
- 🏆 player has died with a higher score
- 💜 player is climbing
- 💚 player is leading its group on this tower
- 👻 tower record, frozen when its holder died; ghost colors match the line
- 🕹 human player, driven with the arrows or WASD

### Human play

The human player is always on the field: arrows or WASD move (left/right),
Space jumps, or a DualShock controller (left stick, A). The controller
uses the browser's standard Gamepad API mapping and its stick has a small
deadzone. The camera follows the best-scoring player until the first
driving input, then sticks to the human; dying hands the camera back. It
is a watcher, not a participant in training: its score competes in the
live list, but it never writes into the AI pipeline. Like the AIs, it dies
when its height budget runs out; dying respawns a fresh human player on
the ground.
