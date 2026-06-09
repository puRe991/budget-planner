from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta
from math import ceil, floor
from typing import Any, Iterable, Literal
from uuid import uuid4

RepeatType = Literal["once", "daily", "weekly", "monthly", "yearly", "custom"]
BudgetStatus = Literal["green", "yellow", "red"]

DAY = timedelta(days=1)


def round_money(value: float | int) -> float:
    return round(float(value) + 1e-9, 2)


def create_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:12]}"


def parse_date(value: str | date | datetime) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str) or not value:
        raise ValueError("Datum muss ein nicht leerer ISO-String sein")
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def date_to_iso(value: date | datetime | None) -> str | None:
    if value is None:
        return None
    return parse_date(value).isoformat()


def get_month_start(value: date | datetime) -> date:
    parsed = parse_date(value)
    return date(parsed.year, parsed.month, 1)


def get_month_end(value: date | datetime) -> date:
    parsed = parse_date(value)
    return date(parsed.year, parsed.month, monthrange(parsed.year, parsed.month)[1])


def calculate_remaining_days_in_month(today: date | datetime, month_date: date | datetime | None = None) -> int:
    parsed_today = parse_date(today)
    selected = parse_date(month_date or parsed_today)
    end = get_month_end(selected)
    if parsed_today > end:
        return 0
    return max(1, (end - parsed_today).days + 1)


def is_same_month(date_value: str, selected_date: date | datetime) -> bool:
    parsed = parse_date(date_value)
    selected = parse_date(selected_date)
    return parsed.year == selected.year and parsed.month == selected.month


def _interval_days(repeat: str, interval_days: Any = 1) -> int:
    if repeat == "weekly":
        return 7
    if repeat == "custom":
        try:
            return max(1, int(interval_days or 1))
        except (TypeError, ValueError):
            return 1
    return 1


def get_monthly_occurrence_count(
    date_value: str,
    repeat: RepeatType,
    selected_date: date | datetime,
    interval_days: int = 1,
) -> int:
    start_date = parse_date(date_value)
    month_start = get_month_start(selected_date)
    month_end = get_month_end(selected_date)

    if repeat == "once":
        return 1 if is_same_month(date_value, selected_date) else 0
    if repeat == "yearly":
        return 1 if start_date.month == parse_date(selected_date).month and start_date <= month_end else 0
    if start_date > month_end:
        return 0
    if repeat == "monthly":
        occurrence = date(month_start.year, month_start.month, min(start_date.day, month_end.day))
        return 1 if occurrence >= month_start and occurrence >= start_date else 0

    days = _interval_days(repeat, interval_days)
    first = start_date + timedelta(days=ceil((month_start - start_date).days / days) * days) if start_date < month_start else start_date
    if first > month_end:
        return 0
    return floor((month_end - first).days / days) + 1


def get_occurrence_count_from_today(
    date_value: str,
    repeat: RepeatType,
    today: date | datetime,
    selected_date: date | datetime,
    interval_days: int = 1,
) -> int:
    normalized_today = parse_date(today)
    selected = parse_date(selected_date)
    month_end = get_month_end(selected)
    selected_month_start = get_month_start(selected)
    from_date = normalized_today if (selected.year, selected.month) == (normalized_today.year, normalized_today.month) else selected_month_start
    if from_date > month_end:
        return 0

    start_date = parse_date(date_value)
    if repeat == "once":
        return 1 if is_same_month(date_value, selected) and start_date >= from_date else 0
    if repeat == "yearly":
        occurrence = date(selected.year, selected.month, min(start_date.day, month_end.day))
        return 1 if start_date.month == selected.month and occurrence >= from_date and start_date <= occurrence else 0
    if repeat == "monthly":
        occurrence = date(selected.year, selected.month, min(start_date.day, month_end.day))
        return 1 if occurrence >= from_date and occurrence >= start_date else 0
    if start_date > month_end:
        return 0

    days = _interval_days(repeat, interval_days)
    first = start_date + timedelta(days=ceil((from_date - start_date).days / days) * days) if start_date < from_date else start_date
    if first > month_end:
        return 0
    return floor((month_end - first).days / days) + 1


def money_sum(values: Iterable[float | int]) -> float:
    return round_money(sum(float(value or 0) for value in values))


def _amount(item: dict[str, Any], count: int) -> float:
    return round_money(float(item.get("amount") or 0) * count)


def get_monthly_amount(item: dict[str, Any], selected_date: date | datetime) -> float:
    return _amount(item, get_monthly_occurrence_count(item["date"], item.get("repeat", "once"), selected_date, item.get("intervalDays") or 1))


