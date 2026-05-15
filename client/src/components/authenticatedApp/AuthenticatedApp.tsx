import React, { useState } from "react";
import { DateSelect } from "../dateSelect/DateSelect";
import { HouseholdPlanner } from "../householdPlanner/HouseholdPlanner";
import "./authenticatedApp.scss";

function AuthenticatedApp() {
	const [date, setDate] = useState<Date>(new Date());

	return (
		<div className="content">
			<div className="content__header">
				<div>
					<p className="content__eyebrow">Lokaler Haushalts-Budgetplaner</p>
					<h1>Budget bis Monatsende planen</h1>
				</div>
				<DateSelect
					handleDateChange={(newDate: any) => setDate(newDate)}
					type="month"
				/>
			</div>
			<HouseholdPlanner date={date} />
		</div>
	);
}

export default AuthenticatedApp;
