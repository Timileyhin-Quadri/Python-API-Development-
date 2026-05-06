# import sys
# from pathlib import Path

# Add parent directory to path so we can import app module
# sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from app.calculations import add
@pytest.mark.parametrize(
    "num1, num2, expected",[
        (2, 3, 5),
        (-1, 1, 0),
        (0, 0, 0),
        (-5, -5, -10)
    ]
)
def test_add(num1, num2, expected):
    """Test the add function."""
    print(f"Testing add({num1}, {num2}) == {expected}")
    assert add(num1, num2) == expected


