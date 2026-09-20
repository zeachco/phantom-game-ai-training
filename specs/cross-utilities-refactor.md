# Shared driving-game utilities

Highway and circuit share the common AI color infrastructure in
`src/utilities/ai/colors.ts`: layer colors, live mixed-brain blends, and saved
mixed-model blends use the same implementation. The shared game loop also
supports optional frame caps. Game-specific utilities keep only their map,
car, sensor, scoring, and state differences.