def get_amount_from_today(item: dict[str, Any], today: date | datetime, selected_date: date | datetime) -> float:
    return _amount(item, get_occurrence_count_from_today(item["date"], item.get("repeat", "once"), today, selected_date, item.get("intervalDays") or 1))


def get_monthly_incomes(incomes: list[dict[str, Any]], selected_date: date | datetime) -> list[dict[str, Any]]:
    return [income for income in incomes if get_monthly_occurrence_count(income["date"], income.get("repeat", "once"), selected_date, income.get("intervalDays") or 1) > 0]


def get_monthly_expenses(expenses: list[dict[str, Any]], selected_date: date | datetime) -> list[dict[str, Any]]:
    return [expense for expense in expenses if get_monthly_occurrence_count(expense["date"], expense.get("repeat", "once"), selected_date, expense.get("intervalDays") or 1) > 0]


def calculate_daily_budget(remaining_money: float, remaining_days: int) -> float:
    return 0 if remaining_days <= 0 else round_money(max(0, remaining_money) / remaining_days)


def calculate_weekly_budget(remaining_money: float, remaining_days: int) -> float:
    return round_money(calculate_daily_budget(remaining_money, remaining_days) * 7)


def calculate_projected_run_out_date(remaining_money: float, average_daily_spend: float, today: date, month_end: date) -> date | None:
    if remaining_money < 0:
        return today
    if average_daily_spend <= 0:
        return None
    run_out = today + timedelta(days=floor(remaining_money / average_daily_spend))
    return run_out if run_out < month_end else None


def calculate_budget_status(remaining_money: float, daily_budget: float, projected_run_out_date: date | None = None) -> BudgetStatus:
    if remaining_money < 0 or projected_run_out_date:
        return "red"
    if daily_budget < 10:
        return "yellow"
    return "green"


def calculate_person_budget(data: dict[str, Any], selected_date: date, remaining_days: int) -> list[dict[str, Any]]:
    expenses = get_monthly_expenses(data.get("expenses", []), selected_date)
    shared_costs = money_sum(get_monthly_amount(expense, selected_date) for expense in expenses if expense.get("ownerType") == "household")
    total_shares = sum(float(person.get("sharedCostShare") or 0) for person in data.get("persons", [])) or 1
    monthly_incomes = get_monthly_incomes(data.get("incomes", []), selected_date)

    result = []
    for person in data.get("persons", []):
        person_id = person.get("id")
        income = money_sum(get_monthly_amount(income_item, selected_date) for income_item in monthly_incomes if income_item.get("personId") == person_id) or float(person.get("monthlyIncome") or 0)
        own_expenses = money_sum(get_monthly_amount(expense, selected_date) for expense in expenses if expense.get("personId") == person_id)
        shared_cost_share = round_money(shared_costs * (float(person.get("sharedCostShare") or 0) / total_shares))
        savings = money_sum(goal.get("monthlyAmount") or 0 for goal in data.get("savingsGoals", []) if goal.get("personId") == person_id and goal.get("mandatory"))
        free_money = round_money(income - own_expenses - shared_cost_share - savings)
        result.append({
            "personId": person_id,
            "name": person.get("name", ""),
            "income": income,
            "ownExpenses": own_expenses,
            "sharedCostShare": shared_cost_share,
            "savings": savings,
            "freeMoney": free_money,
            "dailyBudget": calculate_daily_budget(free_money, remaining_days),
        })
    return result


