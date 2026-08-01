export type OwnerType = "person" | "household";
export type RepeatType =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";
export type PaymentStatus = "open" | "paid";
export type BudgetStatus = "green" | "yellow" | "red";
export type ExpenseKind = "fixed" | "variable";
export type IncomeExpectationStatus = "expected" | "received" | "uncertain";

export interface AccountBalance {
  id: string;
  name: string;
  balance: number;
  note?: string;
  updatedAt: string;
}

export interface Person {
  id: string;
  name: string;
  monthlyIncome: number;
  personalAllowance: number;
  sharedCostShare: number;
  savingsGoal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type: "income" | "expense" | "both";
  editable: boolean;
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  ownerType: OwnerType;
  personId?: string;
  date: string;
  repeat: RepeatType;
  intervalDays?: number;
  category: string;
  note?: string;
  expectationStatus?: IncomeExpectationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  kind: ExpenseKind;
  category: string;
  date: string;
  ownerType: OwnerType;
  personId?: string;
  status: PaymentStatus;
  repeat: RepeatType;
  intervalDays?: number;
  note?: string;
  critical?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  creditor: string;
  totalAmount: number;
  paidAmount: number;
  monthlyRate: number;
  dueDate: string;
  status: string;
  notes?: string;
}

export interface CategoryBudget {
  category: string;
  monthlyLimit: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyAmount: number;
  dueDate: string;
  mandatory: boolean;
  personId?: string;
}

export interface HouseholdBudgetData {
  accounts: AccountBalance[];
  persons: Person[];
  categories: Category[];
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  savingsGoals: SavingsGoal[];
  categoryBudgets?: CategoryBudget[];
}

export interface PersonBudget {
  personId: string;
  name: string;
  income: number;
  ownExpenses: number;
  sharedCostShare: number;
  savings: number;
  freeMoney: number;
  dailyBudget: number;
}

export type BillUrgency = "overdue" | "today" | "soon" | "later";

export interface BillOccurrence {
  key: string;
  expenseId: string;
  name: string;
  amount: number;
  dueDate: Date;
  category: string;
  kind: ExpenseKind;
  critical: boolean;
  note?: string;
  daysUntilDue: number;
  urgency: BillUrgency;
}

export interface LiquidityDay {
  date: Date;
  income: number;
  bills: number;
  billNames: string[];
  balance: number;
}

export interface PaymentPlan {
  bills: BillOccurrence[];
  overdue: BillOccurrence[];
  dueToday: BillOccurrence[];
  dueNext7Days: BillOccurrence[];
  billsTotal: number;
  criticalTotal: number;
  openingBalance: number;
  reserve: number;
  days: LiquidityDay[];
  lowestBalance: number;
  lowestBalanceDate?: Date;
  shortfall: number;
  shortfallDate?: Date;
  allBillsCovered: boolean;
  safeToSpendPerDay: number;
  safeToSpendTotal: number;
  actions: string[];
}

export interface BudgetSummary {
  monthStart: Date;
  monthEnd: Date;
  remainingDays: number;
  remainingWeeks: number;
  totalIncome: number;
  incomeStillExpected: number;
  accountBalanceTotal: number;
  availableFunds: number;
  totalExpenses: number;
  paidExpenses: number;
  fixedCosts: number;
  variableExpenses: number;
  openBills: number;
  openCriticalBills: Expense[];
  mandatorySavings: number;
  householdBudget: number;
  remainingMoney: number;
  dailyBudget: number;
  weeklyBudget: number;
  averageDailySpendSoFar: number;
  averageVariableDailySpend: number;
  projectedRunOutDate?: Date;
  savingsNeededPerDay: number;
  missingMoney: number;
  missingDays: number;
  status: BudgetStatus;
  statusText: string;
  personBudgets: PersonBudget[];
  spendingCuts: string[];
  paymentPlan: PaymentPlan;
  safeToSpendPerDay: number;
  safeToSpendPerWeek: number;
  allBillsCovered: boolean;
  billShortfall: number;
  billShortfallDate?: Date;
  nextBill?: BillOccurrence;
}

/** Einheitliche Euro-Formatierung fuer die gesamte Oberflaeche. */
export const formatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

// Die Tempo-Hochrechnung braucht genug Beobachtungstage. Am 1. eines Monats
// würde eine einzelne Ausgabe durch einen Tag geteilt und als täglicher
// Verbrauch hochgerechnet - das ergibt absurde Werte.
const MIN_DAYS_FOR_TREND = 5;

const dayMs = 24 * 60 * 60 * 1000;

export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const toDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export const getMonthStart = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);
export const getMonthEnd = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

export function calculateRemainingDaysInMonth(
  today: Date,
  monthDate: Date = today,
): number {
  const end = getMonthEnd(monthDate);
  if (today > end) return 0;
  const normalizedToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.max(
    1,
    Math.floor((end.getTime() - normalizedToday.getTime()) / dayMs) + 1,
  );
}

/**
 * Liest Datumswerte immer als lokalen Kalendertag.
 * `new Date("2026-05-03")` wäre UTC-Mitternacht und könnte je nach Zeitzone
 * einen Tag zurückspringen - das würde Fälligkeiten und Budgets verschieben.
 */
