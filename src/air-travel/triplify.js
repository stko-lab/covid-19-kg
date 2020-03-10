const path = require('path');
const ttl_write = require('@graphy/content.ttl.write');

const H_PREFIXES = require('../common/prefixes.js');

const PDR_DATA = require('../common/paths.js').data;

const load_json = s_file => require(path.join(PDR_DATA, s_file));  // eslint-disable-line global-require

const suffix = s => s.replace(/\s+/g, '_');

// create ttl writer
let ds_writer = ttl_write({
	prefixes: H_PREFIXES,
});

// prevent conflicts
function define(s_name, h_hash, si_key, w_value) {
	if(si_key in h_hash) {
		console.warn(`conflict with keys ${si_key} in ${s_name}`);
	}

	h_hash[si_key] = w_value;
}

// countries
let h_countries = {};
{
	const A_COUNTRIES = load_json('aviation-edge/countries.json');

	for(let g_country of A_COUNTRIES) {
		define('countries', h_countries, g_country.codeIso2Country, {
			country_name: g_country.nameCountry,
		});

		// materialize country
		ds_writer.write({
			type: 'c3',
			value: {
				[`covid19-country:${g_country.codeIso2Country}`]: {
					a: 'covid19:Country',
					'rdfs:label': '@en"'+g_country.nameCountry,
					'covid19:continent': `covid19-continent:${g_country.continent}`,
				},
			},
		});
	}
}

// cities
let h_cities = {};
{
	const A_CITIES = load_json('aviation-edge/cities.json');

	let h_names_cities = {};

	for(let g_city of A_CITIES) {
		let si_city = suffix(`${g_city.codeIso2Country}.${g_city.codeIataCity}.${g_city.nameCity}`);
		define('city-names', h_names_cities, si_city, g_city.codeIataCity);

		define('cities', h_cities, g_city.codeIataCity, {
			city_code: g_city.codeIataCity,
			city_name: g_city.nameCity,
			city_suffix: si_city,
			country_code: g_city.codeIso2Country,
		});

		// materialize city
		ds_writer.write({
			type: 'c3',
			value: {
				[`covid19-city:${g_city.codeIataCity}`]: {
					a: 'covid19:City',
					'rdfs:label': '@en"'+g_city.nameCity,
					'covid19:country': `covid19-country:${g_city.codeIso2Country}`,
					'covid19:iataCityCode': '"'+g_city.codeIataCity,
					'time:timeZone': `timezone:${g_city.timezone}`,
				},
			},
		});
	}
}


// airports
let h_airports = {};
{
	const A_AIRPORTS = load_json('aviation-edge/airports.json');

	for(let g_airport of A_AIRPORTS) {
		let si_airport = `${g_airport.codeIataAirport || '_'}.${g_airport.codeIcaoAirport}`;

		define('airports', h_airports, si_airport, {
			airport_name: g_airport.nameAirport,
			city_code: g_airport.codeIataCity,
			country_code: g_airport.codeIso2Country,
		});

		// materialize airport
		ds_writer.write({
			type: 'c3',
			value: {
				[`covid19-airport:${si_airport}`]: {
					a: 'covid19:Airport',
					'rdfs:label': '@en"'+g_airport.nameAirport,
					'covid19:city': `covid19-city:${g_airport.codeIataCity}`,
					'covid19:country': `covid19-country:${g_airport.codeIso2Country}`,
					'covid19:iataAirportCode': '"'+g_airport.codeIataAirport,
					'covid19:icaoAirportCode': '"'+g_airport.codeIcaoAirport,
					'time:timeZone': `timezone:${g_airport.timezone}`,
					'geosparql:hasGeometry': {
						'geosparql:asWKT': `^geosparql:wktLiteral"<http://www.opengis.net/def/crs/OGC/1.3/CRS84>POINT(${g_airport.longitudeAirport} ${g_airport.latitudeAirport})`,
					},
				},
			},
		});
	}
}