def calculate_household_budget(
    data: dict[str, Any],
    selected_date: date | datetime | None = None,
    today: date | datetime | None = None,
) -> dict[str, Any]:
    selected = parse_date(selected_date or datetime.now())
    current_day = parse_date(today or datetime.now())
    monthly_expenses = get_monthly_expenses(data.get("expenses", []), selected)
    month_start = get_month_start(selected)
    month_end = get_month_end(selected)
    remaining_days = calculate_remaining_days_in_month(current_day, selected)

    total_income = money_sum(get_monthly_amount(income, selected) for income in get_monthly_incomes(data.get("incomes", []), selected))
    forecastable_incomes = [income for income in data.get("incomes", []) if income.get("expectationStatus") != "uncertain"]
    income_still_expected = money_sum(
        get_amount_from_today(income, current_day, selected)
        for income in forecastable_incomes
        if get_occurrence_count_from_today(income["date"], income.get("repeat", "once"), current_day, selected, income.get("intervalDays") or 1) > 0
    )
    total_expenses = money_sum(get_monthly_amount(expense, selected) for expense in monthly_expenses)
    paid_expenses = money_sum(get_monthly_amount(expense, selected) for expense in monthly_expenses if expense.get("status") == "paid")
    fixed_costs = money_sum(get_monthly_amount(expense, selected) for expense in monthly_expenses if expense.get("kind") == "fixed")
    variable_expenses = money_sum(get_monthly_amount(expense, selected) for expense in monthly_expenses if expense.get("kind") == "variable")
    open_bills = money_sum(get_monthly_amount(expense, selected) for expense in monthly_expenses if expense.get("status") == "open" and expense.get("kind") == "fixed")
    mandatory_savings = money_sum(goal.get("monthlyAmount") or 0 for goal in data.get("savingsGoals", []) if goal.get("mandatory"))
    account_balance_total = money_sum(account.get("balance") or 0 for account in data.get("accounts", []))
    available_funds = round_money(account_balance_total + income_still_expected)
    planning_base = available_funds if data.get("accounts") else total_income
    household_budget = round_money(planning_base - fixed_costs - mandatory_savings)
    remaining_money = round_money(planning_base - (0 if data.get("accounts") else paid_expenses) - open_bills - mandatory_savings)
    daily_budget = calculate_daily_budget(remaining_money, remaining_days)
    weekly_budget = calculate_weekly_budget(remaining_money, remaining_days)
    elapsed_days = max(1, (current_day - month_start).days + 1)
    average_daily_spend_so_far = round_money(paid_expenses / elapsed_days)
    projected_run_out = calculate_projected_run_out_date(remaining_money, average_daily_spend_so_far, current_day, month_end)
    savings_needed_per_day = 0 if remaining_money >= 0 or remaining_days <= 0 else round_money(abs(remaining_money) / remaining_days)
    missing_money = abs(remaining_money) if remaining_money < 0 else (round_money((average_daily_spend_so_far - daily_budget) * remaining_days) if projected_run_out else 0)
    missing_days = max(0, ceil((month_end - projected_run_out).days)) if projected_run_out else 0
    status = calculate_budget_status(remaining_money, daily_budget, projected_run_out)

    return {
        "monthStart": date_to_iso(month_start),
        "monthEnd": date_to_iso(month_end),
        "remainingDays": remaining_days,
        "remainingWeeks": max(1, remaining_days / 7),
        "totalIncome": total_income,
        "incomeStillExpected": income_still_expected,
        "accountBalanceTotal": account_balance_total,
        "availableFunds": available_funds,
        "totalExpenses": total_expenses,
        "paidExpenses": paid_expenses,
        "fixedCosts": fixed_costs,
        "variableExpenses": variable_expenses,
        "openBills": open_bills,
        "openCriticalBills": [expense for expense in monthly_expenses if expense.get("status") == "open" and expense.get("critical")],
        "mandatorySavings": mandatory_savings,
        "householdBudget": household_budget,
        "remainingMoney": remaining_money,
        "dailyBudget": daily_budget,
        "weeklyBudget": weekly_budget,
        "averageDailySpendSoFar": average_daily_spend_so_far,
        "projectedRunOutDate": date_to_iso(projected_run_out),
        "savingsNeededPerDay": savings_needed_per_day or (round_money(missing_money / remaining_days) if missing_money > 0 and remaining_days > 0 else 0),
        "missingMoney": round_money(max(0, missing_money)),
        "missingDays": missing_days,
        "status": status,
        "statusText": _budget_status_text(status, projected_run_out),
        "personBudgets": calculate_person_budget(data, selected, remaining_days),
        "spendingCuts": _spending_cut_suggestions(monthly_expenses),
    }


def _budget_status_text(status: BudgetStatus, projected_run_out_date: date | None = None) -> str:
    if status == "green":
        return "Geld reicht voraussichtlich bis Monatsende."
    if status == "yellow":
        return "Geld reicht knapp. Bitte vorsichtig ausgeben."
    if projected_run_out_date:
        return f"Geld reicht voraussichtlich nur bis {projected_run_out_date.strftime('%d.%m.%Y')}."
    return "Geld reicht voraussichtlich nicht bis Monatsende."


def _spending_cut_suggestions(expenses: list[dict[str, Any]]) -> list[str]:
    variable = sorted((expense for expense in expenses if expense.get("kind") == "variable"), key=lambda item: float(item.get("amount") or 0), reverse=True)
    return [f"{expense.get('category')}: {expense.get('name')} prüfen oder reduzieren ({round_money(expense.get('amount') or 0)} €)." for expense in variable[:4]]


