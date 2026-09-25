# Front-facing sensors (circuit)

The sensor fan is a front-centered 120° arc of 19 rays. The rays are not
evenly spaced: `SENSOR_FORWARD_BIAS` (2) power-warps the spacing so the edge
rays stay at ±60° while the rest pack toward the heading (the middle third of
the rays cover only ~5% of the arc). Reach follows a cosine bell over each
ray's actual angle:
`SENSORS_MAX_LENGTH` (336) at the center and `SENSORS_EDGE_LENGTH` (202) at
the edges, a 40% forward-reach extension. Only the followed car draws its
sensor fan polygon; all cars still use sensor readings for their brains.