export function parseDateValue(value: string | Date): Date {
  if (value instanceof Date) return normalizeDate(value);
  const isoDayMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoDayMatch) {
    return new Date(
      Number(isoDayMatch[1]),
      Number(isoDayMatch[2]) - 1,
      Number(isoDayMatch[3]),
    );
  }
  return normalizeDate(new Date(value));
}

function isSameMonth(dateString: string, selectedDate: Date): boolean {
  const date = parseDateValue(dateString);
  return (
    date.getFullYear() === selectedDate.getFullYear() &&
    date.getMonth() === selectedDate.getMonth()
  );
}

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function differenceInDays(from: Date, to: Date): number {
  return Math.round(
    (normalizeDate(to).getTime() - normalizeDate(from).getTime()) / dayMs,
  );
}

function getMonthlyOccurrenceCount(
  dateString: string,
  repeat: RepeatType,
  selectedDate: Date,
  intervalDays = 1,
): number {
  const startDate = parseDateValue(dateString);
  const monthStart = getMonthStart(selectedDate);
  const monthEnd = getMonthEnd(selectedDate);

  if (repeat === "once") return isSameMonth(dateString, selectedDate) ? 1 : 0;
  if (repeat === "yearly")
    return startDate.getMonth() === selectedDate.getMonth() &&
      startDate <= monthEnd
      ? 1
      : 0;
  if (startDate > monthEnd) return 0;

  if (repeat === "monthly") {
    const occurrence = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      Math.min(startDate.getDate(), monthEnd.getDate()),
    );
    return occurrence >= monthStart && occurrence >= startDate ? 1 : 0;
  }

  const days =
    repeat === "weekly"
      ? 7
      : repeat === "custom"
        ? Math.max(1, intervalDays || 1)
        : 1;
  const firstOccurrence =
    startDate < monthStart
      ? new Date(
          startDate.getTime() +
            Math.ceil(
              (monthStart.getTime() - startDate.getTime()) / (days * dayMs),
            ) *
              days *
              dayMs,
        )
      : startDate;

  if (firstOccurrence > monthEnd) return 0;
  return (
    Math.floor(
      (monthEnd.getTime() - firstOccurrence.getTime()) / (days * dayMs),
    ) + 1
  );
}

function getOccurrenceCountFromToday(
  dateString: string,
  repeat: RepeatType,
  today: Date,
  selectedDate: Date,
  intervalDays = 1,
): number {
  const monthEnd = getMonthEnd(selectedDate);
  const normalizedToday = normalizeDate(today);
  const selectedMonthStart = getMonthStart(selectedDate);
  const fromDate =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth()
      ? normalizedToday
      : selectedMonthStart;

  if (fromDate > monthEnd) return 0;
  const startDate = parseDateValue(dateString);
  if (repeat === "once")
    return isSameMonth(dateString, selectedDate) && startDate >= fromDate
      ? 1
      : 0;
  if (repeat === "yearly") {
    const occurrence = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      Math.min(startDate.getDate(), monthEnd.getDate()),
    );
    return startDate.getMonth() === selectedDate.getMonth() &&
      occurrence >= fromDate &&
      startDate <= occurrence
      ? 1
      : 0;
  }
  if (repeat === "monthly") {
    const occurrence = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      Math.min(startDate.getDate(), monthEnd.getDate()),
    );
    return occurrence >= fromDate && occurrence >= startDate ? 1 : 0;
  }
  if (startDate > monthEnd) return 0;

  const days =
    repeat === "weekly"
      ? 7
      : repeat === "custom"
        ? Math.max(1, intervalDays || 1)
        : 1;
  const firstOccurrence =
    startDate < fromDate
      ? new Date(
          startDate.getTime() +
            Math.ceil(
              (fromDate.getTime() - startDate.getTime()) / (days * dayMs),
            ) *
              days *
              dayMs,
        )
      : startDate;

  if (firstOccurrence > monthEnd) return 0;
  return (
    Math.floor(
      (monthEnd.getTime() - firstOccurrence.getTime()) / (days * dayMs),
    ) + 1
  );
}

function occursInMonth(
  dateString: string,
  repeat: RepeatType,
  selectedDate: Date,
  intervalDays = 1,
): boolean {
  return (
    getMonthlyOccurrenceCount(dateString, repeat, selectedDate, intervalDays) >
    0
  );
}

function occursFromToday(
  dateString: string,
  repeat: RepeatType,
  today: Date,
  selectedDate: Date,
  intervalDays = 1,
): boolean {
  return (
    getOccurrenceCountFromToday(
      dateString,
      repeat,
      today,
      selectedDate,
      intervalDays,
    ) > 0
  );
}

/**
 * Alle konkreten Termine eines Eintrags im gewählten Monat.
 * Die Anzahl entspricht exakt `getMonthlyOccurrenceCount`, damit Summen und
 * Fälligkeitsliste nie auseinanderlaufen.
 */
