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
  projectedRunOutDate?: Date;
  savingsNeededPerDay: number;
  missingMoney: number;
  missingDays: number;
  status: BudgetStatus;
  statusText: string;
  personBudgets: PersonBudget[];
  spendingCuts: string[];
}

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

function isSameMonth(dateString: string, selectedDate: Date): boolean {
  const date = new Date(dateString);
  return (
    date.getFullYear() === selectedDate.getFullYear() &&
    date.getMonth() === selectedDate.getMonth()
  );
}

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMonthlyOccurrenceCount(
  dateString: string,
  repeat: RepeatType,
  selectedDate: Date,
  intervalDays = 1,
): number {
  const startDate = normalizeDate(new Date(dateString));
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
  const startDate = normalizeDate(new Date(dateString));
  if (repeat === "once")
    return isSameMonth(dateString, selectedDate) && startDate >= fromDate
      ? 1
      : 0;
  if (repeat === "yearly") {
    const occurrence = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      startDate.getDate(),
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

export function calculateOpenBills(
  data: HouseholdBudgetData,
  selectedDate: Date,
): number {
  return sum(
    getMonthlyExpenses(data.expenses, selectedDate)
      .filter(
        (expense) => expense.status === "open" && expense.kind === "fixed",
      )
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
  const incomeStillExpected = sum(
    data.incomes
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
  const projectedRunOutDate = calculateProjectedRunOutDate(
    remainingMoney,
    averageDailySpendSoFar,
    today,
    monthEnd,
  );
  const savingsNeededPerDay = calculateSavingsNeededPerDay(
    remainingMoney,
    remainingDays,
  );
  const missingMoney =
    remainingMoney < 0
      ? Math.abs(remainingMoney)
      : projectedRunOutDate
        ? roundMoney((averageDailySpendSoFar - dailyBudget) * remainingDays)
        : 0;
  const missingDays = projectedRunOutDate
    ? Math.max(
        0,
        Math.ceil((monthEnd.getTime() - projectedRunOutDate.getTime()) / dayMs),
      )
    : 0;
  const status = calculateBudgetStatus(
    remainingMoney,
    dailyBudget,
    projectedRunOutDate,
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
    projectedRunOutDate,
    savingsNeededPerDay:
      savingsNeededPerDay ||
      (missingMoney > 0 ? roundMoney(missingMoney / remainingDays) : 0),
    missingMoney: roundMoney(Math.max(0, missingMoney)),
    missingDays,
    status,
    statusText: getBudgetStatusText(status, projectedRunOutDate),
    personBudgets: calculatePersonBudget(data, selectedDate, remainingDays),
    spendingCuts: buildSpendingCutSuggestions(monthlyExpenses),
  };
}

export function calculateBudgetStatus(
  remainingMoney: number,
  dailyBudget: number,
  projectedRunOutDate?: Date,
): BudgetStatus {
  if (remainingMoney < 0 || projectedRunOutDate) return "red";
  if (dailyBudget < 10) return "yellow";
  return "green";
}

function getBudgetStatusText(
  status: BudgetStatus,
  projectedRunOutDate?: Date,
): string {
  if (status === "green") return "Geld reicht voraussichtlich bis Monatsende.";
  if (status === "yellow")
    return "Geld reicht knapp. Bitte vorsichtig ausgeben.";
  return projectedRunOutDate
    ? `Geld reicht voraussichtlich nur bis ${projectedRunOutDate.toLocaleDateString("de-DE")}.`
    : "Geld reicht voraussichtlich nicht bis Monatsende.";
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
