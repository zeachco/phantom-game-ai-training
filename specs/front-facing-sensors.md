# Front-facing sensors (circuit)

The sensor fan is a front-centered 120° arc. Reach follows a cosine bell:
`SENSORS_MAX_LENGTH` (336) at the center and `SENSORS_EDGE_LENGTH` (202) at
the edges, a 40% forward-reach extension. Only the followed car draws its
sensor fan polygon; all cars still use sensor readings for their brains.
