const path = require('path');
const factory = require('@graphy/core.data.factory');

const PDR_DATA = require('../common/paths.js').data;

const load_json = s_file => require(path.join(PDR_DATA, s_file));  // eslint-disable-line global-require

// cities
{
	const A_AIRPORTS = load_json('aviation-edge/airports.json');

	for(let g_airport of A_AIRPORTS) {
		query(/* syntax: sparql */ `
			select
				?airport
			{
				?airport
					wdt:P238 ${factory.literal(g_airport.codeIataAirport).terse()} ;
					wdt:P239 ${factory.literal(g_airport.codeIcaoAirport).terse()} ;
					wdt:P131+ ?super
					.
			}
		`);
	}
}

