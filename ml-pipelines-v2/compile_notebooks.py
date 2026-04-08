"""Assemble .ipynb files from notebook_templates. Run: python compile_notebooks.py"""

from __future__ import annotations

import json
from pathlib import Path

import notebook_templates as T

NB_DIR = Path(__file__).resolve().parent / "notebooks"

META = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {
        "name": "python",
        "pygments_lexer": "ipython3",
    },
}


def write_nb(name: str, cells: list) -> None:
    NB_DIR.mkdir(parents=True, exist_ok=True)
    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": META,
        "cells": cells,
    }
    path = NB_DIR / f"{name}.ipynb"
    path.write_text(json.dumps(nb, indent=1), encoding="utf-8")
    print("Wrote", path)


def main() -> None:
    write_nb("donor_churn_classifier", T.donor_churn_classifier())
    write_nb("reintegration_readiness", T.reintegration_readiness())
    write_nb("social_media_donation_predictor", T.social_media_donation_predictor())
    write_nb("donor_upgrade_scoring", T.donor_upgrade_scoring())
    write_nb("resident_health_trajectory", T.resident_health_trajectory())
    write_nb("incident_risk_classifier", T.incident_risk_classifier())


if __name__ == "__main__":
    main()