// airlines
let h_airlines = {};
{
	const A_AIRLINES = load_json('aviation-edge/airlines.json');

	for(let g_airline of A_AIRLINES) {
		// && g_airline.type.includes('scheduled')
		if('active' === g_airline.statusAirline) {
			let si_airline = `${g_airline.codeIataAirline || '_'}.${g_airline.codeIcaoAirline || '_'}`;

			define('airlines', h_airlines, si_airline, {
				airline_name: g_airline.nameAirline,
				airline_country_code: g_airline.codeIso2Country,
			});

			// materialize airline
			ds_writer.write({
				type: 'c3',
				value: {
					[`covid19-airline:${si_airline}`]: {
						a: 'covid19:Airline',
						'rdfs:label': '@en"'+g_airline.nameAirline,
						'covid19:callsign': '"'+g_airline.callsign,
						'covid19:operatesIn': `covid19-country:${g_airline.codeIso2Country}`,
					},
				},
			});
		}
	}
}


ds_writer.pipe(process.stdout);

const A_ROUTES = load_json('aviation-edge/routes.json');
for(let g_route of A_ROUTES) {
	let si_departure_airport = `${g_route.departureIata || '_'}.${g_route.departureIcao || '_'}`;
	let si_arrival_airport = `${g_route.arrivalIata || '_'}.${g_route.arrivalIcao || '_'}`;
	let si_airline = `${g_route.airlineIata || '_'}.${g_route.airlineIcao || '_'}`;

	let g_airport_departure = h_airports[si_departure_airport];

	if(!g_airport_departure) continue;

	let {
		city_code: si_departure_city,
		country_code: si_departure_country,
		airport_name: s_departure_airport,
	} = g_airport_departure;


	let g_airport_arrival = h_airports[si_arrival_airport];

	if(!g_airport_arrival) continue;

	let {
		city_code: si_arrival_city,
		country_code: si_arrival_country,
		airport_name: s_arrival_airport,
	} = h_airports[si_arrival_airport];

	// let {
	// 	// city_name: s_departure_city,
	// 	city_suffix: sc1s_departure_city,
	// } = h_cities[si_departure_city];

	// let {
	// 	// city_name: s_arrival_city,
	// 	city_suffix: sc1s_arrival_city,
	// } = h_cities[si_arrival_city];

	let {
		country_name: s_departure_country,
	} = h_countries[si_departure_country];

	let {
		country_name: s_arrival_country,
	} = h_countries[si_arrival_country];


	// not seen
	if(!(si_airline in h_airlines)) {
		console.warn(`Missing airline "${si_airline}"`);
		h_airlines[si_airline] = null;
		continue;
	}

	// seen but empty
	if(!h_airlines[si_airline]) {
		continue;
	}

	let {
		airline_name: s_airline,
	} = h_airlines[si_airline];

	let sc1_route = `covid19-route:${si_airline}_${si_departure_airport}-${si_arrival_airport}`;

	ds_writer.write({
		type: 'c3',
		value: {
			[sc1_route]: {
				a: 'covid19:Route',
				'rdfs:label': `@en"${si_departure_airport} -> ${si_arrival_airport} (${si_airline})`,
				'dct:description': `@en"Internatioanal route from ${s_departure_airport}, ${s_departure_country} to ${s_arrival_airport}, ${s_arrival_country} operated by ${s_airline}`,
				'covid19:departsAirport': 'covid19-airport:'+si_departure_airport,
				'covid19:arrivesAirport': 'covid19-airport:'+si_arrival_airport,
				'covid19:departsCity': 'covid19-city:'+si_departure_city,
				'covid19:arrivesCity': 'covid19-city:'+si_arrival_city,
				'covid19:departsCountry': 'covid19-country:'+si_departure_country,
				'covid19:arrivesCountry': 'covid19-country:'+si_arrival_country,
				'covid19:airline': 'covid19-airline:'+si_airline,
			},
		},
	});
}

ds_writer.end();
