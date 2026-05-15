import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
	BudgetSummary,
	Expense,
	ExpenseKind,
	HouseholdBudgetData,
	Income,
	Person,
	calculateHouseholdBudget,
	createId,
	roundMoney,
	sampleBudgetData,
	toDateInputValue,
} from '../../resources/scripts/budgetEngine';
import { formatter } from '../../resources/scripts/helpers';
import './householdPlanner.scss';

interface HouseholdPlannerProps {
	date: Date;
}

type PlannerTab = 'dashboard' | 'persons' | 'incomes' | 'expenses' | 'month' | 'week' | 'day' | 'debts' | 'savings' | 'export';

const tabs: { id: PlannerTab; label: string }[] = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'persons', label: 'Personen' },
	{ id: 'incomes', label: 'Einnahmen' },
	{ id: 'expenses', label: 'Ausgaben' },
	{ id: 'month', label: 'Monat' },
	{ id: 'week', label: 'Woche' },
	{ id: 'day', label: 'Heute' },
	{ id: 'debts', label: 'Schulden' },
	{ id: 'savings', label: 'Sparziele' },
	{ id: 'export', label: 'Import / Export' },
];

const incomeCategories = ['Lohn / Gehalt', 'Bürgergeld / Sozialleistungen', 'Kindergeld', 'Unterhalt', 'Nebenjob', 'Rückzahlungen', 'Sonstige Einnahmen'];
const fixedCategories = ['Miete', 'Strom', 'Gas', 'Wasser', 'Internet', 'Handy', 'Versicherungen', 'Kredite / Schulden', 'Ratenzahlungen', 'Auto', 'Abos', 'Kindergarten / Schule', 'Sonstige Fixkosten'];
const variableCategories = ['Lebensmittel', 'Tanken', 'Drogerie', 'Haustiere', 'Kleidung', 'Freizeit', 'Essen bestellen', 'Reparaturen', 'Gesundheit', 'Sonstiges'];

const today = new Date();
const defaultDate = toDateInputValue(today);

const emptyPerson = (): Person => ({
	id: createId('person'),
	name: '',
	monthlyIncome: 0,
	personalAllowance: 0,
	sharedCostShare: 50,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
});

const emptyIncome = (): Income => ({
	id: createId('income'),
	name: '',
	amount: 0,
	ownerType: 'household',
	date: defaultDate,
	repeat: 'monthly',
	category: 'Lohn / Gehalt',
	note: '',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
});

const emptyExpense = (): Expense => ({
	id: createId('expense'),
	name: '',
	amount: 0,
	kind: 'variable',
	category: 'Lebensmittel',
	date: defaultDate,
	ownerType: 'household',
	status: 'paid',
	repeat: 'once',
	note: '',
	critical: false,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
});

