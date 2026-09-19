# Front-facing sensors (circuit)

The sensor fan is a front-centered 120° arc (it was a symmetric ~315°
fan). Ray reach follows a cosine bell over the arc:
SENSORS_MAX_LENGTH (240) at the center ray, SENSORS_EDGE_LENGTH (144) at
the edges — the car sees much further along the direction it is
pointing. Ray count, reading semantics and the brain input count are
unchanged; the old SENSORS_MAX_DEPTH / SENSORS_MAX_WIDTH were replaced
by the two length constants.
