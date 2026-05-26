import React from 'react';
import './login.scss';
import { ReactComponent as NodgetLogo } from '../../resources/icons/nodget-logo.svg';
import { Button } from '../button/Button';

const Login = () => {
	const notionClientId = process.env.REACT_APP_NOTION_CLIENT_ID;

	const getAuthUrl = () => {
		if (!notionClientId) {
			return '/error';
		}

		const redirectUrl = encodeURIComponent('http://localhost:3000/');
		return `https://api.notion.com/v1/oauth/authorize?client_id=${notionClientId}&redirect_uri=${redirectUrl}&response_type=code`;
	};

	return (
		<div className="login">
			<div className="login__content">
				<NodgetLogo className="login__logo" />
				<p className="login__subline">Notion Budget Planner</p>
				<Button
					text="Connect with Notion"
					icon="notionLogo"
					link={getAuthUrl()}
				/>
			</div>
		</div>
	);
};

export { Login };