const HouseholdPlanner = ({ date }: HouseholdPlannerProps) => {
	const [data, setData] = useState<HouseholdBudgetData>(() => {
		const stored = window.localStorage.getItem('household-budget-planner');
		return stored ? JSON.parse(stored) : sampleBudgetData;
	});
	const [activeTab, setActiveTab] = useState<PlannerTab>('dashboard');
	const [personDraft, setPersonDraft] = useState<Person>(emptyPerson());
	const [incomeDraft, setIncomeDraft] = useState<Income>(emptyIncome());
	const [expenseDraft, setExpenseDraft] = useState<Expense>(emptyExpense());
	const [importText, setImportText] = useState('');
	const summary = useMemo<BudgetSummary>(() => calculateHouseholdBudget(data, date, today), [data, date]);

	useEffect(() => {
		window.localStorage.setItem('household-budget-planner', JSON.stringify(data));
	}, [data]);

	const updatePersonDraft = (field: keyof Person, value: string) => {
		setPersonDraft({ ...personDraft, [field]: ['monthlyIncome', 'personalAllowance', 'sharedCostShare', 'savingsGoal'].includes(field) ? Number(value) : value });
	};

	const addPerson = (event: FormEvent) => {
		event.preventDefault();
		if (!personDraft.name.trim()) return;
		setData({ ...data, persons: [...data.persons, { ...personDraft, updatedAt: new Date().toISOString() }] });
		setPersonDraft(emptyPerson());
	};

	const removePerson = (id: string) => setData({ ...data, persons: data.persons.filter((person) => person.id !== id) });

	const updateIncomeDraft = (field: keyof Income, value: string) => {
		setIncomeDraft({ ...incomeDraft, [field]: field === 'amount' ? Number(value) : value });
	};

	const addIncome = (event: FormEvent) => {
		event.preventDefault();
		if (!incomeDraft.name.trim()) return;
		setData({ ...data, incomes: [...data.incomes, { ...incomeDraft, updatedAt: new Date().toISOString() }] });
		setIncomeDraft(emptyIncome());
	};

	const updateExpenseDraft = (field: keyof Expense, value: string | boolean) => {
		const next: Expense = { ...expenseDraft, [field]: field === 'amount' ? Number(value) : value } as Expense;
		if (field === 'kind') next.category = value === 'fixed' ? 'Miete' : 'Lebensmittel';
		setExpenseDraft(next);
	};

	const addExpense = (event: FormEvent) => {
		event.preventDefault();
		if (!expenseDraft.name.trim()) return;
		setData({ ...data, expenses: [...data.expenses, { ...expenseDraft, updatedAt: new Date().toISOString() }] });
		setExpenseDraft(emptyExpense());
	};

	const addQuickExpense = (amount: number, name: string) => {
		if (!amount || !name.trim()) return;
		const quickExpense: Expense = { ...emptyExpense(), name, amount, date: defaultDate, category: 'Sonstiges', note: 'Schnelle Ausgabe' };
		setData({ ...data, expenses: [...data.expenses, quickExpense] });
	};

	const markExpensePaid = (expenseId: string) => {
		setData({ ...data, expenses: data.expenses.map((expense) => expense.id === expenseId ? { ...expense, status: 'paid' } : expense) });
	};

	const removeExpense = (expenseId: string) => setData({ ...data, expenses: data.expenses.filter((expense) => expense.id !== expenseId) });
	const removeIncome = (incomeId: string) => setData({ ...data, incomes: data.incomes.filter((income) => income.id !== incomeId) });

	const exportJson = JSON.stringify(data, null, 2);
	const exportCsv = [
		'Typ;Name;Betrag;Kategorie;Datum;Person/Haushalt;Status;Wiederholung;Notiz',
		...data.incomes.map((income) => `Einnahme;${income.name};${income.amount};${income.category};${income.date};${income.personId || 'Haushalt'};;${income.repeat};${income.note || ''}`),
		...data.expenses.map((expense) => `Ausgabe;${expense.name};${expense.amount};${expense.category};${expense.date};${expense.personId || 'Haushalt'};${expense.status};${expense.repeat};${expense.note || ''}`),
	].join('\n');

	const importBackup = () => {
		try {
			setData(JSON.parse(importText));
			setImportText('');
		} catch (error) {
			alert('Backup konnte nicht gelesen werden. Bitte JSON prüfen.');
		}
	};

	return (
		<div className="planner">
			<header className={`planner__hero planner__hero--${summary.status}`}>
				<div>
					<p className="planner__eyebrow">Wichtigste Antwort</p>
					<h1>Heute noch ausgeben: {formatter.format(Math.max(0, summary.dailyBudget))}</h1>
					<p>Damit das Geld bis Monatsende reicht. Wochenlimit: <strong>{formatter.format(summary.weeklyBudget)}</strong></p>
				</div>
				<div className="planner__heroStatus">
					<span>{summary.status.toUpperCase()}</span>
					<strong>{summary.statusText}</strong>
					<small>{summary.projectedRunOutDate ? `Prognose: aufgebraucht am ${summary.projectedRunOutDate.toLocaleDateString('de-DE')}` : 'Prognose: Geld reicht bis Monatsende'}</small>
				</div>
			</header>

			<nav className="planner__tabs" aria-label="Budgetbereiche">
				{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'planner__tab planner__tab--active' : 'planner__tab'} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
			</nav>

			{activeTab === 'dashboard' && <Dashboard summary={summary} data={data} />}
			{activeTab === 'persons' && <Persons data={data} summary={summary} draft={personDraft} updateDraft={updatePersonDraft} addPerson={addPerson} removePerson={removePerson} />}
			{activeTab === 'incomes' && <Incomes data={data} draft={incomeDraft} updateDraft={updateIncomeDraft} addIncome={addIncome} removeIncome={removeIncome} />}
			{activeTab === 'expenses' && <Expenses data={data} draft={expenseDraft} updateDraft={updateExpenseDraft} addExpense={addExpense} markPaid={markExpensePaid} removeExpense={removeExpense} />}
			{activeTab === 'month' && <MonthPlanning summary={summary} />}
			{activeTab === 'week' && <WeekPlanning summary={summary} data={data} />}
			{activeTab === 'day' && <DayPlanning summary={summary} data={data} addQuickExpense={addQuickExpense} />}
			{activeTab === 'debts' && <Debts data={data} />}
			{activeTab === 'savings' && <Savings data={data} />}
			{activeTab === 'export' && <ExportArea exportJson={exportJson} exportCsv={exportCsv} importText={importText} setImportText={setImportText} importBackup={importBackup} />}
		</div>
	);
};

