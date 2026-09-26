"""Regions investigated. Keep this list short: every case must be checked by a human.

lat/lon is the grid-cell centre used for NASA POWER point queries (~0.5 deg MERRA-2 cells,
roughly 50 km: city-scale, not neighbourhood-scale).
"""

REGIONS = {
    "chennai": {"name": "Chennai", "lat": 13.08, "lon": 80.27,
                "blurb": "Coastal megacity; 2015 floods, 2019 'Day Zero' water crisis"},
    "nilgiris": {"name": "Nilgiris", "lat": 11.41, "lon": 76.70,
                 "blurb": "Western Ghats hill district; forests and tea estates"},
    "pulicat": {"name": "Pulicat Lake", "lat": 13.55, "lon": 80.18,
                "blurb": "India's second-largest brackish lagoon, north of Chennai"},
}
