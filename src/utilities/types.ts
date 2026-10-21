/**
 * How an entity is driven. `HUMAN` exists for every game, though some
 * (highway) never assign it.
 */
export enum ControlType {
  KEYS,
  DUMMY,
  AI,
  HUMAN,
}