const Dashboard = ({ summary, data }: { summary: BudgetSummary; data: HouseholdBudgetData }) => (
	<section className="planner__grid">
		<Metric title="Gesamtgeld im Haushalt" value={formatter.format(summary.totalIncome)} />
		<Metric title="Verfügbar nach Fixkosten" value={formatter.format(summary.householdBudget)} />
		<Metric title="Verfügbar bis Monatsende" value={formatter.format(summary.remainingMoney)} highlight />
		<Metric title="Tagesbudget ab heute" value={formatter.format(summary.dailyBudget)} highlight />
		<Metric title="Wochenbudget ab heute" value={formatter.format(summary.weeklyBudget)} />
		<Metric title="Bereits ausgegeben" value={formatter.format(summary.paidExpenses)} />
		<Metric title="Noch offene Fixkosten" value={formatter.format(summary.openBills)} />
		<Metric title="Geld pro Person" value={data.persons.map((person) => person.name).join(', ')} text />
		<div className={`planner__card planner__card--${summary.status} planner__wide`}>
			<h3>Warnsystem</h3>
			<p><strong>{summary.statusText}</strong></p>
			<p>Noch {summary.remainingDays} Tage. Wenn täglich mehr als {formatter.format(summary.dailyBudget)} ausgegeben wird, reicht das Geld nicht bis Monatsende.</p>
			{summary.missingMoney > 0 && <p>Es fehlen voraussichtlich {formatter.format(summary.missingMoney)}. Spare ca. {formatter.format(summary.savingsNeededPerDay)} pro Tag.</p>}
		</div>
	</section>
);

const Metric = ({ title, value, highlight, text }: { title: string; value: string; highlight?: boolean; text?: boolean }) => (
	<div className={highlight ? 'planner__card planner__card--highlight' : 'planner__card'}>
		<h3>{title}</h3>
		<strong className={text ? 'planner__textValue' : ''}>{value}</strong>
	</div>
);

