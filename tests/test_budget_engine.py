from datetime import date

from budget_planner.budget_engine import (
    build_bill_schedule,
    build_payment_plan,
    calculate_household_budget,
    get_monthly_occurrence_count,
    get_monthly_occurrence_dates,
    sample_budget_data,
)


def _bill(**overrides):
    bill = {
        "id": "expense-test",
        "name": "Testrechnung",
        "amount": 100,
        "kind": "fixed",
        "category": "Wohnen",
        "date": "2026-05-20",
        "ownerType": "household",
        "status": "open",
        "repeat": "monthly",
        "critical": True,
    }
    bill.update(overrides)
    return bill


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
    # Die Hochrechnung nutzt nur den variablen Verbrauch (300 € in 15 Tagen = 20 €/Tag).
    # 800 € reichen damit über den Monat hinaus - kein Aufbrauchdatum, alles gedeckt.
    assert summary["averageVariableDailySpend"] == 20
    assert summary["projectedRunOutDate"] is None
    assert summary["status"] == "green"


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


def test_occurrence_dates_match_occurrence_count():
    item = {"date": "2026-05-02", "repeat": "custom", "intervalDays": 3}
    dates = get_monthly_occurrence_dates(item, date(2026, 5, 15))

    assert len(dates) == get_monthly_occurrence_count("2026-05-02", "custom", date(2026, 5, 15), 3)
    assert dates[0] == date(2026, 5, 2)
    assert dates[-1] <= date(2026, 5, 31)


def test_safe_to_spend_reserves_every_open_bill_until_month_end():
    """1.000 € Kontostand, 120 € heute und 80 € am 20. fällig, keine weiteren
    Einnahmen: es dürfen nur 800 € / 17 Tage frei ausgegeben werden."""
    summary = calculate_household_budget(
        sample_budget_data(), selected_date=date(2026, 5, 15), today=date(2026, 5, 15)
    )

    assert summary["allBillsCovered"] is True
    assert summary["billShortfall"] == 0
    assert summary["safeToSpendPerDay"] == 47.06
    assert summary["safeToSpendPerWeek"] == 329.42


def test_late_income_limits_the_safe_daily_amount():
    """Das Geld kommt erst am 20., die Rechnung ist am 25. fällig. Bis dahin
    darf nur so wenig ausgegeben werden, dass die Rechnung sicher gedeckt ist."""
    data = {
        "accounts": [{"id": "a1", "name": "Giro", "balance": 50}],
        "persons": [],
        "incomes": [
            {
                "id": "income-1",
                "name": "Gehalt",
                "amount": 500,
                "ownerType": "household",
                "date": "2026-05-20",
                "repeat": "monthly",
                "category": "Lohn / Gehalt",
            }
        ],
        "expenses": [_bill(amount=300, date="2026-05-25", name="Miete")],
        "debts": [],
        "savingsGoals": [],
    }

    plan = build_payment_plan(data, date(2026, 5, 15), date(2026, 5, 15))

    assert plan["allBillsCovered"] is True
    # Engpass ist der 19.05.: 50 € müssen für 5 Tage bis zum Gehalt reichen.
    assert plan["safeToSpendPerDay"] == 10
    assert plan["lowestBalance"] == 50
    # Ohne den späten Gehaltseingang wäre die Miete am 25.05. nicht gedeckt.
    assert plan["days"][-1]["balance"] == 250


def test_uncovered_bill_reports_shortfall_and_blocks_spending():
    data = {
        "accounts": [{"id": "a1", "name": "Giro", "balance": 100}],
        "persons": [],
        "incomes": [],
        "expenses": [_bill(amount=500, date="2026-05-20", name="Stromnachzahlung")],
        "debts": [],
        "savingsGoals": [],
    }

    summary = calculate_household_budget(data, selected_date=date(2026, 5, 15), today=date(2026, 5, 15))

    assert summary["allBillsCovered"] is False
    assert summary["billShortfall"] == 400
    assert summary["billShortfallDate"] == "2026-05-20"
    assert summary["safeToSpendPerDay"] == 0
    assert summary["status"] == "red"
    assert "fehlen" in summary["statusText"]


def test_overdue_bills_are_charged_immediately():
    data = {
        "accounts": [{"id": "a1", "name": "Giro", "balance": 400}],
        "persons": [],
        "incomes": [],
        "expenses": [_bill(amount=150, date="2026-05-05", name="Handyrechnung")],
        "debts": [],
        "savingsGoals": [],
    }

    plan = build_payment_plan(data, date(2026, 5, 15), date(2026, 5, 15))

    assert [bill["urgency"] for bill in plan["bills"]] == ["overdue"]
    assert plan["overdue"][0]["daysUntilDue"] == -10
    assert plan["days"][0]["bills"] == 150
    assert plan["days"][0]["balance"] == 250
    assert plan["allBillsCovered"] is True


def test_mandatory_savings_stay_reserved():
    data = {
        "accounts": [{"id": "a1", "name": "Giro", "balance": 200}],
        "persons": [],
        "incomes": [],
        "expenses": [_bill(amount=150, date="2026-05-20")],
        "debts": [],
        "savingsGoals": [
            {"id": "s1", "name": "Notgroschen", "targetAmount": 500, "currentAmount": 0, "monthlyAmount": 100, "dueDate": "2026-12-31", "mandatory": True}
        ],
    }

    plan = build_payment_plan(data, date(2026, 5, 15), date(2026, 5, 15))

    assert plan["reserve"] == 100
    assert plan["allBillsCovered"] is False
    assert plan["shortfall"] == 50


def test_bill_schedule_lists_every_repeating_due_date():
    data = {
        "accounts": [],
        "persons": [],
        "incomes": [],
        "expenses": [_bill(amount=25, date="2026-05-04", repeat="weekly", name="Wocheneinkauf", critical=False)],
        "debts": [],
        "savingsGoals": [],
    }

    bills = build_bill_schedule(data, date(2026, 5, 15), date(2026, 5, 15))

    assert [bill["dueDate"] for bill in bills] == ["2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25"]
    assert [bill["urgency"] for bill in bills] == ["overdue", "overdue", "soon", "later"]
