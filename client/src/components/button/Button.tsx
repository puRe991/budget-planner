import React from 'react';
import './button.scss';
import { ReactComponent as ArrowLeftIcon } from '../../resources/icons/arrow-left.svg';
import { ReactComponent as ArrowRightIcon } from '../../resources/icons/arrow-right.svg';

interface ButtonProps {
	text: string,
	handleClick?: Function,
	link?: string,
	icon?: "arrowLeft" | "arrowRight"
}

const Button = (props: ButtonProps) => {

	const ConditionalWrapper = ({ condition, wrapper, children }) => condition ? wrapper(children) : children;

	const getIcon = () => {
		if (props.icon === "arrowLeft") {
			return <ArrowLeftIcon />
		} else if (props.icon === "arrowRight") {
			return <ArrowRightIcon />
		}
	};

	return (
		<ConditionalWrapper
			condition={!!props.link}
			wrapper={children => <a className="button__link" href={props.link}>{children}</a>}
		>
			<button
				className="button"
				onClick={() => props.handleClick && props.handleClick()}
			>
				{ props.icon &&
					<span className="button__icon">
						{getIcon()}
					</span>
				}
				<span className="button__text">
					{props.text}
				</span>
			</button>
		</ConditionalWrapper>
	)
};

export { Button }