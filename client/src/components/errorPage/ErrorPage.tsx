import React from 'react';
import './errorPage.scss';
import { ReactComponent as ErrorTypo } from '../../resources/icons/error.svg';
import { useHistory } from 'react-router-dom';
import { Button } from '../button/Button';

const ErrorPage = () => {
	const history = useHistory();
	const handleClick = () => history.push('/');

	return (
		<div className="errorPage">
			<div className="errorPage__content">
				<ErrorTypo className="errorPage__logo" />
				<p className="errorPage__subline">
					<span>Something went wrong<br/>Please try again</span>
				</p>
				<Button text="Back" icon="arrowLeft" handleClick={handleClick}/>
			</div>
		</div>
	)
};

export { ErrorPage }
