# Follow-group controls (all games)

Scope: circuit, climb, cave and highway. While the camera follows a
specific brain group (a numbered 1-9 button or `mixed`), a group-actions
block appears in the side panel between the follow keys and the network
readout. Following `all` (0) hides it. The block is built once by the
shared `src/utilities/groupActions.ts` helper and re-shown per game; the
four `main.ts` files supply the game-specific callbacks. Follow buttons
are plain clicks; the old long-press / right-click reset is gone.

Contents, in order:

1. **Delete local** — discards this group's saved brains from this
   browser (behind a confirm dialog), one group at a time, then reloads
   the group's stored model from the server, so the group keeps running
   on the community best instead of a fresh random brain.
2. **Reload remote** — downloads the group's best stored model from the
   server and overwrites the local save.
3. **Delete remote** — deletes the group's stored models from the server
   (danger button).
4. **Train from** — a select that points the group at a teacher brain
   group (or frees it); the closed select wears the target group's color.
   In the `all` view the row names the group the visualizer is showing
   instead.
5. **Readouts**, refreshed on follow change and about every 500 ms while
   open: the teacher's score, the group's seed best, its cross-seed global
   best, the server snapshot score, and the last sync time.
6. **Live loss** — a small graph of the followed student's distiller
   loss, shown only while the group is training.

## Server contract

The server is the authority on model uploads: `POST /api/models` accepts
only when the submitted global score strictly beats the group's stored
best (otherwise `409 not-better`), and circuit submissions additionally
need `trackCount >= 10` (otherwise `422`). The automatic submit-on-beat
goes through the same acceptance, so a submission loses when a different
visitor has already raised the group's best. Base models load silently at
boot; there is no manual load button.
