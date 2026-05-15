import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AccountBalance,
  BudgetSummary,
  CategoryBudget,
  Debt,
  Expense,
  ExpenseKind,
  HouseholdBudgetData,
  Income,
  IncomeExpectationStatus,
  Person,
  calculateHouseholdBudget,
  createId,
  roundMoney,
  sampleBudgetData,
  toDateInputValue,
} from "../../resources/scripts/budgetEngine";
import { formatter } from "../../resources/scripts/helpers";
import "./householdPlanner.scss";

interface HouseholdPlannerProps {
  date: Date;
}

type PlannerTab =
  | "dashboard"
  | "accounts"
  | "persons"
  | "incomes"
  | "expenses"
  | "month"
  | "week"
  | "day"
  | "household"
  | "debts"
  | "savings"
  | "export";

const tabs: { id: PlannerTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "accounts", label: "Kontostände" },
  { id: "persons", label: "Personen" },
  { id: "incomes", label: "Einnahmen" },
  { id: "expenses", label: "Ausgaben" },
  { id: "month", label: "Monat" },
  { id: "week", label: "Woche" },
  { id: "day", label: "Heute" },
  { id: "household", label: "Haushalt" },
  { id: "debts", label: "Schulden" },
  { id: "savings", label: "Sparziele" },
  { id: "export", label: "Import / Export" },
];

const incomeCategories = [
  "Lohn / Gehalt",
  "Bürgergeld / Sozialleistungen",
  "Kindergeld",
  "Unterhalt",
  "Nebenjob",
  "Rückzahlungen",
  "Sonstige Einnahmen",
];
const fixedCategories = [
  "Miete",
  "Strom",
  "Gas",
  "Wasser",
  "Internet",
  "Handy",
  "Versicherungen",
  "Kredite / Schulden",
  "Ratenzahlungen",
  "Auto",
  "Abos",
  "Kindergarten / Schule",
  "Sonstige Fixkosten",
];
const variableCategories = [
  "Lebensmittel",
  "Tanken",
  "Drogerie",
  "Haustiere",
  "Kleidung",
  "Freizeit",
  "Essen bestellen",
  "Reparaturen",
  "Gesundheit",
  "Sonstiges",
];

const incomeExpectationLabels: Record<IncomeExpectationStatus, string> = {
  expected: "erwartet / sicher",
  received: "bereits eingegangen",
  uncertain: "unsicher / noch nicht einplanen",
};

const defaultCategoryBudgets: CategoryBudget[] = [
  { category: "Lebensmittel", monthlyLimit: 550 },
  { category: "Tanken", monthlyLimit: 180 },
  { category: "Drogerie", monthlyLimit: 90 },
  { category: "Freizeit", monthlyLimit: 120 },
];

const today = new Date();
const defaultDate = toDateInputValue(today);

