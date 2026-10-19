from .core import calc, optimise
from .column import column
from .footing import footing as _footing_base
from .footing2 import combined, pilecap


def footing(i):
    """Design any footing type: axial, ecc, sloped, stepped, wall, combined or pilecap."""
    return combined(i) if i["type"] == "combined" else pilecap(i) if i["type"] == "pilecap" else _footing_base(i)


__all__ = ["calc", "optimise", "column", "footing"]