const Persons = ({ data, summary, draft, updateDraft, addPerson, removePerson }: any) => (
	<section className="planner__twoColumns">
		<form className="planner__panel" onSubmit={addPerson}>
			<h2>Person hinzufügen</h2>
			<Input label="Name" value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} />
			<Input label="Monatliches Einkommen" type="number" value={draft.monthlyIncome} onChange={(e) => updateDraft('monthlyIncome', e.target.value)} />
			<Input label="Taschengeld / freies Budget" type="number" value={draft.personalAllowance} onChange={(e) => updateDraft('personalAllowance', e.target.value)} />
			<Input label="Anteil an gemeinsamen Kosten (%)" type="number" value={draft.sharedCostShare} onChange={(e) => updateDraft('sharedCostShare', e.target.value)} />
			<Input label="Persönliches Sparziel (optional)" type="number" value={draft.savingsGoal || 0} onChange={(e) => updateDraft('savingsGoal', e.target.value)} />
			<button className="planner__primary">Person speichern</button>
		</form>
		<div className="planner__panel">
			<h2>Geld pro Person</h2>
			{summary.personBudgets.map((budget: any) => <div className="planner__row" key={budget.personId}><span><strong>{budget.name}</strong><small>Einnahmen {formatter.format(budget.income)} · Anteil Kosten {formatter.format(budget.sharedCostShare)}</small></span><span>{formatter.format(budget.freeMoney)}<small>{formatter.format(budget.dailyBudget)} / Tag</small></span><button onClick={() => removePerson(budget.personId)}>Entfernen</button></div>)}
		</div>
	</section>
);

const Incomes = ({ data, draft, updateDraft, addIncome, removeIncome }: any) => (
	<section className="planner__twoColumns">
		<form className="planner__panel" onSubmit={addIncome}>
			<h2>Einnahme erfassen</h2>
			<Input label="Name" value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} />
			<Input label="Betrag" type="number" value={draft.amount} onChange={(e) => updateDraft('amount', e.target.value)} />
			<Select label="Kategorie" value={draft.category} onChange={(e) => updateDraft('category', e.target.value)} options={incomeCategories} />
			<Select label="Person oder Haushalt" value={draft.personId || 'household'} onChange={(e) => updateDraft('personId', e.target.value === 'household' ? '' : e.target.value)} options={['household', ...data.persons.map((person: Person) => person.id)]} labels={{ household: 'Gemeinsame Haushaltskasse', ...Object.fromEntries(data.persons.map((person: Person) => [person.id, person.name])) }} />
			<Input label="Datum" type="date" value={draft.date} onChange={(e) => updateDraft('date', e.target.value)} />
			<Select label="Wiederholung" value={draft.repeat} onChange={(e) => updateDraft('repeat', e.target.value)} options={['once', 'weekly', 'monthly', 'yearly']} labels={{ once: 'einmalig', weekly: 'wöchentlich', monthly: 'monatlich', yearly: 'jährlich' }} />
			<Input label="Notiz" value={draft.note || ''} onChange={(e) => updateDraft('note', e.target.value)} />
			<button className="planner__primary">Einnahme speichern</button>
		</form>
		<List title="Einnahmen" items={data.incomes} remove={removeIncome} />
	</section>
);