def sample_budget_data() -> dict[str, Any]:
    now = datetime.now().isoformat()
    categories = [
        {"id": "cat-wohnen", "name": "Wohnen", "color": "#8b5cf6", "type": "expense", "editable": True},
        {"id": "cat-energie", "name": "Energie", "color": "#f59e0b", "type": "expense", "editable": True},
        {"id": "cat-kommunikation", "name": "Kommunikation", "color": "#38bdf8", "type": "expense", "editable": True},
        {"id": "cat-lebensmittel", "name": "Lebensmittel", "color": "#22c55e", "type": "expense", "editable": True},
        {"id": "cat-versicherungen", "name": "Versicherungen", "color": "#14b8a6", "type": "expense", "editable": True},
        {"id": "cat-sonstiges", "name": "Sonstiges", "color": "#94a3b8", "type": "both", "editable": True},
    ]
    return {
        "accounts": [
            {"id": "account-1", "name": "Girokonto", "balance": 920, "note": "manuell anpassbarer Kontostand", "updatedAt": now},
            {"id": "account-2", "name": "Bargeld", "balance": 80, "note": "", "updatedAt": now},
        ],
        "persons": [
            {"id": "person-1", "name": "Person 1", "monthlyIncome": 1700, "personalAllowance": 180, "sharedCostShare": 60, "savingsGoal": 50, "createdAt": now, "updatedAt": now},
            {"id": "person-2", "name": "Person 2", "monthlyIncome": 800, "personalAllowance": 120, "sharedCostShare": 40, "savingsGoal": 25, "createdAt": now, "updatedAt": now},
        ],
        "categories": categories,
        "incomes": [
            {"id": "income-1", "name": "Gehalt Person 1", "amount": 1700, "ownerType": "person", "personId": "person-1", "date": "2026-05-01", "repeat": "monthly", "category": "Lohn / Gehalt", "note": "monatliches Gehalt", "createdAt": now, "updatedAt": now},
            {"id": "income-2", "name": "Gehalt Person 2", "amount": 600, "ownerType": "person", "personId": "person-2", "date": "2026-05-01", "repeat": "monthly", "category": "Lohn / Gehalt", "note": "", "createdAt": now, "updatedAt": now},
            {"id": "income-3", "name": "Kindergeld", "amount": 200, "ownerType": "household", "date": "2026-05-10", "repeat": "monthly", "category": "Kindergeld", "note": "", "createdAt": now, "updatedAt": now},
        ],
        "expenses": [
            {"id": "expense-1", "name": "Miete", "amount": 1455, "kind": "fixed", "category": "Wohnen", "date": "2026-05-03", "ownerType": "household", "status": "paid", "repeat": "monthly", "note": "", "critical": True, "createdAt": now, "updatedAt": now},
            {"id": "expense-2", "name": "Strom", "amount": 120, "kind": "fixed", "category": "Energie", "date": "2026-05-15", "ownerType": "household", "status": "open", "repeat": "monthly", "note": "", "critical": True, "createdAt": now, "updatedAt": now},
            {"id": "expense-3", "name": "Internet", "amount": 45, "kind": "fixed", "category": "Kommunikation", "date": "2026-05-05", "ownerType": "household", "status": "paid", "repeat": "monthly", "note": "", "critical": False, "createdAt": now, "updatedAt": now},
            {"id": "expense-4", "name": "Lebensmittel bisher", "amount": 300, "kind": "variable", "category": "Lebensmittel", "date": "2026-05-14", "ownerType": "household", "status": "paid", "repeat": "once", "note": "bereits variable Ausgaben", "critical": False, "createdAt": now, "updatedAt": now},
            {"id": "expense-5", "name": "Versicherung", "amount": 80, "kind": "fixed", "category": "Versicherungen", "date": "2026-05-20", "ownerType": "household", "status": "open", "repeat": "monthly", "note": "offene Pflichtausgabe", "critical": True, "createdAt": now, "updatedAt": now},
        ],
        "debts": [{"id": "debt-1", "creditor": "Ratenkredit", "totalAmount": 1200, "paidAmount": 400, "monthlyRate": 60, "dueDate": "2026-05-25", "status": "aktiv", "notes": "Rate in Fixkosten einplanen"}],
        "savingsGoals": [{"id": "saving-1", "name": "Notgroschen", "targetAmount": 1000, "currentAmount": 240, "monthlyAmount": 50, "dueDate": "2026-12-31", "mandatory": False}],
    }
