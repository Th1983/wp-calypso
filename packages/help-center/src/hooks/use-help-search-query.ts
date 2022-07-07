import apiFetch from '@wordpress/api-fetch';
import { useQuery } from 'react-query';
import type { LinksForSection } from '@automattic/data-stores';

export const useHelpSearchQuery = (
	search: string,
	queryOptions: Record< string, unknown > = {}
) => {
	return useQuery< { wordpress_support_links: LinksForSection[] } >(
		[ 'help', search ],
		() =>
			apiFetch( {
				global: true,
				path: `/wpcom/v2/help-center/search?query=${ search }`,
			} ),
		{
			enabled: !! search,
			...queryOptions,
		}
	);
};