const Expenses = ({ data, draft, updateDraft, addExpense, markPaid, removeExpense }: any) => (
	<section className="planner__twoColumns">
		<form className="planner__panel" onSubmit={addExpense}>
			<h2>Ausgabe erfassen</h2>
			<Input label="Name" value={draft.name} onChange={(e) => updateDraft('name', e.target.value)} />
			<Input label="Betrag" type="number" value={draft.amount} onChange={(e) => updateDraft('amount', e.target.value)} />
			<Select label="Art" value={draft.kind} onChange={(e) => updateDraft('kind', e.target.value as ExpenseKind)} options={['fixed', 'variable']} labels={{ fixed: 'Fixkosten', variable: 'Variable Ausgabe' }} />
			<Select label="Kategorie" value={draft.category} onChange={(e) => updateDraft('category', e.target.value)} options={draft.kind === 'fixed' ? fixedCategories : variableCategories} />
			<Select label="Zahlungsstatus" value={draft.status} onChange={(e) => updateDraft('status', e.target.value)} options={['open', 'paid']} labels={{ open: 'offen', paid: 'bezahlt' }} />
			<Select label="Person oder Haushalt" value={draft.personId || 'household'} onChange={(e) => updateDraft('personId', e.target.value === 'household' ? '' : e.target.value)} options={['household', ...data.persons.map((person: Person) => person.id)]} labels={{ household: 'Gemeinsame Haushaltskasse', ...Object.fromEntries(data.persons.map((person: Person) => [person.id, person.name])) }} />
			<Input label="Datum" type="date" value={draft.date} onChange={(e) => updateDraft('date', e.target.value)} />
			<Select label="Wiederholung" value={draft.repeat} onChange={(e) => updateDraft('repeat', e.target.value)} options={['once', 'daily', 'weekly', 'monthly', 'yearly']} labels={{ once: 'einmalig', daily: 'täglich', weekly: 'wöchentlich', monthly: 'monatlich', yearly: 'jährlich' }} />
			<label className="planner__check"><input type="checkbox" checked={draft.critical} onChange={(e) => updateDraft('critical', e.target.checked)} /> Kritische Rechnung</label>
			<Input label="Notiz" value={draft.note || ''} onChange={(e) => updateDraft('note', e.target.value)} />
			<button className="planner__primary">Ausgabe speichern</button>
		</form>
		<div className="planner__panel"><h2>Ausgaben</h2>{data.expenses.map((expense: Expense) => <div className="planner__row" key={expense.id}><span><strong>{expense.name}</strong><small>{expense.kind === 'fixed' ? 'Fixkosten' : 'Variabel'} · {expense.category} · {expense.status === 'open' ? 'offen' : 'bezahlt'}</small></span><span>{formatter.format(expense.amount)}</span>{expense.status === 'open' && <button onClick={() => markPaid(expense.id)}>Bezahlt</button>}<button onClick={() => removeExpense(expense.id)}>Löschen</button></div>)}</div>
	</section>
);

const MonthPlanning = ({ summary }: { summary: BudgetSummary }) => <section className="planner__grid"><Metric title="Startbudget" value={formatter.format(summary.totalIncome)} /><Metric title="Gesamteinnahmen" value={formatter.format(summary.totalIncome)} /><Metric title="Gesamtausgaben" value={formatter.format(summary.totalExpenses)} /><Metric title="Fixkosten" value={formatter.format(summary.fixedCosts)} /><Metric title="Variable Ausgaben" value={formatter.format(summary.variableExpenses)} /><Metric title="Restgeld" value={formatter.format(summary.remainingMoney)} highlight /><Metric title="Tagesbudget" value={formatter.format(summary.dailyBudget)} /><Metric title="Wochenbudget" value={formatter.format(summary.weeklyBudget)} /><Metric title="Sparbetrag" value={formatter.format(summary.mandatorySavings)} /><Metric title="Schuldenzahlungen" value="siehe Schulden" text /><Metric title="Offener Betrag" value={formatter.format(summary.openBills)} /></section>;

const WeekPlanning = ({ summary, data }: { summary: BudgetSummary; data: HouseholdBudgetData }) => {
	const spentThisWeek = roundMoney(data.expenses.filter((expense) => expense.status === 'paid').slice(-5).reduce((total, expense) => total + expense.amount, 0));
	return <section className="planner__grid"><Metric title="Budget für diese Woche" value={formatter.format(summary.weeklyBudget)} highlight /><Metric title="Bereits ausgegeben diese Woche" value={formatter.format(spentThisWeek)} /><Metric title="Restbudget diese Woche" value={formatter.format(summary.weeklyBudget - spentThisWeek)} /><Metric title="Tägliches Limit" value={formatter.format(summary.dailyBudget)} /><div className="planner__card planner__wide"><h3>Geplante Ausgaben & Warnung</h3><p>{spentThisWeek > summary.weeklyBudget ? 'Wochenbudget überschritten. Bitte Ausgaben sofort reduzieren.' : 'Wochenbudget ist aktuell im Rahmen.'}</p><ul>{data.expenses.filter((expense) => expense.status === 'open').map((expense) => <li key={expense.id}>{expense.name}: {formatter.format(expense.amount)}</li>)}</ul></div></section>;
};

