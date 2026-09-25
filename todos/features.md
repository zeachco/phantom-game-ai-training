# Features

## List of feature to be done in games/circuit/\*

### One liner Features

- [x] Long-pressing to clear a brain group's local storage should respawn all cars belonging to that instance only, without restarting the race; leave other cars at their current run.
- [ ] Add a fullscreen button bottom right

### best training weakest (todo)

When a group spawn, if it's the worse and there's another group that finished all laps, for each frame, the inputs are also sent to the record holder brain and back propagated until at least 1 lap is done by the weak link.
Learning rate is 1.0/totalFrameForBestFinish, meaning that if the best score took 1000 frames to do, 0.001 is the factor for adjusting the hidden weights in back propagation at each frame the car is going through until crash or completion.
when a brain group starts as the weakest, only one car is generated and mutation shows "learning from <best brain id>"

