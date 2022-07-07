/* eslint-disable no-restricted-imports */
import { Gridicon } from '@automattic/components';
import {
	getContextResults,
	LinksForSection,
	SUPPORT_TYPE_ADMIN_SECTION,
	SUPPORT_TYPE_API_HELP,
	SUPPORT_TYPE_CONTEXTUAL_HELP,
} from '@automattic/data-stores';
import { localizeUrl } from '@automattic/i18n-utils';
import { speak } from '@wordpress/a11y';
import { Icon, page as pageIcon, arrowRight } from '@wordpress/icons';
import { useTranslate } from 'i18n-calypso';
import { debounce } from 'lodash';
import page from 'page';
import PropTypes from 'prop-types';
import { Fragment, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import QueryUserPurchases from 'calypso/components/data/query-user-purchases';
import { decodeEntities, preventWidows } from 'calypso/lib/formatting';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import getAdminHelpResults from 'calypso/state/inline-help/selectors/get-admin-help-results';
import hasCancelableUserPurchases from 'calypso/state/selectors/has-cancelable-user-purchases';
import { useSiteOption } from 'calypso/state/sites/hooks';
import { getSectionName } from 'calypso/state/ui/selectors';
import { useHelpSearchQuery } from '../hooks/use-help-search-query';
import PlaceholderLines from './placeholder-lines';

interface SearchResult {
	link: string;
	title: string | React.ReactChild;
	icon?: string;
	post_id?: number;
}

interface SearchResultsSection {
	type: string;
	title: string;
	results: SearchResult[];
	condition: boolean;
}

const noop = () => {
	return;
};

function debounceSpeak( { message = '', priority = 'polite', timeout = 800 } ) {
	return debounce( () => {
		speak( message, priority );
	}, timeout );
}

const loadingSpeak = debounceSpeak( { message: 'Loading search results.', timeout: 1500 } );

const resultsSpeak = debounceSpeak( { message: 'Search results loaded.' } );

const errorSpeak = debounceSpeak( { message: 'No search results found.' } );

const filterManagePurchaseLink = ( hasPurchases: boolean, isPurchasesSection: boolean ) => {
	if ( hasPurchases || isPurchasesSection ) {
		return () => true;
	}
	return (
		article:
			| LinksForSection
			| {
					readonly link: string;
					post_id: number;
					readonly title: string;
					readonly description: string;
			  }
			| {
					type: string;
					link: string;
					readonly title: string;
					readonly description: string;
					post_id?: number;
			  }
	) => article.post_id !== 111349;
};

interface HelpSearchResults {
	externalLinks?: boolean;
	onSelect: (
		event: React.MouseEvent< HTMLAnchorElement, MouseEvent >,
		result: SearchResult
	) => void;
	onAdminSectionSelect?: ( event: React.MouseEvent< HTMLAnchorElement, MouseEvent > ) => void;
	searchQuery: string;
	placeholderLines: number;
	openAdminInNewTab: boolean;
	location: string;
}

function HelpSearchResults( {
	externalLinks = false,
	onSelect,
	onAdminSectionSelect = noop,
	searchQuery = '',
	placeholderLines,
	openAdminInNewTab = false,
	location = 'inline-help-popover',
}: HelpSearchResults ) {
	const translate = useTranslate();
	const dispatch = useDispatch();

	const hasPurchases = useSelector( hasCancelableUserPurchases );
	const sectionName = useSelector( getSectionName );
	const isPurchasesSection = [ 'purchases', 'site-purchases' ].includes( sectionName );
	const siteIntent = useSiteOption( 'site_intent' );
	const rawContextualResults = useMemo(
		() => getContextResults( sectionName, siteIntent ),
		[ sectionName, siteIntent ]
	);
	const adminResults = useSelector( ( state ) => getAdminHelpResults( state, searchQuery, 3 ) );
	const contextualResults = rawContextualResults.filter(
		// Unless searching with Inline Help or on the Purchases section, hide the
		// "Managing Purchases" documentation link for users who have not made a purchase.
		filterManagePurchaseLink( hasPurchases, isPurchasesSection )
	);
	const { data: searchData, isLoading: isSearching } = useHelpSearchQuery( searchQuery );

	const searchResults = searchData?.wordpress_support_links ?? [];
	const hasAPIResults = searchResults.length > 0;

	useEffect( () => {
		// Cancel all queued speak messages.
		loadingSpeak.cancel();
		resultsSpeak.cancel();
		errorSpeak.cancel();

		// If there's no query, then we don't need to announce anything.
		if ( ! searchQuery ) {
			return;
		}

		if ( isSearching ) {
			loadingSpeak();
		} else if ( ! hasAPIResults ) {
			errorSpeak();
		} else if ( hasAPIResults ) {
			resultsSpeak();
		}
	}, [ isSearching, hasAPIResults, searchQuery ] );

	const onLinkClickHandler = (
		event: React.MouseEvent< HTMLAnchorElement, MouseEvent >,
		result: SearchResult,
		type: string
	) => {
		const { link } = result;
		// check and catch admin section links.
		if ( type === SUPPORT_TYPE_ADMIN_SECTION && link ) {
			// record track-event.
			dispatch(
				recordTracksEvent( 'calypso_inlinehelp_admin_section_visit', {
					link: link,
					search_term: searchQuery,
					location,
					section: sectionName,
				} )
			);

			// push state only if it's internal link.
			if ( ! /^http/.test( link ) ) {
				event.preventDefault();
				openAdminInNewTab ? window.open( 'https://wordpress.com' + link, '_blank' ) : page( link );
				onAdminSectionSelect( event );
			}

			return;
		}

		onSelect( event, result );
	};

	const renderHelpLink = ( result: SearchResult, type: string ) => {
		const { link, title, icon } = result;

		const external = externalLinks && type !== SUPPORT_TYPE_ADMIN_SECTION;

		const LinkIcon = () => {
			if ( type === 'admin_section' ) {
				return <Icon icon={ arrowRight } />;
			}

			if ( icon ) {
				return <Gridicon icon={ icon } />;
			}

			return <Icon icon={ pageIcon } />;
		};

		return (
			<Fragment key={ link ?? title }>
				<li className="help-center-search-results__item">
					<div className="help-center-search-results__cell">
						<a
							href={ localizeUrl( link ) }
							onClick={ ( event ) => {
								if ( ! external ) {
									event.preventDefault();
								}
								onLinkClickHandler( event, result, type );
							} }
							{ ...( external && {
								target: '_blank',
								rel: 'noreferrer',
							} ) }
						>
							{ /* Old stuff - leaving this incase we need to quick revert
							{ icon && <Gridicon icon={ icon } size={ 18 } /> } */ }
							<LinkIcon />
							<span>{ preventWidows( decodeEntities( title ) ) }</span>
						</a>
					</div>
				</li>
			</Fragment>
		);
	};

	const renderSearchResultsSection = ( {
		type,
		title,
		results,
		condition,
	}: SearchResultsSection ) => {
		const id = `inline-search--${ type }`;

		return condition ? (
			<Fragment key={ id }>
				{ title ? (
					<h3 id={ id } className="help-center-search-results__title">
						{ title }
					</h3>
				) : null }
				<ul className="help-center-search-results__list" aria-labelledby={ title ? id : undefined }>
					{ results.map( ( result ) => renderHelpLink( result, type ) ) }
				</ul>
			</Fragment>
		) : null;
	};

	const renderSearchSections = () => {
		const sections = [
			{
				type: SUPPORT_TYPE_API_HELP,
				title: translate( 'Recommended resources' ),
				results: searchResults.slice( 0, 5 ),
				condition: ! isSearching && searchResults.length > 0,
			},
			{
				type: SUPPORT_TYPE_CONTEXTUAL_HELP,
				title: ! searchQuery.length ? translate( 'Recommended resources' ) : '',
				results: contextualResults.slice( 0, 6 ),
				condition: ! isSearching && ! searchResults.length && contextualResults.length > 0,
			},
			{
				type: SUPPORT_TYPE_ADMIN_SECTION,
				title: translate( 'Show me where to' ),
				results: adminResults,
				condition: !! searchQuery && adminResults.length > 0,
			},
		];

		return sections.map( renderSearchResultsSection );
	};

	const resultsLabel = hasAPIResults
		? translate( 'Search Results' )
		: translate( 'Helpful resources for this section' );

	const renderSearchResults = () => {
		if ( isSearching && ! searchResults.length && ! adminResults.length ) {
			return <PlaceholderLines lines={ placeholderLines } />;
		}

		return (
			<>
				{ searchQuery && ! ( hasAPIResults || isSearching ) ? (
					<p className="help-center-search-results__empty-results">
						{ translate(
							'Sorry, there were no matches. Here are some of the most searched for help pages for this section:'
						) }
					</p>
				) : null }

				<div className="help-center-search-results__results" aria-label={ resultsLabel }>
					{ renderSearchSections() }
				</div>
			</>
		);
	};

	return (
		<>
			<QueryUserPurchases />
			{ renderSearchResults() }
		</>
	);
}

HelpSearchResults.propTypes = {
	searchQuery: PropTypes.string,
	onSelect: PropTypes.func.isRequired,
	onAdminSectionSelect: PropTypes.func,
};

export default HelpSearchResults;