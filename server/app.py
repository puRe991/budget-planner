from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from flask import Flask, jsonify, request

from budget_planner.budget_engine import calculate_household_budget, sample_budget_data
from server.notion import NotionConfigurationError, NotionQueryError, get_budget_data

logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """Create the Flask application used by local development and production."""
    app = Flask(__name__)

    @app.get("/api")
    def api_status():
        return jsonify({"message": "Hello from Python server!"})

    @app.get("/budgetData")
    def budget_data():
        options = {
            "type": request.args.get("type"),
            "date": request.args.get("date"),
            "interval": request.args.get("interval"),
        }
        try:
            return jsonify(get_budget_data(options))
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except NotionConfigurationError as exc:
            logger.warning("Notion configuration error: %s", exc)
            return jsonify({"error": str(exc)}), 503
        except NotionQueryError as exc:
            logger.exception("Notion query failed")
            return jsonify({"error": str(exc)}), 502

    @app.post("/api/budget/summary")
    def budget_summary():
        payload: dict[str, Any] = request.get_json(silent=True) or {}
        data = payload.get("data") or sample_budget_data()

        try:
            selected_date = _parse_iso_datetime(payload.get("selectedDate"), "selectedDate")
            today = _parse_iso_datetime(payload.get("today"), "today")
            summary = calculate_household_budget(data, selected_date=selected_date, today=today)
        except (TypeError, ValueError, KeyError) as exc:
            return jsonify({"error": f"Ungültige Budgetdaten: {exc}"}), 400
        return jsonify(summary)

    return app


def _parse_iso_datetime(value: Any, field_name: str) -> datetime | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} muss ein ISO-Datumsstring sein")
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError(f"{field_name} ist kein gültiges ISO-Datum") from exc
    return parsed.astimezone(timezone.utc).replace(tzinfo=None) if parsed.tzinfo else parsed


app = create_app()


if __name__ == "__main__":
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
    port = int(os.getenv("PORT", "3001"))
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=port)
