# Currently working on

## Goal: Cars numbers for each layers based on their global score ratio scores

- given 1000 cars and 3 layers
- scores for each layers are
1:100 2:50 3:10

we want to have
900% the amount of cars for layer 3 than for layer 1 and layer 2 about at 200% of layer 1

that way it would give time for late-game models to catch up with early-game ones and compare the end game with better balance

## how it works

Each cars compete against each other but progression saved and compared between neural network having the same amount of layers

car names are set as such:

- amount of neural layers
- neural network generation
- mutation index (0 being the original)

showing as `layers-gen-index`

### Score legend

- 👶 neural network is first generation
- 💀 car has crashed
- 📈 car has crashed with a higher score
- 💗 car is racing
- 🏆 car is besting the best score
- 👻 ghost car from a previous generation