const DayPlanning = ({ summary, data, addQuickExpense }: any) => {
	const [amount, setAmount] = useState('');
	const [name, setName] = useState('');
	const spentToday = roundMoney(data.expenses.filter((expense: Expense) => expense.status === 'paid' && expense.date === defaultDate).reduce((total: number, expense: Expense) => total + expense.amount, 0));
	return <section className="planner__twoColumns"><div className="planner__panel"><h2>Tagesübersicht</h2><p className="planner__big">Heute verfügbar: {formatter.format(summary.dailyBudget)}</p><p>Bereits ausgegeben: {formatter.format(spentToday)}</p><p>Heute noch möglich: {formatter.format(Math.max(0, summary.dailyBudget - spentToday))}</p><p>{spentToday > summary.dailyBudget ? 'Warnung: Tagesbudget überschritten.' : 'Heute bist du im Plan.'}</p></div><form className="planner__panel" onSubmit={(e) => { e.preventDefault(); addQuickExpense(Number(amount), name); setAmount(''); setName(''); }}><h2>Schnelle Ausgabe</h2><Input label="Was?" value={name} onChange={(e) => setName(e.target.value)} /><Input label="Betrag" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /><button className="planner__primary">Ausgabe erfassen</button></form></section>;
};

const Debts = ({ data }: { data: HouseholdBudgetData }) => <section className="planner__panel"><h2>Schulden und Raten</h2>{data.debts.map((debt) => <div className="planner__row" key={debt.id}><span><strong>{debt.creditor}</strong><small>Restschuld {formatter.format(debt.totalAmount - debt.paidAmount)} · fällig {new Date(debt.dueDate).toLocaleDateString('de-DE')}</small></span><span>{formatter.format(debt.monthlyRate)} / Monat</span></div>)}</section>;
const Savings = ({ data }: { data: HouseholdBudgetData }) => <section className="planner__panel"><h2>Sparziele</h2>{data.savingsGoals.map((goal) => <div className="planner__row" key={goal.id}><span><strong>{goal.name}</strong><small>{goal.mandatory ? 'verpflichtend, reduziert Tagesbudget' : 'optional'}</small></span><span>{Math.round((goal.currentAmount / goal.targetAmount) * 100)} %<small>{formatter.format(goal.currentAmount)} von {formatter.format(goal.targetAmount)}</small></span></div>)}</section>;

const ExportArea = ({ exportJson, exportCsv, importText, setImportText, importBackup }: any) => <section className="planner__twoColumns"><div className="planner__panel"><h2>Export</h2><p>CSV für Tabellen, JSON als manuelle Backup-Datei. PDF: Browser-Druckfunktion „Als PDF speichern“ nutzen.</p><textarea readOnly value={exportCsv} /><textarea readOnly value={exportJson} /></div><div className="planner__panel"><h2>Import</h2><p>Backup-Datei hier einfügen. Daten bleiben lokal im Browserzustand; keine externen Dienste oder Tracking.</p><textarea value={importText} onChange={(e) => setImportText(e.target.value)} /><button className="planner__primary" onClick={importBackup}>Backup importieren</button></div></section>;

const List = ({ title, items, remove }: any) => <div className="planner__panel"><h2>{title}</h2>{items.map((item: any) => <div className="planner__row" key={item.id}><span><strong>{item.name}</strong><small>{item.category} · {item.repeat}</small></span><span>{formatter.format(item.amount)}</span><button onClick={() => remove(item.id)}>Löschen</button></div>)}</div>;
const Input = ({ label, ...props }: { label: string; [key: string]: any }) => <label className="planner__field"><span>{label}</span><input {...props} /></label>;
const Select = ({ label, options, labels, ...props }: { label: string; options: string[]; labels?: Record<string, string>; [key: string]: any }) => <label className="planner__field"><span>{label}</span><select {...props}>{options.map((option) => <option key={option} value={option}>{labels && labels[option] ? labels[option] : option}</option>)}</select></label>;

export { HouseholdPlanner };
