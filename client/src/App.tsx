import React from "react";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import "./app.scss";
import AuthenticatedApp from "./components/authenticatedApp/AuthenticatedApp";
import { EntryPoint } from "./components/entryPoint/EntryPoint";
import { ErrorPage } from "./components/errorPage/ErrorPage";
import { Login } from "./components/login/Login";

function App() {
	return (
		<Router>
			<div>
				<ul className="nav">
					<li><Link to="/">Start</Link></li>
					<li><Link to="/login">Login</Link></li>
					<li><Link to="/app">Budgetplaner</Link></li>
				</ul>

				<Switch>
					<Route exact path="/">
						<AuthenticatedApp />
					</Route>
					<Route exact path="/login">
						<Login />
					</Route>
					<Route path="/app">
						<AuthenticatedApp />
					</Route>
					<Route path="/legacy">
						<EntryPoint />
					</Route>
					<Route path="/error">
						<ErrorPage />
					</Route>
				</Switch>
			</div>
		</Router>
	);
}

export default App;
