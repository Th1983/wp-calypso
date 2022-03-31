import { Button, Gridicon } from '@automattic/components';
import { localizeUrl } from '@automattic/i18n-utils';
import classNames from 'classnames';
import { localize, LocalizeProps } from 'i18n-calypso';
import { map } from 'lodash';
import { useSelector } from 'react-redux';
import CardHeading from 'calypso/components/card-heading';
import Notice from 'calypso/components/notice';
import NoticeAction from 'calypso/components/notice/notice-action';
import { isEligibleForProPlan } from 'calypso/my-sites/plans-comparison';
import { getSelectedSite } from 'calypso/state/ui/selectors';
import { isAtomicSiteWithoutBusinessPlan } from './utils';

// Mapping eligibility holds to messages that will be shown to the user
function getHoldMessages(
	context: string | null,
	translate: LocalizeProps[ 'translate' ],
	eligibleForProPlan: boolean
) {
	return {
		NO_BUSINESS_PLAN: {
			title: eligibleForProPlan
				? translate( 'Upgrade to a Pro plan' )
				: translate( 'Upgrade to a Business plan' ),
			description: ( function () {
				if ( context === 'themes' ) {
					return translate(
						"You'll also get to install custom plugins, have more storage, and access live support."
					);
				}

				return translate(
					"You'll also get to install custom themes, have more storage, and access live support."
				);
			} )(),
			supportUrl: null,
		},
		SITE_PRIVATE: {
			title: translate( 'Public site needed' ),
			description: translate(
				'Change your site\'s Privacy settings to "Public" or "Hidden" (not "Private.")'
			),
			supportUrl: localizeUrl( 'https://wordpress.com/support/settings/privacy-settings/' ),
		},
		SITE_UNLAUNCHED: {
			title: translate( 'Launch your site' ),
			description: translate(
				'Only you and those you invite can view your site. Launch your site to make it visible to the public.'
			),
			supportUrl: null,
		},
		SITE_NOT_PUBLIC: {
			title: translate( 'Make your site public' ),
			description: translate( 'Only you and those you invite can view your site.' ),
			supportUrl: null,
		},
		NON_ADMIN_USER: {
			title: translate( 'Site administrator only' ),
			description: translate( 'Only the site administrators can use this feature.' ),
			supportUrl: localizeUrl( 'https://wordpress.com/support/user-roles/' ),
		},
		NOT_RESOLVING_TO_WPCOM: {
			title: translate( 'Domain pointing to a different site' ),
			description: translate(
				"Your domain is not properly set up to point to your site. Reset your domain's A records in the Domains section to fix this."
			),
			supportUrl: localizeUrl(
				'https://wordpress.com/support/move-domain/setting-custom-a-records/'
			),
		},
		EMAIL_UNVERIFIED: {
			title: translate( 'Confirm your email address' ),
			description: translate(
				"Check your email for a message we sent you when you signed up. Click the link inside to confirm your email address. You may have to check your email client's spam folder."
			),
			supportUrl: null,
		},
		EXCESSIVE_DISK_SPACE: {
			title: translate( 'Upload not available' ),
			description: translate(
				'This site is not currently eligible to install themes and plugins. Please contact our support team for help.'
			),
			supportUrl: localizeUrl( 'https://wordpress.com/help/contact' ),
		},
	};
}

/**
 * This function defines how we should communicate each type of blocking hold the public-api returns.
 * Blocking holds are "hard stops" - if we detect any, we know the Atomic Transfer won't be possible and so we
 * should short-circuit any eligibility checks and just communicate the problem.
 *
 * @param {Function} translate Translate fn
 * @returns {object} Dictionary of blocking holds and their corresponding messages
 */
export function getBlockingMessages(
	translate: LocalizeProps[ 'translate' ] | ( ( str: string ) => string )
): Record< string, { message: string; status: string | null; contactUrl: string | null } > {
	return {
		BLOCKED_ATOMIC_TRANSFER: {
			message: String(
				translate(
					'This site is not currently eligible to install themes and plugins, or activate hosting access. Please contact our support team for help.'
				)
			),
			status: 'is-error',
			contactUrl: localizeUrl( 'https://wordpress.com/help/contact' ),
		},
		TRANSFER_ALREADY_EXISTS: {
			message: String(
				translate(
					'Installation in progress. Just a minute! Please wait until the installation is finished, then try again.'
				)
			),
			status: null,
			contactUrl: null,
		},
		NO_JETPACK_SITES: {
			message: String( translate( 'Try using a different site.' ) ),
			status: 'is-error',
			contactUrl: null,
		},
		NO_VIP_SITES: {
			message: String( translate( 'Try using a different site.' ) ),
			status: 'is-error',
			contactUrl: null,
		},
		SITE_GRAYLISTED: {
			message: String(
				translate(
					"There's an ongoing site dispute. Contact us to review your site's standing and resolve the dispute."
				)
			),
			status: 'is-error',
			contactUrl: localizeUrl( 'https://wordpress.com/support/suspended-blogs/' ),
		},
		NO_SSL_CERTIFICATE: {
			message: String(
				translate(
					'Certificate installation in progress. Hold tight! We are setting up a digital certificate to allow secure browsing on your site using "HTTPS".'
				)
			),
			status: null,
			contactUrl: null,
		},
	};
}

interface ExternalProps {
	context: string | null;
	holds: string[];
	isPlaceholder: boolean;
}

type Props = ExternalProps & LocalizeProps;

