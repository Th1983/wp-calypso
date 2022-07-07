<?php
/**
 * WP_REST_Help_Center_Search file.
 *
 * @package A8C\FSE
 */

namespace A8C\FSE;

use Automattic\Jetpack\Connection\Client;

/**
 * Class WP_REST_Help_Center_Search.
 */
class WP_REST_Help_Center_Search extends \WP_REST_Controller {
	/**
	 * WP_REST_Help_Center_Search constructor.
	 */
	public function __construct() {
		$this->namespace                       = 'wpcom/v2';
		$this->rest_base                       = 'help-center/search';
		$this->wpcom_is_site_specific_endpoint = false;
		$this->is_wpcom                        = false;

		if ( defined( 'IS_WPCOM' ) && IS_WPCOM ) {
			$this->is_wpcom = true;
		}
	}

	/**
	 * Register available routes.
	 */
	public function register_rest_route() {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_search_results' ),
					'permission_callback' => array( $this, 'permission_callback' ),
					'args'                => array(
						'query'           => array(
							'type' => 'string',
						),
						'locale'          => array(
							'type'    => 'string',
							'default' => 'en',
						),
						'include_post_id' => array(
							'type'    => 'boolean',
							'default' => true,
						),
					),
				),
			)
		);
	}

	/**
	 * Callback to determine whether the request can proceed.
	 *
	 * @return boolean
	 */
	public function permission_callback() {
		return current_user_can( 'read' );
	}

	/**
	 * Should return the search results
	 *
	 * @param \WP_REST_Request $request    The request sent to the API.
	 *
	 * @return WP_REST_Response
	 */
	public function get_search_results( \WP_REST_Request $request ) {
		$query           = $request['query'];
		$locale          = $request['locale'];
		$include_post_id = $request['include_post_id'];

		if ( $this->is_wpcom ) {
			$response = \WPCOM_Help_Search::search_wpcom_support( $query, $locale, $include_post_id );
		} else {
			$body = Client::wpcom_json_api_request_as_user(
				'/help/search/wpcom?query=' . $query . '&locale=' . $locale . '&include_post_id=' . $include_post_id
			);

			if ( is_wp_error( $body ) ) {
				return $body;
			}

			$response = json_decode( wp_remote_retrieve_body( $body ) );
		}

		return rest_ensure_response(
			array(
				'wordpress_support_links' => $response,
			)
		);
	}
}