export function getMonthlyOccurrenceDates(
  item: Pick<Income | Expense, "date" | "repeat" | "intervalDays">,
  selectedDate: Date,
): Date[] {
  const startDate = parseDateValue(item.date);
  const monthStart = getMonthStart(selectedDate);
  const monthEnd = getMonthEnd(selectedDate);

  if (item.repeat === "once")
    return isSameMonth(item.date, selectedDate) ? [startDate] : [];

  if (item.repeat === "yearly") {
    if (startDate.getMonth() !== selectedDate.getMonth() || startDate > monthEnd)
      return [];
    return [
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        Math.min(startDate.getDate(), monthEnd.getDate()),
      ),
    ];
  }

  if (startDate > monthEnd) return [];

  if (item.repeat === "monthly") {
    const occurrence = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      Math.min(startDate.getDate(), monthEnd.getDate()),
    );
    return occurrence >= monthStart && occurrence >= startDate
      ? [occurrence]
      : [];
  }

  const step =
    item.repeat === "weekly"
      ? 7
      : item.repeat === "custom"
        ? Math.max(1, item.intervalDays || 1)
        : 1;
  const dates: Date[] = [];
  let current =
    startDate < monthStart
      ? addDays(
          startDate,
          Math.ceil(differenceInDays(startDate, monthStart) / step) * step,
        )
      : startDate;
  while (current <= monthEnd) {
    dates.push(current);
    current = addDays(current, step);
  }
  return dates;
}

function sum(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0));
}

function getMonthlyAmount(
  item: Pick<Income | Expense, "amount" | "date" | "repeat" | "intervalDays">,
  selectedDate: Date,
): number {
  return roundMoney(
    item.amount *
      getMonthlyOccurrenceCount(
        item.date,
        item.repeat,
        selectedDate,
        item.intervalDays,
      ),
  );
}

function getAmountFromToday(
  item: Pick<Income | Expense, "amount" | "date" | "repeat" | "intervalDays">,
  today: Date,
  selectedDate: Date,
): number {
  return roundMoney(
    item.amount *
      getOccurrenceCountFromToday(
        item.date,
        item.repeat,
        today,
        selectedDate,
        item.intervalDays,
      ),
  );
}

export function getMonthlyIncomes(
  incomes: Income[],
  selectedDate: Date,
): Income[] {
  return incomes.filter((income) =>
    occursInMonth(
      income.date,
      income.repeat,
      selectedDate,
      income.intervalDays,
    ),
  );
}

export function getMonthlyExpenses(
  expenses: Expense[],
  selectedDate: Date,
): Expense[] {
  return expenses.filter((expense) =>
    occursInMonth(
      expense.date,
      expense.repeat,
      selectedDate,
      expense.intervalDays,
    ),
  );
}

export function calculateTotalIncome(
  data: HouseholdBudgetData,
  selectedDate: Date,
): number {
  return sum(
    getMonthlyIncomes(data.incomes, selectedDate).map((income) =>
      getMonthlyAmount(income, selectedDate),
    ),
  );
}

export function calculateTotalExpenses(
  data: HouseholdBudgetData,
  selectedDate: Date,
): number {
  return sum(
    getMonthlyExpenses(data.expenses, selectedDate).map((expense) =>
      getMonthlyAmount(expense, selectedDate),
    ),
  );
}

export function calculateFixedCosts(
  data: HouseholdBudgetData,
  selectedDate: Date,
): number {
  return sum(
    getMonthlyExpenses(data.expenses, selectedDate)
      .filter((expense) => expense.kind === "fixed")
      .map((expense) => getMonthlyAmount(expense, selectedDate)),
  );
}

export function calculateVariableExpenses(
  data: HouseholdBudgetData,
  selectedDate: Date,
): number {
  return sum(
    getMonthlyExpenses(data.expenses, selectedDate)
      .filter((expense) => expense.kind === "variable")
      .map((expense) => getMonthlyAmount(expense, selectedDate)),
  );
}

/**
 * Alle noch offenen Rechnungen des Monats - bewusst inklusive offener
 * variabler Ausgaben, damit nichts Unbezahltes aus der Reserve fällt.
 */
export function calculateOpenBills(
  data: HouseholdBudgetData,
  selectedDate: Date,
): number {
  return sum(
    getMonthlyExpenses(data.expenses, selectedDate)
      .filter((expense) => expense.status === "open")
      .map((expense) => getMonthlyAmount(expense, selectedDate)),
  );
}

export function calculateRemainingMoney(
  totalIncome: number,
  paidExpenses: number,
  openBills: number,
  mandatorySavings: number,
): number {
  return roundMoney(totalIncome - paidExpenses - openBills - mandatorySavings);
}

export function calculateDailyBudget(
  remainingMoney: number,
  remainingDays: number,
): number {
  return remainingDays <= 0
    ? 0
    : roundMoney(Math.max(0, remainingMoney) / remainingDays);
}

export function calculateWeeklyBudget(
  remainingMoney: number,
  remainingDays: number,
): number {
  return roundMoney(calculateDailyBudget(remainingMoney, remainingDays) * 7);
}

export function calculateProjectedRunOutDate(
  remainingMoney: number,
  averageDailySpend: number,
  today: Date,
  monthEnd: Date,
): Date | undefined {
  if (remainingMoney < 0) return today;
  if (averageDailySpend <= 0) return undefined;
  const daysAffordable = Math.floor(remainingMoney / averageDailySpend);
  const date = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysAffordable,
  );
  return date < monthEnd ? date : undefined;
}

