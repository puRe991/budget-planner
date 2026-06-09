from datetime import date

from budget_planner.budget_engine import (
    calculate_household_budget,
    get_monthly_occurrence_count,
    sample_budget_data,
)


def test_sample_budget_matches_expected_dashboard_numbers():
    summary = calculate_household_budget(
        sample_budget_data(), selected_date=date(2026, 5, 15), today=date(2026, 5, 15)
    )

    assert summary["remainingDays"] == 17
    assert summary["totalIncome"] == 2500
    assert summary["paidExpenses"] == 1800
    assert summary["openBills"] == 200
    assert summary["remainingMoney"] == 800
    assert summary["dailyBudget"] == 47.06
    assert summary["status"] == "red"
    assert summary["projectedRunOutDate"] == "2026-05-21"


def test_monthly_occurrence_clamps_day_to_short_month():
    assert get_monthly_occurrence_count("2026-01-31", "monthly", date(2026, 2, 1)) == 1


def test_custom_repeat_counts_only_remaining_occurrences():
    data = sample_budget_data()
    data["accounts"] = []
    data["expenses"].append(
        {
            "id": "expense-custom",
            "name": "Alle drei Tage",
            "amount": 10,
            "kind": "variable",
            "category": "Sonstiges",
            "date": "2026-05-01",
            "ownerType": "household",
            "status": "paid",
            "repeat": "custom",
            "intervalDays": 3,
        }
    )

    summary = calculate_household_budget(data, selected_date=date(2026, 5, 1), today=date(2026, 5, 20))

    assert summary["variableExpenses"] == 410
