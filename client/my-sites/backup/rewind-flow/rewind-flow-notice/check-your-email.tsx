import { useTranslate, TranslateResult } from 'i18n-calypso';
import { FunctionComponent } from 'react';
import Notice, { RewindFlowNoticeLevel } from './index';

interface Props {
	message: TranslateResult;
}

const RewindFlowCheckYourEmail: FunctionComponent< Props > = ( { message } ) => {
	const translate = useTranslate();

	return (
		<Notice
			gridicon="mail"
			type={ RewindFlowNoticeLevel.REMINDER }
			message={ message }
			title={ translate( 'Check your email' ) }
		/>
	);
};

export default RewindFlowCheckYourEmail;