export const HardBlockingNotice = ( {
	holds,
	translate,
	blockingMessages,
}: {
	holds: string[];
	translate: LocalizeProps[ 'translate' ];
	blockingMessages: ReturnType< typeof getBlockingMessages >;
} ) => {
	const blockingHold = holds.find( ( h ): h is keyof ReturnType< typeof getBlockingMessages > =>
		isHardBlockingHoldType( h, blockingMessages )
	);

	/*
		For Atomic sites on plans below Business it will return the holds TRANSFER_ALREADY_EXISTS and NO_BUSINESS_PLAN.
		Because TRANSFER_ALREADY_EXISTS is present and 'blocking' it will show an "Upload in progress" notice even when there isn't one.
		In this scenario we need to check if it's an Atomic ste (TRANSFER_ALREADY_EXISTS) on a plan below Business (NO_BUSINESS_PLAN)
		so we can stop the render of "Upload in progress" and prompt them to upgrade instead.
	*/
	if ( ! blockingHold || isAtomicSiteWithoutBusinessPlan( holds ) ) {
		return null;
	}

	return (
		<Notice
			status={ blockingMessages[ blockingHold ].status }
			text={ blockingMessages[ blockingHold ].message }
			showDismiss={ false }
		>
			{ blockingMessages[ blockingHold ].contactUrl && (
				<NoticeAction href={ blockingMessages[ blockingHold ].contactUrl } external>
					{ translate( 'Contact us' ) }
				</NoticeAction>
			) }
		</Notice>
	);
};

export const HoldList = ( { context, holds, isPlaceholder, translate }: Props ) => {
	const selectedSite = useSelector( ( state ) => getSelectedSite( state ) );
	const eligibleForProPlan = useSelector( ( state ) =>
		isEligibleForProPlan( state, selectedSite?.ID )
	);
	const holdMessages = getHoldMessages( context, translate, eligibleForProPlan );
	const blockingMessages = getBlockingMessages( translate );

	const blockingHold = holds.find( ( h ) => isHardBlockingHoldType( h, blockingMessages ) );
	const hasValidBlockingHold = blockingHold && ! isAtomicSiteWithoutBusinessPlan( holds );

	return (
		<>
			{ ! isPlaceholder && (
				<HardBlockingNotice
					holds={ holds }
					translate={ translate }
					blockingMessages={ blockingMessages }
				/>
			) }
			<div
				className={ classNames( {
					'eligibility-warnings__hold-list-dim': hasValidBlockingHold,
				} ) }
				data-testid="HoldList-Card"
			>
				<CardHeading>
					<span className="eligibility-warnings__hold-heading">
						{ getCardHeading( context, translate ) }
					</span>
				</CardHeading>
				{ isPlaceholder && (
					<div>
						<div className="eligibility-warnings__hold">
							<Gridicon icon="notice-outline" size={ 24 } />
							<div className="eligibility-warnings__message" />
						</div>
						<div className="eligibility-warnings__hold">
							<Gridicon icon="notice-outline" size={ 24 } />
							<div className="eligibility-warnings__message" />
						</div>
					</div>
				) }
				{ ! isPlaceholder &&
					map( holds, ( hold ) =>
						! isKnownHoldType( hold, holdMessages ) ? null : (
							<div className="eligibility-warnings__hold" key={ hold }>
								<div className="eligibility-warnings__message">
									<div className="eligibility-warnings__message-title">
										{ holdMessages[ hold ].title }
									</div>
									<div className="eligibility-warnings__message-description">
										{ holdMessages[ hold ].description }
									</div>
								</div>
								{ holdMessages[ hold ].supportUrl && (
									<div className="eligibility-warnings__hold-action">
										<Button
											compact
											disabled={ !! hasValidBlockingHold }
											href={ holdMessages[ hold ].supportUrl ?? '' }
											rel="noopener noreferrer"
										>
											{ translate( 'Help' ) }
										</Button>
									</div>
								) }
							</div>
						)
					) }
			</div>
		</>
	);
};

function getCardHeading( context: string | null, translate: LocalizeProps[ 'translate' ] ) {
	switch ( context ) {
		case 'plugins':
			return translate( "To install plugins you'll need to:" );
		case 'themes':
			return translate( "To install themes you'll need to:" );
		case 'hosting':
			return translate( "To activate hosting access you'll need to:" );
		case 'performance':
			return translate( "To activate Performance Features you'll need to:" );
		default:
			return translate( "To continue you'll need to:" );
	}
}

function isKnownHoldType(
	hold: string,
	holdMessages: ReturnType< typeof getHoldMessages >
): hold is keyof ReturnType< typeof getHoldMessages > {
	return holdMessages.hasOwnProperty( hold );
}

/**
 * This checks if hold coming from API is blocking (@see getBlockingMessages);
 * For example, if we detect BLOCKED_ATOMIC_TRANSFER, we should block the path forward and direct the user
 * to our support.
 *
 * @param {string} hold Specific hold we want to check
 * @param {object} blockingMessages List of all holds we consider blocking
 * @returns {boolean} Is {hold} blocking or not
 */
function isHardBlockingHoldType(
	hold: string,
	blockingMessages: ReturnType< typeof getBlockingMessages >
): hold is keyof ReturnType< typeof getBlockingMessages > {
	return blockingMessages.hasOwnProperty( hold );
}

export const hasBlockingHold = ( holds: string[] ) =>
	holds.some( ( hold ) =>
		isHardBlockingHoldType(
			hold,
			getBlockingMessages( ( str: string ) => str )
		)
	);

export default localize( HoldList );