const emptyPerson = (): Person => ({
  id: createId("person"),
  name: "",
  monthlyIncome: 0,
  personalAllowance: 0,
  sharedCostShare: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const emptyIncome = (): Income => ({
  id: createId("income"),
  name: "",
  amount: 0,
  ownerType: "household",
  date: defaultDate,
  repeat: "monthly",
  category: "Lohn / Gehalt",
  note: "",
  expectationStatus: "expected",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const emptyExpense = (): Expense => ({
  id: createId("expense"),
  name: "",
  amount: 0,
  kind: "variable",
  category: "Lebensmittel",
  date: defaultDate,
  ownerType: "household",
  status: "paid",
  repeat: "once",
  note: "",
  critical: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const emptyAccount = (): AccountBalance => ({
  id: createId("account"),
  name: "",
  balance: 0,
  note: "",
  updatedAt: new Date().toISOString(),
});

const emptyDebt = (): Debt => ({
  id: createId("debt"),
  creditor: "",
  totalAmount: 0,
  paidAmount: 0,
  monthlyRate: 0,
  dueDate: defaultDate,
  status: "aktiv",
  notes: "",
});

const normalizeBudgetData = (
  rawData: Partial<HouseholdBudgetData>,
): HouseholdBudgetData => ({
  ...sampleBudgetData,
  ...rawData,
  accounts: rawData.accounts || [],
  persons: rawData.persons || [],
  categories: rawData.categories || sampleBudgetData.categories,
  incomes: rawData.incomes || [],
  expenses: rawData.expenses || [],
  debts: rawData.debts || [],
  savingsGoals: rawData.savingsGoals || [],
  categoryBudgets: rawData.categoryBudgets || defaultCategoryBudgets,
});

const repeatLabels: Record<string, string> = {
  once: "einmalig",
  daily: "täglich",
  weekly: "wöchentlich",
  monthly: "monatlich",
  yearly: "jährlich",
  custom: "alle X Tage",
};

const HouseholdPlanner = ({ date }: HouseholdPlannerProps) => {
  const [data, setData] = useState<HouseholdBudgetData>(() => {
    const stored = window.localStorage.getItem("household-budget-planner");
    return stored ? normalizeBudgetData(JSON.parse(stored)) : sampleBudgetData;
  });
  const [activeTab, setActiveTab] = useState<PlannerTab>("dashboard");
  const [accountDraft, setAccountDraft] =
    useState<AccountBalance>(emptyAccount());
  const [personDraft, setPersonDraft] = useState<Person>(emptyPerson());
  const [incomeDraft, setIncomeDraft] = useState<Income>(emptyIncome());
  const [expenseDraft, setExpenseDraft] = useState<Expense>(emptyExpense());
  const [debtDraft, setDebtDraft] = useState<Debt>(emptyDebt());
  const [createDebtExpense, setCreateDebtExpense] = useState(true);
  const [importText, setImportText] = useState("");
  const [scenarioExpenseId, setScenarioExpenseId] = useState("");
  const [scenarioDelayDays, setScenarioDelayDays] = useState(7);
  const summary = useMemo<BudgetSummary>(
    () => calculateHouseholdBudget(data, date, today),
    [data, date],
  );

  useEffect(() => {
    window.localStorage.setItem(
      "household-budget-planner",
      JSON.stringify(data),
    );
  }, [data]);

  const updateAccountDraft = (field: keyof AccountBalance, value: string) => {
    setAccountDraft({
      ...accountDraft,
      [field]: field === "balance" ? Number(value) : value,
    });
  };

  const addAccount = (event: FormEvent) => {
    event.preventDefault();
    if (!accountDraft.name.trim()) return;
    setData({
      ...data,
      accounts: [
        ...(data.accounts || []),
        { ...accountDraft, updatedAt: new Date().toISOString() },
      ],
    });
    setAccountDraft(emptyAccount());
  };

  const updateAccountBalance = (accountId: string, balance: number) => {
    setData({
      ...data,
      accounts: (data.accounts || []).map((account) =>
        account.id === accountId
          ? { ...account, balance, updatedAt: new Date().toISOString() }
          : account,
      ),
    });
  };

  const removeAccount = (accountId: string) =>
    setData({
      ...data,
      accounts: (data.accounts || []).filter(
        (account) => account.id !== accountId,
      ),
    });

  const updatePersonDraft = (field: keyof Person, value: string) => {
    setPersonDraft({
      ...personDraft,
      [field]: [
        "monthlyIncome",
        "personalAllowance",
        "sharedCostShare",
        "savingsGoal",
      ].includes(field)
        ? Number(value)
        : value,
    });
  };

  const addPerson = (event: FormEvent) => {
    event.preventDefault();
    if (!personDraft.name.trim()) return;
    setData({
      ...data,
      persons: [
        ...data.persons,
        { ...personDraft, updatedAt: new Date().toISOString() },
      ],
    });
    setPersonDraft(emptyPerson());
  };

  const removePerson = (id: string) =>
    setData({
      ...data,
      persons: data.persons.filter((person) => person.id !== id),
    });

  const updateIncomeDraft = (field: keyof Income, value: string) => {
    setIncomeDraft({
      ...incomeDraft,
      [field]: ["amount", "intervalDays"].includes(field) ? Number(value) : value,
    });
  };

  const addIncome = (event: FormEvent) => {
    event.preventDefault();
    if (!incomeDraft.name.trim()) return;
    setData({
      ...data,
      incomes: [
        ...data.incomes,
        { ...incomeDraft, updatedAt: new Date().toISOString() },
      ],
    });
    setIncomeDraft(emptyIncome());
  };

  const updateExpenseDraft = (
    field: keyof Expense,
    value: string | boolean,
  ) => {
    const next: Expense = {
      ...expenseDraft,
      [field]: ["amount", "intervalDays"].includes(field)
        ? Number(value)
        : value,
    } as Expense;
    if (field === "kind")
      next.category = value === "fixed" ? "Miete" : "Lebensmittel";
    setExpenseDraft(next);
  };

  const addExpense = (event: FormEvent) => {
    event.preventDefault();
    if (!expenseDraft.name.trim()) return;
    setData({
      ...data,
      expenses: [
        ...data.expenses,
        { ...expenseDraft, updatedAt: new Date().toISOString() },
      ],
    });
    setExpenseDraft(emptyExpense());
  };

  const addQuickExpense = (amount: number, name: string) => {
    if (!amount || !name.trim()) return;
    const quickExpense: Expense = {
      ...emptyExpense(),
      name,
      amount,
      date: defaultDate,
      category: "Sonstiges",
      note: "Schnelle Ausgabe",
    };
    setData({ ...data, expenses: [...data.expenses, quickExpense] });
  };

  const markExpensePaid = (expenseId: string) => {
    setData({
      ...data,
      expenses: data.expenses.map((expense) =>
        expense.id === expenseId ? { ...expense, status: "paid" } : expense,
      ),
    });
  };

  const removeExpense = (expenseId: string) =>
    setData({
      ...data,
      expenses: data.expenses.filter((expense) => expense.id !== expenseId),
    });
  const removeIncome = (incomeId: string) =>
    setData({
      ...data,
      incomes: data.incomes.filter((income) => income.id !== incomeId),
    });

  const updateCategoryBudget = (category: string, monthlyLimit: number) => {
    const existingBudgets = data.categoryBudgets || [];
    const nextBudget = { category, monthlyLimit: Math.max(0, monthlyLimit || 0) };
    setData({
      ...data,
      categoryBudgets: existingBudgets.some((budget) => budget.category === category)
        ? existingBudgets.map((budget) =>
            budget.category === category ? nextBudget : budget,
          )
        : [...existingBudgets, nextBudget],
    });
  };

  const updateDebtDraft = (field: keyof Debt, value: string) => {
    setDebtDraft({
      ...debtDraft,
      [field]: ["totalAmount", "paidAmount", "monthlyRate"].includes(field)
        ? Number(value)
        : value,
    });
  };

  const addDebt = (event: FormEvent) => {
    event.preventDefault();
    if (!debtDraft.creditor.trim()) return;
    const debt = { ...debtDraft };
    const debtExpense: Expense | undefined =
      createDebtExpense && debt.monthlyRate > 0
        ? {
            ...emptyExpense(),
            name: `Rate: ${debt.creditor}`,
            amount: debt.monthlyRate,
            kind: "fixed",
            category: "Kredite / Schulden",
            date: debt.dueDate,
            status: "open",
            repeat: "monthly",
            note: "Automatisch aus Schulden/Raten angelegt",
            critical: true,
          }
        : undefined;
    setData({
      ...data,
      debts: [...data.debts, debt],
      expenses: debtExpense ? [...data.expenses, debtExpense] : data.expenses,
    });
    setDebtDraft(emptyDebt());
  };

  const removeDebt = (debtId: string) =>
    setData({
      ...data,
      debts: data.debts.filter((debt) => debt.id !== debtId),
    });

  const exportJson = JSON.stringify(data, null, 2);
  const exportCsv = [
    "Typ;Name;Betrag;Kategorie;Datum;Person/Haushalt;Status;Wiederholung;Notiz",
    ...data.incomes.map(
      (income) =>
        `Einnahme;${income.name};${income.amount};${income.category};${income.date};${income.personId || "Haushalt"};;${income.repeat};${income.note || ""}`,
    ),
    ...data.expenses.map(
      (expense) =>
        `Ausgabe;${expense.name};${expense.amount};${expense.category};${expense.date};${expense.personId || "Haushalt"};${expense.status};${expense.repeat};${expense.note || ""}`,
    ),
  ].join("\n");

  const importBackup = () => {
    try {
      setData(normalizeBudgetData(JSON.parse(importText)));
      setImportText("");
    } catch (error) {
      alert("Backup konnte nicht gelesen werden. Bitte JSON prüfen.");
    }
  };

  return (
    <div className="planner">
      <header className={`planner__hero planner__hero--${summary.status}`}>
        <div>
          <p className="planner__eyebrow">Wichtigste Antwort</p>
          <h1>
            Heute noch ausgeben:{" "}
            {formatter.format(Math.max(0, summary.dailyBudget))}
          </h1>
          <p>
            Damit das Geld bis Monatsende reicht. Wochenlimit:{" "}
            <strong>{formatter.format(summary.weeklyBudget)}</strong>
          </p>
        </div>
        <div className="planner__heroStatus">
          <span>{summary.status.toUpperCase()}</span>
          <strong>{summary.statusText}</strong>
          <small>
            {summary.projectedRunOutDate
              ? `Prognose: aufgebraucht am ${summary.projectedRunOutDate.toLocaleDateString("de-DE")}`
              : "Prognose: Geld reicht bis Monatsende"}
          </small>
        </div>
      </header>

      <nav className="planner__tabs" aria-label="Budgetbereiche">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={
              activeTab === tab.id
                ? "planner__tab planner__tab--active"
                : "planner__tab"
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "dashboard" && <Dashboard summary={summary} data={data} />}
      {activeTab === "accounts" && (
        <Accounts
          data={data}
          draft={accountDraft}
          updateDraft={updateAccountDraft}
          addAccount={addAccount}
          updateBalance={updateAccountBalance}
          removeAccount={removeAccount}
        />
      )}
      {activeTab === "persons" && (
        <Persons
          data={data}
          summary={summary}
          draft={personDraft}
          updateDraft={updatePersonDraft}
          addPerson={addPerson}
          removePerson={removePerson}
        />
      )}
      {activeTab === "incomes" && (
        <Incomes
          data={data}
          draft={incomeDraft}
          updateDraft={updateIncomeDraft}
          addIncome={addIncome}
          removeIncome={removeIncome}
        />
      )}
      {activeTab === "expenses" && (
        <Expenses
          data={data}
          draft={expenseDraft}
          updateDraft={updateExpenseDraft}
          addExpense={addExpense}
          markPaid={markExpensePaid}
          removeExpense={removeExpense}
        />
      )}
      {activeTab === "month" && <MonthPlanning summary={summary} />}
      {activeTab === "week" && <WeekPlanning summary={summary} data={data} />}
      {activeTab === "day" && (
        <DayPlanning
          summary={summary}
          data={data}
          addQuickExpense={addQuickExpense}
        />
      )}
      {activeTab === "household" && (
        <HouseholdReality
          data={data}
          summary={summary}
          date={date}
          today={today}
          updateCategoryBudget={updateCategoryBudget}
          scenarioExpenseId={scenarioExpenseId}
          setScenarioExpenseId={setScenarioExpenseId}
          scenarioDelayDays={scenarioDelayDays}
          setScenarioDelayDays={setScenarioDelayDays}
        />
      )}
      {activeTab === "debts" && (
        <Debts
          data={data}
          draft={debtDraft}
          updateDraft={updateDebtDraft}
          addDebt={addDebt}
          removeDebt={removeDebt}
          createDebtExpense={createDebtExpense}
          setCreateDebtExpense={setCreateDebtExpense}
        />
      )}
      {activeTab === "savings" && <Savings data={data} />}
      {activeTab === "export" && (
        <ExportArea
          exportJson={exportJson}
          exportCsv={exportCsv}
          importText={importText}
          setImportText={setImportText}
          importBackup={importBackup}
        />
      )}
    </div>
  );
};

const Dashboard = ({
  summary,
  data,
}: {
  summary: BudgetSummary;
  data: HouseholdBudgetData;
}) => (
  <section className="planner__grid">
    <Metric
      title="Aktuelle Kontostände"
      value={formatter.format(summary.accountBalanceTotal)}
    />
    <Metric
      title="Verfügbar inkl. erwarteter Einnahmen"
      value={formatter.format(summary.availableFunds)}
    />
    <Metric
      title="Verfügbar bis Monatsende"
      value={formatter.format(summary.remainingMoney)}
      highlight
    />
    <Metric
      title="Tagesbudget ab heute"
      value={formatter.format(summary.dailyBudget)}
      highlight
    />
    <Metric
      title="Wochenbudget ab heute"
      value={formatter.format(summary.weeklyBudget)}
    />
    <Metric
      title="Bereits ausgegeben"
      value={formatter.format(summary.paidExpenses)}
    />
    <Metric
      title="Noch offene Fixkosten"
      value={formatter.format(summary.openBills)}
    />
    <Metric
      title="Konten / Personen"
      value={`${(data.accounts || []).map((account) => account.name).join(", ") || "keine Konten"} · ${data.persons.map((person) => person.name).join(", ")}`}
      text
    />
    <div
      className={`planner__card planner__card--${summary.status} planner__wide`}
    >
      <h3>Warnsystem</h3>
      <p>
        <strong>{summary.statusText}</strong>
      </p>
      <p>
        Noch {summary.remainingDays} Tage. Wenn täglich mehr als{" "}
        {formatter.format(summary.dailyBudget)} ausgegeben wird, reicht das Geld
        nicht bis Monatsende.
      </p>
      {summary.missingMoney > 0 && (
        <p>
          Es fehlen voraussichtlich {formatter.format(summary.missingMoney)}.
          Spare ca. {formatter.format(summary.savingsNeededPerDay)} pro Tag.
        </p>
      )}
    </div>
  </section>
);

const Metric = ({
  title,
  value,
  highlight,
  text,
}: {
  title: string;
  value: string;
  highlight?: boolean;
  text?: boolean;
}) => (
  <div
    className={
      highlight ? "planner__card planner__card--highlight" : "planner__card"
    }
  >
    <h3>{title}</h3>
    <strong className={text ? "planner__textValue" : ""}>{value}</strong>
  </div>
);

const Accounts = ({
  data,
  draft,
  updateDraft,
  addAccount,
  updateBalance,
  removeAccount,
}: any) => (
  <section className="planner__twoColumns">
    <form className="planner__panel" onSubmit={addAccount}>
      <h2>Konto / Bargeld hinzufügen</h2>
      <p>
        Hier trägst du echte Kontostände manuell ein. Änderungen werden sofort
        lokal gespeichert und für das Tagesbudget verwendet.
      </p>
      <Input
        label="Name"
        value={draft.name}
        onChange={(e) => updateDraft("name", e.target.value)}
      />
      <Input
        label="Aktueller Kontostand"
        type="number"
        step="0.01"
        value={draft.balance}
        onChange={(e) => updateDraft("balance", e.target.value)}
      />
      <Input
        label="Notiz"
        value={draft.note || ""}
        onChange={(e) => updateDraft("note", e.target.value)}
      />
      <button className="planner__primary">Konto speichern</button>
    </form>
    <div className="planner__panel">
      <h2>Kontostände manuell anpassen</h2>
      <p className="planner__big">
        Summe:{" "}
        {formatter.format(
          (data.accounts || []).reduce(
            (total: number, account: AccountBalance) => total + account.balance,
            0,
          ),
        )}
      </p>
      {(data.accounts || []).map((account: AccountBalance) => (
        <div className="planner__row planner__row--account" key={account.id}>
          <span>
            <strong>{account.name}</strong>
            <small>
              {account.note ||
                `aktualisiert ${new Date(account.updatedAt).toLocaleString("de-DE")}`}
            </small>
          </span>
          <Input
            label="Kontostand"
            type="number"
            step="0.01"
            value={account.balance}
            onChange={(e) => updateBalance(account.id, Number(e.target.value))}
          />
          <button onClick={() => removeAccount(account.id)}>Löschen</button>
        </div>
      ))}
    </div>
  </section>
);

const Persons = ({
  data,
  summary,
  draft,
  updateDraft,
  addPerson,
  removePerson,
}: any) => (
  <section className="planner__twoColumns">
    <form className="planner__panel" onSubmit={addPerson}>
      <h2>Person hinzufügen</h2>
      <Input
        label="Name"
        value={draft.name}
        onChange={(e) => updateDraft("name", e.target.value)}
      />
      <Input
        label="Monatliches Einkommen"
        type="number"
        value={draft.monthlyIncome}
        onChange={(e) => updateDraft("monthlyIncome", e.target.value)}
      />
      <Input
        label="Taschengeld / freies Budget"
        type="number"
        value={draft.personalAllowance}
        onChange={(e) => updateDraft("personalAllowance", e.target.value)}
      />
      <Input
        label="Anteil an gemeinsamen Kosten (%)"
        type="number"
        value={draft.sharedCostShare}
        onChange={(e) => updateDraft("sharedCostShare", e.target.value)}
      />
      <Input
        label="Persönliches Sparziel (optional)"
        type="number"
        value={draft.savingsGoal || 0}
        onChange={(e) => updateDraft("savingsGoal", e.target.value)}
      />
      <button className="planner__primary">Person speichern</button>
    </form>
    <div className="planner__panel">
      <h2>Geld pro Person</h2>
      {summary.personBudgets.map((budget: any) => (
        <div className="planner__row" key={budget.personId}>
          <span>
            <strong>{budget.name}</strong>
            <small>
              Einnahmen {formatter.format(budget.income)} · Anteil Kosten{" "}
              {formatter.format(budget.sharedCostShare)}
            </small>
          </span>
          <span>
            {formatter.format(budget.freeMoney)}
            <small>{formatter.format(budget.dailyBudget)} / Tag</small>
          </span>
          <button onClick={() => removePerson(budget.personId)}>
            Entfernen
          </button>
        </div>
      ))}
    </div>
  </section>
);

const Incomes = ({
  data,
  draft,
  updateDraft,
  addIncome,
  removeIncome,
}: any) => (
  <section className="planner__twoColumns">
    <form className="planner__panel" onSubmit={addIncome}>
      <h2>Einnahme erfassen</h2>
      <Input
        label="Name"
        value={draft.name}
        onChange={(e) => updateDraft("name", e.target.value)}
      />
      <Input
        label="Betrag"
        type="number"
        value={draft.amount}
        onChange={(e) => updateDraft("amount", e.target.value)}
      />
      <Select
        label="Kategorie"
        value={draft.category}
        onChange={(e) => updateDraft("category", e.target.value)}
        options={incomeCategories}
      />
      <Select
        label="Person oder Haushalt"
        value={draft.personId || "household"}
        onChange={(e) =>
          updateDraft(
            "personId",
            e.target.value === "household" ? "" : e.target.value,
          )
        }
        options={[
          "household",
          ...data.persons.map((person: Person) => person.id),
        ]}
        labels={{
          household: "Gemeinsame Haushaltskasse",
          ...Object.fromEntries(
            data.persons.map((person: Person) => [person.id, person.name]),
          ),
        }}
      />
      <Input
        label="Datum"
        type="date"
        value={draft.date}
        onChange={(e) => updateDraft("date", e.target.value)}
      />
      <Select
        label="Wiederholung"
        value={draft.repeat}
        onChange={(e) => updateDraft("repeat", e.target.value)}
        options={["once", "weekly", "monthly", "yearly", "custom"]}
        labels={repeatLabels}
      />
      {draft.repeat === "custom" && (
        <Input
          label="Intervall in Tagen"
          type="number"
          min="1"
          value={draft.intervalDays || 3}
          onChange={(e) => updateDraft("intervalDays", e.target.value)}
        />
      )}
      <Select
        label="Erwartungsstatus"
        value={draft.expectationStatus || "expected"}
        onChange={(e) => updateDraft("expectationStatus", e.target.value)}
        options={["expected", "received", "uncertain"]}
        labels={incomeExpectationLabels}
      />
      <Input
        label="Notiz"
        value={draft.note || ""}
        onChange={(e) => updateDraft("note", e.target.value)}
      />
      <button className="planner__primary">Einnahme speichern</button>
    </form>
    <List title="Einnahmen" items={data.incomes} remove={removeIncome} />
  </section>
);

const Expenses = ({
  data,
  draft,
  updateDraft,
  addExpense,
  markPaid,
  removeExpense,
}: any) => (
  <section className="planner__twoColumns">
    <form className="planner__panel" onSubmit={addExpense}>
      <h2>Ausgabe erfassen</h2>
      <Input
        label="Name"
        value={draft.name}
        onChange={(e) => updateDraft("name", e.target.value)}
      />
      <Input
        label="Betrag"
        type="number"
        value={draft.amount}
        onChange={(e) => updateDraft("amount", e.target.value)}
      />
      <Select
        label="Art"
        value={draft.kind}
        onChange={(e) => updateDraft("kind", e.target.value as ExpenseKind)}
        options={["fixed", "variable"]}
        labels={{ fixed: "Fixkosten", variable: "Variable Ausgabe" }}
      />
      <Select
        label="Kategorie"
        value={draft.category}
        onChange={(e) => updateDraft("category", e.target.value)}
        options={draft.kind === "fixed" ? fixedCategories : variableCategories}
      />
      <Select
        label="Zahlungsstatus"
        value={draft.status}
        onChange={(e) => updateDraft("status", e.target.value)}
        options={["open", "paid"]}
        labels={{ open: "offen", paid: "bezahlt" }}
      />
      <Select
        label="Person oder Haushalt"
        value={draft.personId || "household"}
        onChange={(e) =>
          updateDraft(
            "personId",
            e.target.value === "household" ? "" : e.target.value,
          )
        }
        options={[
          "household",
          ...data.persons.map((person: Person) => person.id),
        ]}
        labels={{
          household: "Gemeinsame Haushaltskasse",
          ...Object.fromEntries(
            data.persons.map((person: Person) => [person.id, person.name]),
          ),
        }}
      />
      <Input
        label="Datum"
        type="date"
        value={draft.date}
        onChange={(e) => updateDraft("date", e.target.value)}
      />
      <Select
        label="Wiederholung"
        value={draft.repeat}
        onChange={(e) => updateDraft("repeat", e.target.value)}
        options={["once", "daily", "weekly", "monthly", "yearly", "custom"]}
        labels={repeatLabels}
      />
      {draft.repeat === "custom" && (
        <Input
          label="Intervall in Tagen (z.B. alle 3 Tage)"
          type="number"
          min="1"
          value={draft.intervalDays || 3}
          onChange={(e) => updateDraft("intervalDays", e.target.value)}
        />
      )}
      <label className="planner__check">
        <input
          type="checkbox"
          checked={draft.critical}
          onChange={(e) => updateDraft("critical", e.target.checked)}
        />{" "}
        Kritische Rechnung
      </label>
      <Input
        label="Notiz"
        value={draft.note || ""}
        onChange={(e) => updateDraft("note", e.target.value)}
      />
      <button className="planner__primary">Ausgabe speichern</button>
    </form>
    <div className="planner__panel">
      <h2>Ausgaben</h2>
      {data.expenses.map((expense: Expense) => (
        <div className="planner__row" key={expense.id}>
          <span>
            <strong>{expense.name}</strong>
            <small>
              {expense.kind === "fixed" ? "Fixkosten" : "Variabel"} ·{" "}
              {expense.category} ·{" "}
              {expense.status === "open" ? "offen" : "bezahlt"} ·{" "}
              {repeatLabels[expense.repeat]}
              {expense.repeat === "custom"
                ? ` (${expense.intervalDays || 1} Tage)`
                : ""}
            </small>
          </span>
          <span>{formatter.format(expense.amount)}</span>
          {expense.status === "open" && (
            <button onClick={() => markPaid(expense.id)}>Bezahlt</button>
          )}
          <button onClick={() => removeExpense(expense.id)}>Löschen</button>
        </div>
      ))}
    </div>
  </section>
);

const MonthPlanning = ({ summary }: { summary: BudgetSummary }) => (
  <section className="planner__grid">
    <Metric title="Startbudget" value={formatter.format(summary.totalIncome)} />
    <Metric
      title="Gesamteinnahmen"
      value={formatter.format(summary.totalIncome)}
    />
    <Metric
      title="Gesamtausgaben"
      value={formatter.format(summary.totalExpenses)}
    />
    <Metric title="Fixkosten" value={formatter.format(summary.fixedCosts)} />
    <Metric
      title="Variable Ausgaben"
      value={formatter.format(summary.variableExpenses)}
    />
    <Metric
      title="Restgeld"
      value={formatter.format(summary.remainingMoney)}
      highlight
    />
    <Metric title="Tagesbudget" value={formatter.format(summary.dailyBudget)} />
    <Metric
      title="Wochenbudget"
      value={formatter.format(summary.weeklyBudget)}
    />
    <Metric
      title="Sparbetrag"
      value={formatter.format(summary.mandatorySavings)}
    />
    <Metric title="Schuldenzahlungen" value="siehe Schulden" text />
    <Metric
      title="Offener Betrag"
      value={formatter.format(summary.openBills)}
    />
  </section>
);

const WeekPlanning = ({
  summary,
  data,
}: {
  summary: BudgetSummary;
  data: HouseholdBudgetData;
}) => {
  const spentThisWeek = roundMoney(
    data.expenses
      .filter((expense) => expense.status === "paid")
      .slice(-5)
      .reduce((total, expense) => total + expense.amount, 0),
  );
  return (
    <section className="planner__grid">
      <Metric
        title="Budget für diese Woche"
        value={formatter.format(summary.weeklyBudget)}
        highlight
      />
      <Metric
        title="Bereits ausgegeben diese Woche"
        value={formatter.format(spentThisWeek)}
      />
      <Metric
        title="Restbudget diese Woche"
        value={formatter.format(summary.weeklyBudget - spentThisWeek)}
      />
      <Metric
        title="Tägliches Limit"
        value={formatter.format(summary.dailyBudget)}
      />
      <div className="planner__card planner__wide">
        <h3>Geplante Ausgaben & Warnung</h3>
        <p>
          {spentThisWeek > summary.weeklyBudget
            ? "Wochenbudget überschritten. Bitte Ausgaben sofort reduzieren."
            : "Wochenbudget ist aktuell im Rahmen."}
        </p>
        <ul>
          {data.expenses
            .filter((expense) => expense.status === "open")
            .map((expense) => (
              <li key={expense.id}>
                {expense.name}: {formatter.format(expense.amount)}
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
};

const DayPlanning = ({ summary, data, addQuickExpense }: any) => {
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const spentToday = roundMoney(
    data.expenses
      .filter(
        (expense: Expense) =>
          expense.status === "paid" && expense.date === defaultDate,
      )
      .reduce((total: number, expense: Expense) => total + expense.amount, 0),
  );
  return (
    <section className="planner__twoColumns">
      <div className="planner__panel">
        <h2>Tagesübersicht</h2>
        <p className="planner__big">
          Heute verfügbar: {formatter.format(summary.dailyBudget)}
        </p>
        <p>Bereits ausgegeben: {formatter.format(spentToday)}</p>
        <p>
          Heute noch möglich:{" "}
          {formatter.format(Math.max(0, summary.dailyBudget - spentToday))}
        </p>
        <p>
          {spentToday > summary.dailyBudget
            ? "Warnung: Tagesbudget überschritten."
            : "Heute bist du im Plan."}
        </p>
      </div>
      <form
        className="planner__panel"
        onSubmit={(e) => {
          e.preventDefault();
          addQuickExpense(Number(amount), name);
          setAmount("");
          setName("");
        }}
      >
        <h2>Schnelle Ausgabe</h2>
        <Input
          label="Was?"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Betrag"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="planner__primary">Ausgabe erfassen</button>
      </form>
    </section>
  );
};

const parseInputDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const addDaysToDateString = (dateString: string, days: number) => {
  const date = parseInputDate(dateString);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

const isSameSelectedMonth = (dateString: string, selectedDate: Date) => {
  const date = parseInputDate(dateString);
  return (
    date.getFullYear() === selectedDate.getFullYear() &&
    date.getMonth() === selectedDate.getMonth()
  );
};

const getMonthlyExpenseAmount = (expense: Expense, selectedDate: Date) => {
  if (
    ["once", "yearly"].includes(expense.repeat) &&
    !isSameSelectedMonth(expense.date, selectedDate)
  ) {
    return 0;
  }

  const monthEnd = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    0,
  );
  const startDate = parseInputDate(expense.date);

  if (startDate > monthEnd) return 0;
  if (["once", "monthly", "yearly"].includes(expense.repeat)) return expense.amount;

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const fromDate = startDate > monthStart ? startDate : monthStart;
  const intervalDays =
    expense.repeat === "weekly"
      ? 7
      : expense.repeat === "custom"
        ? Math.max(1, expense.intervalDays || 1)
        : 1;
  const count = Math.floor((monthEnd.getTime() - fromDate.getTime()) / (intervalDays * 24 * 60 * 60 * 1000)) + 1;
  return roundMoney(expense.amount * Math.max(0, count));
};

const getNextOccurrenceDate = (expense: Expense, todayDate: Date) => {
  const normalizedToday = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate(),
  );
  const startDate = parseInputDate(expense.date);
  if (expense.repeat === "once") return startDate >= normalizedToday ? startDate : undefined;
  if (expense.repeat === "monthly") {
    const next = new Date(
      normalizedToday.getFullYear(),
      normalizedToday.getMonth(),
      Math.min(startDate.getDate(), 28),
    );
    if (next < normalizedToday) next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (expense.repeat === "yearly") {
    const next = new Date(
      normalizedToday.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
    );
    if (next < normalizedToday) next.setFullYear(next.getFullYear() + 1);
    return next;
  }

  const intervalDays =
    expense.repeat === "weekly"
      ? 7
      : expense.repeat === "custom"
        ? Math.max(1, expense.intervalDays || 1)
        : 1;
  if (startDate >= normalizedToday) return startDate;
  const elapsed = Math.ceil(
    (normalizedToday.getTime() - startDate.getTime()) /
      (intervalDays * 24 * 60 * 60 * 1000),
  );
  return new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + elapsed * intervalDays,
  );
};

const HouseholdReality = ({
  data,
  summary,
  date,
  today,
  updateCategoryBudget,
  scenarioExpenseId,
  setScenarioExpenseId,
  scenarioDelayDays,
  setScenarioDelayDays,
}: {
  data: HouseholdBudgetData;
  summary: BudgetSummary;
  date: Date;
  today: Date;
  updateCategoryBudget: (category: string, monthlyLimit: number) => void;
  scenarioExpenseId: string;
  setScenarioExpenseId: (expenseId: string) => void;
  scenarioDelayDays: number;
  setScenarioDelayDays: (days: number) => void;
}) => {
  const budgets = data.categoryBudgets || defaultCategoryBudgets;
  const envelopes = budgets.map((budget) => {
    const spent = roundMoney(
      data.expenses
        .filter(
          (expense) =>
            expense.kind === "variable" && expense.category === budget.category,
        )
        .reduce(
          (total, expense) => total + getMonthlyExpenseAmount(expense, date),
          0,
        ),
    );
    return {
      ...budget,
      spent,
      remaining: roundMoney(budget.monthlyLimit - spent),
      percent:
        budget.monthlyLimit > 0
          ? Math.min(100, Math.round((spent / budget.monthlyLimit) * 100))
          : 0,
    };
  });
  const dueSoon = data.expenses
    .filter((expense) => expense.status === "open")
    .map((expense) => ({ expense, dueDate: getNextOccurrenceDate(expense, today) }))
    .filter(({ dueDate }) => {
      if (!dueDate) return false;
      const daysUntil = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
  const irregularIncomes = data.incomes.filter(
    (income) => income.repeat !== "monthly" || income.expectationStatus === "uncertain",
  );
  const scenarioCandidates = data.expenses.filter(
    (expense) => expense.status === "open" || parseInputDate(expense.date) >= today,
  );
  const selectedScenarioExpense =
    scenarioCandidates.find((expense) => expense.id === scenarioExpenseId) ||
    scenarioCandidates[0];
  const shiftedDate = selectedScenarioExpense
    ? addDaysToDateString(selectedScenarioExpense.date, scenarioDelayDays)
    : "";
  const scenarioSummary = selectedScenarioExpense
    ? calculateHouseholdBudget(
        {
          ...data,
          expenses: data.expenses.map((expense) =>
            expense.id === selectedScenarioExpense.id
              ? { ...expense, date: shiftedDate }
              : expense,
          ),
        },
        date,
        today,
      )
    : undefined;
  const accountCheckDifference = roundMoney(
    summary.accountBalanceTotal + summary.incomeStillExpected - summary.openBills - summary.mandatorySavings,
  );

  return (
    <section className="planner__reality">
      <div className="planner__panel">
        <h2>Umschläge nach Kategorie</h2>
        <p>Setze Monatsrahmen für typische variable Haushaltsausgaben.</p>
        {envelopes.map((envelope) => (
          <div className="planner__envelope" key={envelope.category}>
            <div>
              <strong>{envelope.category}</strong>
              <small>
                Verbraucht {formatter.format(envelope.spent)} · übrig{" "}
                {formatter.format(envelope.remaining)}
              </small>
            </div>
            <Input
              label="Monatsrahmen"
              type="number"
              min="0"
              step="0.01"
              value={envelope.monthlyLimit}
              onChange={(e) => updateCategoryBudget(envelope.category, Number(e.target.value))}
            />
            <div className="planner__progress" aria-label={`${envelope.percent}% verbraucht`}>
              <span style={{ width: `${envelope.percent}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="planner__panel">
        <h2>Fälligkeiten in den nächsten 7 Tagen</h2>
        {dueSoon.length === 0 && <p>Keine offenen Rechnungen in den nächsten 7 Tagen.</p>}
        {dueSoon.map(({ expense, dueDate }) => (
          <div className="planner__row" key={expense.id}>
            <span>
              <strong>{expense.name}</strong>
              <small>
                {expense.category} · fällig {dueDate?.toLocaleDateString("de-DE")} ·{" "}
                {expense.critical ? "kritisch" : "normal"}
              </small>
            </span>
            <span>{formatter.format(expense.amount)}</span>
          </div>
        ))}
      </div>

      <div className="planner__panel">
        <h2>Unregelmäßige Einnahmen</h2>
        {irregularIncomes.length === 0 && <p>Keine unregelmäßigen oder unsicheren Einnahmen erfasst.</p>}
        {irregularIncomes.map((income) => (
          <div className="planner__row" key={income.id}>
            <span>
              <strong>{income.name}</strong>
              <small>
                {income.category} · {repeatLabels[income.repeat]} ·{" "}
                {incomeExpectationLabels[income.expectationStatus || "expected"]}
              </small>
            </span>
            <span>{formatter.format(income.amount)}</span>
          </div>
        ))}
        <p>
          Unsichere Einnahmen werden in der Prognose für erwartete Einnahmen nicht
          mitgezählt.
        </p>
      </div>

      <div className="planner__panel">
        <h2>Szenario: Ausgabe verschieben</h2>
        {selectedScenarioExpense ? (
          <>
            <Select
              label="Ausgabe"
              value={selectedScenarioExpense.id}
              onChange={(e) => setScenarioExpenseId(e.target.value)}
              options={scenarioCandidates.map((expense) => expense.id)}
              labels={Object.fromEntries(
                scenarioCandidates.map((expense) => [
                  expense.id,
                  `${expense.name} (${formatter.format(expense.amount)})`,
                ]),
              )}
            />
            <Input
              label="Verschieben um Tage"
              type="number"
              value={scenarioDelayDays}
              onChange={(e) => setScenarioDelayDays(Number(e.target.value))}
            />
            <p>
              Neuer Termin: {parseInputDate(shiftedDate).toLocaleDateString("de-DE")}
            </p>
            <p>
              Tagesbudget dann: {formatter.format(scenarioSummary?.dailyBudget || 0)}{" "}
              statt {formatter.format(summary.dailyBudget)}.
            </p>
          </>
        ) : (
          <p>Keine offene oder zukünftige Ausgabe für ein Szenario vorhanden.</p>
        )}
      </div>

      <div className="planner__panel planner__wide">
        <h2>Stimmt die Planung noch?</h2>
        <p>
          Kontostände + sichere erwartete Einnahmen - offene Fixkosten - Pflichtsparen
          ergeben aktuell {formatter.format(accountCheckDifference)} Rest-Spielraum.
        </p>
        <p>
          Budget-Rest laut Monatsplanung: {formatter.format(summary.remainingMoney)}.
        </p>
        <p>
          {data.accounts.length === 0
            ? "Lege mindestens einen aktuellen Kontostand an, damit der Abgleich sinnvoll wird."
            : Math.abs(accountCheckDifference - summary.remainingMoney) < 1
              ? "Kontostände und Planung passen zusammen."
              : "Bitte Kontostände, offene Rechnungen oder erwartete Einnahmen prüfen."}
        </p>
      </div>
    </section>
  );
};

const Debts = ({
  data,
  draft,
  updateDraft,
  addDebt,
  removeDebt,
  createDebtExpense,
  setCreateDebtExpense,
}: any) => (
  <section className="planner__twoColumns">
    <form className="planner__panel" onSubmit={addDebt}>
      <h2>Schuld / Rate eintragen</h2>
      <p>
        Schulden werden hier verwaltet. Wenn du die Rate im Budget
        berücksichtigen willst, lasse „als Fixkosten übernehmen“ aktiv.
      </p>
      <Input
        label="Gläubiger / Zweck"
        value={draft.creditor}
        onChange={(e) => updateDraft("creditor", e.target.value)}
      />
      <Input
        label="Gesamtschuld"
        type="number"
        step="0.01"
        value={draft.totalAmount}
        onChange={(e) => updateDraft("totalAmount", e.target.value)}
      />
      <Input
        label="Schon bezahlt"
        type="number"
        step="0.01"
        value={draft.paidAmount}
        onChange={(e) => updateDraft("paidAmount", e.target.value)}
      />
      <Input
        label="Monatsrate"
        type="number"
        step="0.01"
        value={draft.monthlyRate}
        onChange={(e) => updateDraft("monthlyRate", e.target.value)}
      />
      <Input
        label="Nächste Fälligkeit"
        type="date"
        value={draft.dueDate}
        onChange={(e) => updateDraft("dueDate", e.target.value)}
      />
      <Input
        label="Notiz"
        value={draft.notes || ""}
        onChange={(e) => updateDraft("notes", e.target.value)}
      />
      <label className="planner__check">
        <input
          type="checkbox"
          checked={createDebtExpense}
          onChange={(e) => setCreateDebtExpense(e.target.checked)}
        />{" "}
        Rate als offene monatliche Fixkosten übernehmen
      </label>
      <button className="planner__primary">Schuld speichern</button>
    </form>
    <div className="planner__panel">
      <h2>Schulden und Raten</h2>
      {data.debts.map((debt: Debt) => (
        <div className="planner__row" key={debt.id}>
          <span>
            <strong>{debt.creditor}</strong>
            <small>
              Restschuld {formatter.format(debt.totalAmount - debt.paidAmount)}{" "}
              · fällig {new Date(debt.dueDate).toLocaleDateString("de-DE")} ·{" "}
              {debt.status}
            </small>
          </span>
          <span>{formatter.format(debt.monthlyRate)} / Monat</span>
          <button onClick={() => removeDebt(debt.id)}>Löschen</button>
        </div>
      ))}
    </div>
  </section>
);
const Savings = ({ data }: { data: HouseholdBudgetData }) => (
  <section className="planner__panel">
    <h2>Sparziele</h2>
    {data.savingsGoals.map((goal) => (
      <div className="planner__row" key={goal.id}>
        <span>
          <strong>{goal.name}</strong>
          <small>
            {goal.mandatory
              ? "verpflichtend, reduziert Tagesbudget"
              : "optional"}
          </small>
        </span>
        <span>
          {Math.round((goal.currentAmount / goal.targetAmount) * 100)} %
          <small>
            {formatter.format(goal.currentAmount)} von{" "}
            {formatter.format(goal.targetAmount)}
          </small>
        </span>
      </div>
    ))}
  </section>
);

const ExportArea = ({
  exportJson,
  exportCsv,
  importText,
  setImportText,
  importBackup,
}: any) => (
  <section className="planner__twoColumns">
    <div className="planner__panel">
      <h2>Export</h2>
      <p>
        CSV für Tabellen, JSON als manuelle Backup-Datei. PDF:
        Browser-Druckfunktion „Als PDF speichern“ nutzen.
      </p>
      <textarea readOnly value={exportCsv} />
      <textarea readOnly value={exportJson} />
    </div>
    <div className="planner__panel">
      <h2>Import, Speicherung und Windows-Autostart</h2>
      <p>
        Alle Einträge werden bei jeder Änderung sofort automatisch im
        Browser-LocalStorage gespeichert und sind beim nächsten Start wieder da.
      </p>
      <p>
        Windows-Autostart: Starte einmal{" "}
        <code>scripts\windows-autostart-budget-planner.cmd</code> oder lege eine
        Verknüpfung darauf in <code>shell:startup</code>. Die Datei öffnet die
        lokale App über <code>npm run dev</code>.
      </p>
      <textarea
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
      />
      <button className="planner__primary" onClick={importBackup}>
        Backup importieren
      </button>
    </div>
  </section>
);

const List = ({ title, items, remove }: any) => (
  <div className="planner__panel">
    <h2>{title}</h2>
    {items.map((item: any) => (
      <div className="planner__row" key={item.id}>
        <span>
          <strong>{item.name}</strong>
          <small>
            {item.category} · {repeatLabels[item.repeat] || item.repeat}
            {item.expectationStatus ? ` · ${incomeExpectationLabels[item.expectationStatus as IncomeExpectationStatus]}` : ""}
            {item.repeat === "custom"
              ? ` (${item.intervalDays || 1} Tage)`
              : ""}
          </small>
        </span>
        <span>{formatter.format(item.amount)}</span>
        <button onClick={() => remove(item.id)}>Löschen</button>
      </div>
    ))}
  </div>
);
const Input = ({ label, ...props }: { label: string; [key: string]: any }) => (
  <label className="planner__field">
    <span>{label}</span>
    <input {...props} />
  </label>
);
const Select = ({
  label,
  options,
  labels,
  ...props
}: {
  label: string;
  options: string[];
  labels?: Record<string, string>;
  [key: string]: any;
}) => (
  <label className="planner__field">
    <span>{label}</span>
    <select {...props}>
      {options.map((option) => (
        <option key={option} value={option}>
          {labels && labels[option] ? labels[option] : option}
        </option>
      ))}
    </select>
  </label>
);

export { HouseholdPlanner };
