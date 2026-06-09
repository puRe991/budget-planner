from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Final

import requests
from dotenv import load_dotenv

load_dotenv()

NOTION_API_URL: Final = "https://api.notion.com/v1"
NOTION_VERSION: Final = os.getenv("NOTION_VERSION", "2022-06-28")

MONEY_FLOW_TYPES: Final = {
    "variableCosts": "variable cost",
    "fixedCosts": "fixed cost",
    "variableIncomes": "variable income",
    "fixedIncomes": "fixed income",
    "savings": "savings rate",
}


class NotionConfigurationError(RuntimeError):
    """Raised when required Notion environment variables are missing."""


class NotionQueryError(RuntimeError):
    """Raised when Notion returns an error or invalid response."""


def get_budget_data(options: dict[str, Any]) -> list[dict[str, Any]]:
    """Fetch and normalize budget data from the configured Notion database."""
    database_id = os.getenv("NOTION_DATABASE_ID")
    notion_token = os.getenv("NOTION_TOKEN")
    if not database_id or not notion_token:
        raise NotionConfigurationError(
            "NOTION_TOKEN und NOTION_DATABASE_ID müssen für Notion-Abfragen gesetzt sein."
        )

    body = _build_query_body(options)
    results = _get_results(database_id=database_id, token=notion_token, body=body)
    return [_normalize_page(page) for page in results]


def _build_query_body(options: dict[str, Any]) -> dict[str, Any]:
    money_flow_type = options.get("type")
    if money_flow_type not in MONEY_FLOW_TYPES.values():
        raise ValueError("type ist ungültig oder fehlt")

    interval_start, interval_end = _get_interval_bounds(options.get("date"), options.get("interval"))

    if money_flow_type in {MONEY_FLOW_TYPES["variableCosts"], MONEY_FLOW_TYPES["variableIncomes"]}:
        return {
            "filter": {
                "and": [
                    {"property": "type", "select": {"equals": money_flow_type}},
                    {"property": "date", "date": {"on_or_after": interval_start.isoformat()}},
                    {"property": "date", "date": {"on_or_before": interval_end.isoformat()}},
                ]
            },
            "sorts": [{"property": "date", "direction": "ascending"}],
        }

    return {
        "filter": {
            "and": [
                {"property": "type", "select": {"equals": money_flow_type}},
                {"property": "start", "date": {"on_or_before": interval_end.isoformat()}},
                {
                    "or": [
                        {"property": "end", "date": {"on_or_after": interval_start.isoformat()}},
                        {"property": "end", "date": {"is_empty": True}},
                    ]
                },
            ]
        }
    }


def _get_interval_bounds(date_value: Any, interval: Any) -> tuple[datetime, datetime]:
    if not isinstance(date_value, str) or not date_value:
        raise ValueError("date ist erforderlich")
    try:
        date = datetime.fromisoformat(date_value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("date ist kein gültiges ISO-Datum") from exc

    if interval == "month":
        start = datetime(date.year, date.month, 1)
        end = datetime(date.year + int(date.month == 12), 1 if date.month == 12 else date.month + 1, 1)
    elif interval == "year":
        start = datetime(date.year, 1, 1)
        end = datetime(date.year + 1, 1, 1)
    else:
        raise ValueError("interval muss 'month' oder 'year' sein")
    return start, end


def _get_results(database_id: str, token: str, body: dict[str, Any]) -> list[dict[str, Any]]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }
    url = f"{NOTION_API_URL}/databases/{database_id}/query"
    results: list[dict[str, Any]] = []
    next_cursor: str | None = None

    while True:
        request_body = dict(body)
        if next_cursor:
            request_body["start_cursor"] = next_cursor
        try:
            response = requests.post(url, headers=headers, json=request_body, timeout=15)
            response.raise_for_status()
            response_data = response.json()
        except requests.RequestException as exc:
            raise NotionQueryError("Notion-Abfrage fehlgeschlagen") from exc
        except ValueError as exc:
            raise NotionQueryError("Notion hat keine gültige JSON-Antwort geliefert") from exc

        page_results = response_data.get("results")
        if not isinstance(page_results, list):
            raise NotionQueryError("Notion-Antwort enthält keine Ergebnisliste")
        results.extend(page_results)

        if not response_data.get("has_more"):
            return results
        next_cursor = response_data.get("next_cursor")
        if not next_cursor:
            raise NotionQueryError("Notion meldet weitere Seiten ohne next_cursor")


def _normalize_page(page: dict[str, Any]) -> dict[str, Any]:
    properties = page.get("properties") or {}
    category = _first_multi_select(properties.get("category"))
    return {
        "type": _select_name(properties.get("type")),
        "name": _title_text(properties.get("name")),
        "amount": _number_value(properties.get("amount")),
        "category": {
            "name": category.get("name"),
            "color": category.get("color"),
        },
        "date": {
            "start": _date_start(properties.get("date")) or _date_start(properties.get("start")),
            "end": _date_start(properties.get("end")),
        },
        "area": _select_name(properties.get("area")),
        "cancelDate": _date_start(properties.get("cancel_on")),
    }


def _select_name(prop: dict[str, Any] | None) -> str | None:
    select = (prop or {}).get("select") or {}
    return select.get("name")


def _title_text(prop: dict[str, Any] | None) -> str | None:
    title = (prop or {}).get("title") or []
    if not title:
        return None
    return ((title[0].get("text") or {}).get("content"))


def _number_value(prop: dict[str, Any] | None) -> int | float | None:
    return (prop or {}).get("number")


def _date_start(prop: dict[str, Any] | None) -> str | None:
    date = (prop or {}).get("date") or {}
    return date.get("start")


def _first_multi_select(prop: dict[str, Any] | None) -> dict[str, Any]:
    values = (prop or {}).get("multi_select") or []
    return values[0] if values else {}