export function calculateSavingsNeededPerDay(
  remainingMoney: number,
  remainingDays: number,
): number {
  return remainingMoney >= 0 || remainingDays <= 0
    ? 0
    : roundMoney(Math.abs(remainingMoney) / remainingDays);
}

function getUrgency(daysUntilDue: number): BillUrgency {
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue === 0) return "today";
  if (daysUntilDue <= 7) return "soon";
  return "later";
}

/**
 * Baut aus allen offenen Ausgaben eine Liste konkreter Fälligkeiten
 * im gewählten Monat - überfällige zuerst.
 */
export function buildBillSchedule(
  data: HouseholdBudgetData,
  selectedDate: Date,
  today: Date = new Date(),
): BillOccurrence[] {
  const normalizedToday = normalizeDate(today);
  const bills: BillOccurrence[] = [];

  data.expenses
    .filter((expense) => expense.status === "open")
    .forEach((expense) => {
      getMonthlyOccurrenceDates(expense, selectedDate).forEach((dueDate) => {
        const daysUntilDue = differenceInDays(normalizedToday, dueDate);
        bills.push({
          key: `${expense.id}-${toDateInputValue(dueDate)}`,
          expenseId: expense.id,
          name: expense.name,
          amount: roundMoney(expense.amount),
          dueDate,
          category: expense.category,
          kind: expense.kind,
          critical: Boolean(expense.critical),
          note: expense.note,
          daysUntilDue,
          urgency: getUrgency(daysUntilDue),
        });
      });
    });

  return bills.sort(
    (a, b) =>
      a.dueDate.getTime() - b.dueDate.getTime() ||
      Number(b.critical) - Number(a.critical) ||
      b.amount - a.amount,
  );
}

/**
 * Noch erwartete Einnahmen mit konkretem Eingangsdatum.
 * Bereits eingegangene Einnahmen zählen nur für zukünftige Termine, weil der
 * heutige Eingang schon im Kontostand steckt.
 */
export function buildIncomeSchedule(
  data: HouseholdBudgetData,
  selectedDate: Date,
  fromDate: Date,
): { date: Date; amount: number }[] {
  const entries: { date: Date; amount: number }[] = [];
  data.incomes
    .filter((income) => income.expectationStatus !== "uncertain")
    .forEach((income) => {
      const earliest =
        income.expectationStatus === "received"
          ? addDays(fromDate, 1)
          : fromDate;
      getMonthlyOccurrenceDates(income, selectedDate)
        .filter((date) => date >= earliest)
        .forEach((date) => entries.push({ date, amount: income.amount }));
    });
  return entries;
}

/**
 * Der Kern der Monatsende-Garantie.
 *
 * Simuliert Tag für Tag den Kontostand aus Startguthaben, erwarteten Einnahmen
 * und offenen Rechnungen. Daraus folgt der Betrag, der jeden Tag frei ausgegeben
 * werden darf, ohne dass an irgendeinem Tag bis Monatsende eine Rechnung platzt:
 *
 *   sicherProTag = min über alle Tage i von
 *                  (Kontostand am Tag i - Reserve) / (Anzahl Tage bis i)
 */
export function getPlanningStartDate(selectedDate: Date, today: Date): Date {
  const normalizedToday = normalizeDate(today);
  const monthStart = getMonthStart(selectedDate);
  const monthEnd = getMonthEnd(selectedDate);
  const isCurrentMonth =
    selectedDate.getFullYear() === normalizedToday.getFullYear() &&
    selectedDate.getMonth() === normalizedToday.getMonth();
  if (!isCurrentMonth) return monthStart;
  return normalizedToday > monthEnd ? monthEnd : normalizedToday;
}

