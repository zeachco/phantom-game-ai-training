# Active bugs and backlog

Only unfinished work remains here; completed behavior lives in `specs/`.

## Circuit

- [ ] Replace the wall-clock 7-second checkpoint timeout with an equivalent frame budget and show a gauge instead of the seconds badge.
- [ ] Increase curve difficulty with the map seed; later maps should add more frequent and more intense hard curves.
- [ ] Add an optional 60 FPS cap, enabled automatically while following the human player.
- [ ] Extend the sensor fan's forward reach by 40%.
- [ ] Move the cockpit controls right; put seed controls top-left with a number display and `<`/`>` buttons that immediately change the map and URL.
- [ ] Change the Follow controls to a four-column grid.
- [ ] Place the explanatory text beside the legend and make that text area vertically scrollable.
- [ ] Color neural-network DOM borders by the selected brain group; keep mixed DOM elements light gray while the canvas follows the mixed selection color.
- [ ] Keep 3 lanes as the default, allow only adjacent 1↔2↔3↔4 transitions, merge only the closing lane's divider into one neighbor, and keep round obstacles safe for the available width.
