# neural network params

## Lexic

wp = Waypoint
d, dist = distance
v = velocity
a = angle
r = relative
f = fuel
x, y, z = positions
cur = current
prev = previous
init = initial

## Inputs

1. cur wp dx
2. cur wp dy
3. next wp dx
4. next wp dy
5. cur vx
6. cur vy
7. cur va
8. cur a

## Outputs

1. propulse left
2. propulse right

### Kill points

- cur d from wp is greater than 1.1x the initial distance

### Backward propagation

- cur d versus p d

### Promote bests

- sort by completed waypoints \* 10
- % completed distance to next wp

## Scenario

- Init bunch of ships, each with 100 fuel
- Randomize brains
- when no fuel, ships continue to float
- each wp gives back Math.max(0, 100 - wp count) fuel value
- when amount of fuelled ships <= 1, calculate scores and restart experiment