export function buildPaymentPlan(
  data: HouseholdBudgetData,
  selectedDate: Date,
  today: Date = new Date(),
  openingBalance?: number,
): PaymentPlan {
  const monthEnd = getMonthEnd(selectedDate);
  const fromDate = getPlanningStartDate(selectedDate, today);

  const bills = buildBillSchedule(data, selectedDate, today);
  const billsTotal = sum(bills.map((bill) => bill.amount));
  const criticalTotal = sum(
    bills.filter((bill) => bill.critical).map((bill) => bill.amount),
  );
  const reserve = sum(
    data.savingsGoals
      .filter((goal) => goal.mandatory)
      .map((goal) => goal.monthlyAmount),
  );

  const accountTotal = sum((data.accounts || []).map((a) => a.balance));
  const start =
    openingBalance !== undefined ? openingBalance : roundMoney(accountTotal);

  const incomeEntries = buildIncomeSchedule(data, selectedDate, fromDate);
  const dayCount = Math.max(1, differenceInDays(fromDate, monthEnd) + 1);

  const days: LiquidityDay[] = [];
  let balance = start;
  let safeToSpendPerDay = Number.POSITIVE_INFINITY;
  let lowestBalance = Number.POSITIVE_INFINITY;
  let lowestBalanceDate: Date | undefined;
  let shortfall = 0;
  let shortfallDate: Date | undefined;

  for (let index = 0; index < dayCount; index += 1) {
    const date = addDays(fromDate, index);
    // Überfällige Rechnungen sind sofort fällig und landen auf dem ersten Tag.
    const dayBills = bills.filter((bill) =>
      index === 0
        ? bill.dueDate <= date
        : differenceInDays(bill.dueDate, date) === 0,
    );
    const dayIncome = sum(
      incomeEntries
        .filter((entry) => differenceInDays(entry.date, date) === 0)
        .map((entry) => entry.amount),
    );
    const dayBillTotal = sum(dayBills.map((bill) => bill.amount));

    balance = roundMoney(balance + dayIncome - dayBillTotal);
    days.push({
      date,
      income: dayIncome,
      bills: dayBillTotal,
      billNames: dayBills.map((bill) => bill.name),
      balance,
    });

    const spendable = roundMoney(balance - reserve);
    if (spendable < lowestBalance) {
      lowestBalance = spendable;
      lowestBalanceDate = date;
    }
    if (spendable < 0 && shortfallDate === undefined) {
      shortfallDate = date;
    }
    safeToSpendPerDay = Math.min(safeToSpendPerDay, spendable / (index + 1));
  }

  if (lowestBalance === Number.POSITIVE_INFINITY) lowestBalance = 0;
  if (safeToSpendPerDay === Number.POSITIVE_INFINITY) safeToSpendPerDay = 0;
  if (lowestBalance < 0) shortfall = roundMoney(Math.abs(lowestBalance));

  const allBillsCovered = shortfall === 0;
  const safePerDay = roundMoney(Math.max(0, safeToSpendPerDay));

  const overdue = bills.filter((bill) => bill.urgency === "overdue");
  const dueToday = bills.filter((bill) => bill.urgency === "today");
  const dueNext7Days = bills.filter((bill) => bill.urgency === "soon");

  return {
    bills,
    overdue,
    dueToday,
    dueNext7Days,
    billsTotal,
    criticalTotal,
    openingBalance: start,
    reserve,
    days,
    lowestBalance: roundMoney(lowestBalance),
    lowestBalanceDate,
    shortfall,
    shortfallDate,
    allBillsCovered,
    safeToSpendPerDay: safePerDay,
    safeToSpendTotal: roundMoney(safePerDay * dayCount),
    actions: buildPaymentActions({
      bills,
      overdue,
      dueToday,
      shortfall,
      shortfallDate,
      safePerDay,
      dayCount,
      data,
      hasAccounts: (data.accounts || []).length > 0,
    }),
  };
}

function buildPaymentActions({
  bills,
  overdue,
  dueToday,
  shortfall,
  shortfallDate,
  safePerDay,
  dayCount,
  data,
  hasAccounts,
}: {
  bills: BillOccurrence[];
  overdue: BillOccurrence[];
  dueToday: BillOccurrence[];
  shortfall: number;
  shortfallDate?: Date;
  safePerDay: number;
  dayCount: number;
  data: HouseholdBudgetData;
  hasAccounts: boolean;
}): string[] {
  const actions: string[] = [];
  const formatMoney = (value: number) =>
    `${roundMoney(value).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;

  if (!hasAccounts) {
    actions.push(
      "Trage unter „Kontostände“ dein Girokonto und Bargeld ein. Erst dann kann die Software garantieren, dass das Geld bis Monatsende reicht.",
    );
  }

  if (overdue.length > 0) {
    actions.push(
      `${describeBillCount(overdue.length, "überfällige")} über ${formatMoney(
        overdue.reduce((total, bill) => total + bill.amount, 0),
      )} zuerst bezahlen: ${overdue.map((bill) => bill.name).join(", ")}.`,
    );
  }

  if (dueToday.length > 0) {
    actions.push(
      `Heute fällig: ${dueToday
        .map((bill) => `${bill.name} (${formatMoney(bill.amount)})`)
        .join(", ")}.`,
    );
  }

  if (shortfall > 0) {
    actions.push(
      `Achtung: Am ${shortfallDate?.toLocaleDateString("de-DE")} fehlen ${formatMoney(
        shortfall,
      )}, damit alle Rechnungen bezahlt werden können.`,
    );
    // Bei einer Deckungslücke steht der sichere Tagesbetrag bereits auf 0 €.
    // „Weniger ausgeben“ wäre hier ein leerer Rat.
    actions.push(
      "Sparen beim Alltag reicht dafür nicht - der sichere Tagesbetrag liegt schon bei 0 €. Nötig sind Zahlungsaufschub, Ratenzahlung oder zusätzliche Einnahmen.",
    );
    const shiftable = bills
      .filter((bill) => !bill.critical)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    if (shiftable.length > 0) {
      actions.push(
        `Nicht kritische Rechnungen zum Verschieben oder Teilzahlen: ${shiftable
          .map((bill) => `${bill.name} (${formatMoney(bill.amount)})`)
          .join(", ")}.`,
      );
    }
    const savings = data.savingsGoals.filter((goal) => goal.mandatory);
    if (savings.length > 0) {
      actions.push(
        `Pflichtsparen diesen Monat pausieren würde ${formatMoney(
          savings.reduce((total, goal) => total + goal.monthlyAmount, 0),
        )} freigeben.`,
      );
    }
  } else if (bills.length === 0) {
    actions.push(
      `Aktuell ist keine Rechnung offen. Frei verfügbar: ${formatMoney(safePerDay)} pro Tag.`,
    );
  } else {
    actions.push(
      `${
        bills.length === 1
          ? "Die offene Rechnung ist"
          : `Alle ${bills.length} offenen Rechnungen sind`
      } bis Monatsende gedeckt. Frei verfügbar: ${formatMoney(safePerDay)} pro Tag.`,
    );
  }

  return actions;
}

/** „1 überfällige Rechnung“ statt „1 überfällige Rechnung(en)“. */
export function describeBillCount(count: number, adjective = "offene"): string {
  return count === 1
    ? `1 ${adjective} Rechnung`
    : `${count} ${adjective}n Rechnungen`;
}

export function calculatePersonBudget(
  data: HouseholdBudgetData,
  selectedDate: Date,
  remainingDays: number,
): PersonBudget[] {
  const expenses = getMonthlyExpenses(data.expenses, selectedDate);
  const sharedCosts = sum(
    expenses
      .filter((expense) => expense.ownerType === "household")
      .map((expense) => getMonthlyAmount(expense, selectedDate)),
  );
  const totalShares =
    data.persons.reduce((total, person) => total + person.sharedCostShare, 0) ||
    1;

  return data.persons.map((person) => {
    const income =
      sum(
        getMonthlyIncomes(data.incomes, selectedDate)
          .filter((income) => income.personId === person.id)
          .map((income) => getMonthlyAmount(income, selectedDate)),
      ) || person.monthlyIncome;
    const ownExpenses = sum(
      expenses
        .filter((expense) => expense.personId === person.id)
        .map((expense) => getMonthlyAmount(expense, selectedDate)),
    );
    const sharedCostShare = roundMoney(
      sharedCosts * (person.sharedCostShare / totalShares),
    );
    const savings = sum(
      data.savingsGoals
        .filter((goal) => goal.personId === person.id && goal.mandatory)
        .map((goal) => goal.monthlyAmount),
    );
    const freeMoney = roundMoney(
      income - ownExpenses - sharedCostShare - savings,
    );
    return {
      personId: person.id,
      name: person.name,
      income,
      ownExpenses,
      sharedCostShare,
      savings,
      freeMoney,
      dailyBudget: calculateDailyBudget(freeMoney, remainingDays),
    };
  });
}

export function calculateHouseholdBudget(
  data: HouseholdBudgetData,
  selectedDate: Date,
  today: Date = new Date(),
): BudgetSummary {
  const monthlyExpenses = getMonthlyExpenses(data.expenses, selectedDate);
  const monthStart = getMonthStart(selectedDate);
  const monthEnd = getMonthEnd(selectedDate);
  const remainingDays = calculateRemainingDaysInMonth(today, selectedDate);
  const remainingWeeks = Math.max(1, remainingDays / 7);
  const totalIncome = calculateTotalIncome(data, selectedDate);
  const forecastableIncomes = data.incomes.filter(
    (income) => income.expectationStatus !== "uncertain",
  );
  const incomeStillExpected = sum(
    forecastableIncomes
      .filter((income) =>
        occursFromToday(
          income.date,
          income.repeat,
          today,
          selectedDate,
          income.intervalDays,
        ),
      )
      .map((income) => getAmountFromToday(income, today, selectedDate)),
  );
  const totalExpenses = calculateTotalExpenses(data, selectedDate);
  const paidExpenses = sum(
    monthlyExpenses
      .filter((expense) => expense.status === "paid")
      .map((expense) => getMonthlyAmount(expense, selectedDate)),
  );
  const fixedCosts = calculateFixedCosts(data, selectedDate);
  const variableExpenses = calculateVariableExpenses(data, selectedDate);
  const openBills = calculateOpenBills(data, selectedDate);
  const openCriticalBills = monthlyExpenses.filter(
    (expense) => expense.status === "open" && expense.critical,
  );
  const mandatorySavings = sum(
    data.savingsGoals
      .filter((goal) => goal.mandatory)
      .map((goal) => goal.monthlyAmount),
  );
  const accountBalanceTotal = sum(
    (data.accounts || []).map((account) => account.balance),
  );
  const availableFunds = roundMoney(accountBalanceTotal + incomeStillExpected);
  const planningBase =
    data.accounts && data.accounts.length > 0 ? availableFunds : totalIncome;
  const householdBudget = roundMoney(
    planningBase - fixedCosts - mandatorySavings,
  );
  const remainingMoney = calculateRemainingMoney(
    planningBase,
    data.accounts && data.accounts.length > 0 ? 0 : paidExpenses,
    openBills,
    mandatorySavings,
  );
  const dailyBudget = calculateDailyBudget(remainingMoney, remainingDays);
  const weeklyBudget = calculateWeeklyBudget(remainingMoney, remainingDays);
  const elapsedDays = Math.max(
    1,
    Math.floor((today.getTime() - monthStart.getTime()) / dayMs) + 1,
  );
  const averageDailySpendSoFar = roundMoney(paidExpenses / elapsedDays);
  // Für die Hochrechnung zählt nur der laufende variable Verbrauch. Bereits bezahlte
  // Fixkosten wie die Miete fallen diesen Monat nicht noch einmal an und würden die
  // Prognose sonst jeden Monat grundlos auf Rot ziehen.
  const paidVariableExpenses = sum(
    monthlyExpenses
      .filter(
        (expense) => expense.status === "paid" && expense.kind === "variable",
      )
      .map((expense) => getMonthlyAmount(expense, selectedDate)),
  );
  const averageVariableDailySpend = roundMoney(
    paidVariableExpenses / elapsedDays,
  );
  const projectedRunOutDate =
    elapsedDays >= MIN_DAYS_FOR_TREND
      ? calculateProjectedRunOutDate(
          remainingMoney,
          averageVariableDailySpend,
          today,
          monthEnd,
        )
      : undefined;
  const savingsNeededPerDay = calculateSavingsNeededPerDay(
    remainingMoney,
    remainingDays,
  );
  const missingMoney =
    remainingMoney < 0
      ? Math.abs(remainingMoney)
      : projectedRunOutDate
        ? roundMoney((averageVariableDailySpend - dailyBudget) * remainingDays)
        : 0;
  const missingDays = projectedRunOutDate
    ? Math.max(
        0,
        Math.ceil((monthEnd.getTime() - projectedRunOutDate.getTime()) / dayMs),
      )
    : 0;
  const hasAccounts = Boolean(data.accounts && data.accounts.length > 0);
  const planningStart = getPlanningStartDate(selectedDate, today);
  // Ohne erfasste Konten wird der Monat rein aus dem Plan simuliert: Startwert
  // sind die Einnahmen abzüglich bereits bezahlter Ausgaben und noch
  // ausstehender Einnahmen, die der Zeitstrahl selbst wieder zubucht.
  const scheduledIncomeTotal = sum(
    buildIncomeSchedule(data, selectedDate, planningStart).map(
      (entry) => entry.amount,
    ),
  );
  const paymentPlan = buildPaymentPlan(
    data,
    selectedDate,
    today,
    hasAccounts
      ? accountBalanceTotal
      : roundMoney(totalIncome - paidExpenses - scheduledIncomeTotal),
  );
  const status = calculateBudgetStatus(
    remainingMoney,
    dailyBudget,
    projectedRunOutDate,
    paymentPlan,
  );

  return {
    monthStart,
    monthEnd,
    remainingDays,
    remainingWeeks,
    totalIncome,
    incomeStillExpected,
    accountBalanceTotal,
    availableFunds,
    totalExpenses,
    paidExpenses,
    fixedCosts,
    variableExpenses,
    openBills,
    openCriticalBills,
    mandatorySavings,
    householdBudget,
    remainingMoney,
    dailyBudget,
    weeklyBudget,
    averageDailySpendSoFar,
    averageVariableDailySpend,
    projectedRunOutDate,
    savingsNeededPerDay:
      savingsNeededPerDay ||
      (missingMoney > 0 ? roundMoney(missingMoney / remainingDays) : 0),
    missingMoney: roundMoney(Math.max(0, missingMoney)),
    missingDays,
    status,
    statusText: getBudgetStatusText(status, projectedRunOutDate, paymentPlan),
    personBudgets: calculatePersonBudget(data, selectedDate, remainingDays),
    spendingCuts: buildSpendingCutSuggestions(monthlyExpenses),
    paymentPlan,
    safeToSpendPerDay: paymentPlan.safeToSpendPerDay,
    safeToSpendPerWeek: roundMoney(paymentPlan.safeToSpendPerDay * 7),
    allBillsCovered: paymentPlan.allBillsCovered,
    billShortfall: paymentPlan.shortfall,
    billShortfallDate: paymentPlan.shortfallDate,
    nextBill: paymentPlan.bills[0],
  };
}

export function calculateBudgetStatus(
  remainingMoney: number,
  dailyBudget: number,
  projectedRunOutDate?: Date,
  paymentPlan?: PaymentPlan,
): BudgetStatus {
  // Eine ungedeckte Rechnung ist immer rot - egal wie gut der Monat sonst aussieht.
  if (paymentPlan && !paymentPlan.allBillsCovered) return "red";
  if (remainingMoney < 0) return "red";
  if (paymentPlan && paymentPlan.overdue.length > 0) return "yellow";
  // Die Tempo-Hochrechnung ist nur ein Hinweis: Wer den sicheren Tagesbetrag
  // einhält, kann nicht vorzeitig leer laufen. Deshalb gelb statt rot.
  if (projectedRunOutDate) return "yellow";
  if (dailyBudget < 10) return "yellow";
  return "green";
}

function getBudgetStatusText(
  status: BudgetStatus,
  projectedRunOutDate?: Date,
  paymentPlan?: PaymentPlan,
): string {
  if (paymentPlan && !paymentPlan.allBillsCovered) {
    return `Am ${paymentPlan.shortfallDate?.toLocaleDateString(
      "de-DE",
    )} fehlen ${roundMoney(paymentPlan.shortfall).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} € für offene Rechnungen.`;
  }
  if (status === "green")
    return "Alle Rechnungen sind gedeckt, das Geld reicht bis Monatsende.";
  if (status === "yellow") {
    if (paymentPlan && paymentPlan.overdue.length > 0)
      return `${describeBillCount(paymentPlan.overdue.length, "überfällige")} - bitte zuerst bezahlen.`;
    if (projectedRunOutDate)
      return `Bei deinem bisherigen Tempo wäre das Geld am ${projectedRunOutDate.toLocaleDateString(
        "de-DE",
      )} aufgebraucht. Sicher sind ${formatter.format(
        paymentPlan?.safeToSpendPerDay || 0,
      )} pro Tag.`;
    return "Geld reicht knapp. Bitte vorsichtig ausgeben.";
  }
  return "Geld reicht voraussichtlich nicht bis Monatsende.";
}

function buildSpendingCutSuggestions(expenses: Expense[]): string[] {
  return expenses
    .filter((expense) => expense.kind === "variable")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4)
    .map(
      (expense) =>
        `${expense.category}: ${expense.name} prüfen oder reduzieren (${roundMoney(expense.amount)} €).`,
    );
}

const now = new Date().toISOString();
export const defaultCategories: Category[] = [
  {
    id: "cat-wohnen",
    name: "Wohnen",
    color: "#8b5cf6",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-energie",
    name: "Energie",
    color: "#f59e0b",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-kommunikation",
    name: "Kommunikation",
    color: "#38bdf8",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-lebensmittel",
    name: "Lebensmittel",
    color: "#22c55e",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-mobilitaet",
    name: "Mobilität",
    color: "#fb7185",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-versicherungen",
    name: "Versicherungen",
    color: "#14b8a6",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-schulden",
    name: "Schulden",
    color: "#ef4444",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-gesundheit",
    name: "Gesundheit",
    color: "#06b6d4",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-haustiere",
    name: "Haustiere",
    color: "#a3e635",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-kinder",
    name: "Kinder",
    color: "#f472b6",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-freizeit",
    name: "Freizeit",
    color: "#f97316",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-kleidung",
    name: "Kleidung",
    color: "#c084fc",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-abos",
    name: "Abos",
    color: "#64748b",
    type: "expense",
    editable: true,
  },
  {
    id: "cat-sonstiges",
    name: "Sonstiges",
    color: "#94a3b8",
    type: "both",
    editable: true,
  },
];

export const sampleBudgetData: HouseholdBudgetData = {
  accounts: [
    {
      id: "account-1",
      name: "Girokonto",
      balance: 920,
      note: "manuell anpassbarer Kontostand",
      updatedAt: now,
    },
    { id: "account-2", name: "Bargeld", balance: 80, note: "", updatedAt: now },
  ],
  persons: [
    {
      id: "person-1",
      name: "Person 1",
      monthlyIncome: 1700,
      personalAllowance: 180,
      sharedCostShare: 60,
      savingsGoal: 50,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "person-2",
      name: "Person 2",
      monthlyIncome: 800,
      personalAllowance: 120,
      sharedCostShare: 40,
      savingsGoal: 25,
      createdAt: now,
      updatedAt: now,
    },
  ],
  categories: defaultCategories,
  incomes: [
    {
      id: "income-1",
      name: "Gehalt Person 1",
      amount: 1700,
      ownerType: "person",
      personId: "person-1",
      date: "2026-05-01",
      repeat: "monthly",
      category: "Lohn / Gehalt",
      note: "monatliches Gehalt",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "income-2",
      name: "Gehalt Person 2",
      amount: 600,
      ownerType: "person",
      personId: "person-2",
      date: "2026-05-01",
      repeat: "monthly",
      category: "Lohn / Gehalt",
      note: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "income-3",
      name: "Kindergeld",
      amount: 200,
      ownerType: "household",
      date: "2026-05-10",
      repeat: "monthly",
      category: "Kindergeld",
      note: "",
      createdAt: now,
      updatedAt: now,
    },
  ],
  expenses: [
    {
      id: "expense-1",
      name: "Miete",
      amount: 1455,
      kind: "fixed",
      category: "Wohnen",
      date: "2026-05-03",
      ownerType: "household",
      status: "paid",
      repeat: "monthly",
      note: "",
      critical: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "expense-2",
      name: "Strom",
      amount: 120,
      kind: "fixed",
      category: "Energie",
      date: "2026-05-15",
      ownerType: "household",
      status: "open",
      repeat: "monthly",
      note: "",
      critical: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "expense-3",
      name: "Internet",
      amount: 45,
      kind: "fixed",
      category: "Kommunikation",
      date: "2026-05-05",
      ownerType: "household",
      status: "paid",
      repeat: "monthly",
      note: "",
      critical: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "expense-4",
      name: "Lebensmittel bisher",
      amount: 300,
      kind: "variable",
      category: "Lebensmittel",
      date: "2026-05-14",
      ownerType: "household",
      status: "paid",
      repeat: "once",
      note: "bereits variable Ausgaben",
      critical: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "expense-5",
      name: "Versicherung",
      amount: 80,
      kind: "fixed",
      category: "Versicherungen",
      date: "2026-05-20",
      ownerType: "household",
      status: "open",
      repeat: "monthly",
      note: "offene Pflichtausgabe",
      critical: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  debts: [
    {
      id: "debt-1",
      creditor: "Ratenkredit",
      totalAmount: 1200,
      paidAmount: 400,
      monthlyRate: 60,
      dueDate: "2026-05-25",
      status: "aktiv",
      notes: "Rate in Fixkosten einplanen",
    },
  ],
  savingsGoals: [
    {
      id: "saving-1",
      name: "Notgroschen",
      targetAmount: 1000,
      currentAmount: 240,
      monthlyAmount: 50,
      dueDate: "2026-12-31",
      mandatory: false,
    },
  ],
};
