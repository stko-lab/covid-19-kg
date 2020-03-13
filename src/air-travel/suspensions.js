const axios = require('axios');
const qs = require('qs');
const factory = require('@graphy/core.data.factory');
const sparql = require('../common/sparql.js');
const H_PREFIXES = require('../common/prefixes.js');

const S_PREFIXES = Object.entries(H_PREFIXES).reduce((s_out, [si_prefix, p_iri]) => `${s_out}
	prefix ${si_prefix}: <${p_iri}>`, '');

const construct = async(srq_query) => {
	let d_res;
	try {
		d_res = await axios({
			method: 'POST',
			// responseType: 'stream',
			url: process.env.STKO_ROUTES_GLOBAL_ENDPOINT,
			data: qs.stringify({
				query: S_PREFIXES+'\n'+srq_query,
			}),
			headers: {
				accept: 'text/turtle',
				'content-type': 'application/x-www-form-urlencoded',
			},
		});
	}
	catch(e_req) {
		debugger;
		console.warn(e_req);
		return null;
	}

	return d_res.data;
};

const between_places = (s_type, sc1_place_a, sc1_place_b) => {
	let kt_place_a = factory.c1(sc1_place_a, H_PREFIXES);
	let kt_place_b = factory.c1(sc1_place_b, H_PREFIXES);

	// both named nodes
	if(kt_place_a.isNamedNode && kt_place_b.isNamedNode) {
		let sc1n_place_a = kt_place_a.terse(H_PREFIXES);
		let sc1n_place_b = kt_place_b.terse(H_PREFIXES);

		return /* syntax: sparql */ `
			# "between ${sc1n_place_a} and ${sc1n_place_b}"
			values (?departs_${s_type} ?arrives_${s_type}) {
				( ${sc1n_place_a} ${sc1n_place_b} )
				( ${sc1n_place_b} ${sc1n_place_a} )
			}
		`;
	}
};

const places = (s_type, a_places) => {
	let akt_places = a_places.map(sc1_place => factory.c1(sc1_place, H_PREFIXES));

	// wildcard
	if(a_places.includes('*')) {
		debugger;
	}

	// all named nodes
	if(akt_places.every(kt => kt.isNamedNode)) {
		let s_places = akt_places.map(kt => kt.terse(H_PREFIXES)).join(' ');

		return /* syntax: sparql */ `
			values ?departs_${s_type} {
				${s_places}
			}

			values ?arrives_${s_type} {
				${s_places}
			}

			filter(?departs_country != ?arrives_country)
		`;
	}
	else {
		let srq = `
			filter(?departs_country != ?arrives_country)

			?departs_${s_type} rdfs:label ?departs_${s_type}_label .
			?arrives_${s_type} rdfs:label ?arrives_${s_type}_label .
		`;

		srq += 'filter('+akt_places.flatMap((kt_place) => {
			let sc1_place = kt_place.terse(H_PREFIXES);

			if(kt_place.isNamedNode) {
				return `?departs_${s_type} = ${sc1_place}`;
			}
			else if(kt_place.isLanguaged) {
				return `?departs_${s_type}_label = ${sc1_place}`;
			}
			else {
				console.warn(`Unhandled RDF term type for place: ${kt_place.verbose()}`);
			}

			return [];
		}).join(' || ')+')\n';

		srq += 'filter('+akt_places.flatMap((kt_place) => {
			let sc1_place = kt_place.terse(H_PREFIXES);

			if(kt_place.isNamedNode) {
				return `?arrives_${s_type} = ${sc1_place}`;
			}
			else if(kt_place.isLanguaged) {
				return `?arrives_${s_type}_label = ${sc1_place}`;
			}
			else {
				console.warn(`Unhandled RDF term type for place: ${kt_place.verbose()}`);
			}

			return [];
		}).join(' || ')+')\n';

		return srq;
	}
};

const H_PREDICATES = {
	cities(a_cities) {
		return places('city', a_cities);
	},

	countries(a_countries) {
		return places('country', a_countries);
	},

	betweenCities([sc1_city_a, sc1_city_b]) {
		return places('city', [sc1_city_a, sc1_city_b]);
	},

	betweenCountries([sc1_country_a, sc1_country_b]) {
		return places('country', sc1_country_a, sc1_country_b);
	},

};

module.exports = {
	async* apply_airline_rules(ds_writer, h_airlines) {
		for(let [sc1_airline, a_rules] of Object.entries(h_airlines)) {
			let kt_airline = factory.c1(sc1_airline, H_PREFIXES);

			let s_airline = null;

			let srq_airline = '';

			// airline label
			if(kt_airline.isLanguaged) {
				s_airline = kt_airline.value;

				srq_airline = /* syntax: sparql */ `
					?airline rdfs:label ?airline_label .

					values ?airline_label {
						${kt_airline.terse(H_PREFIXES)}
					}
				`;
			}
			// other
			else {
				console.warn(`Unhandled RDF term type for airline: ${kt_airline.verbose()}`);
				debugger;
			}

			// each rule
			RULES:
			for(let i_rule=0, nl_rules=a_rules.length; i_rule<nl_rules; i_rule++) {
				let h_rule = a_rules[i_rule];
				let s_rule = `Rule #${i_rule} for airline '${kt_airline.verbose()}'`;

				// required date
				let a_date = h_rule.dates;
				if(!a_date || 2 !== a_date.length) {
					console.warn(`Missing date in ${s_rule}`);
					continue;
				}

				// date parse
				let d_begin = new Date(a_date[0]);
				let d_end = new Date(a_date[1]);

				// invalid beginning
				if(Number.isNaN(d_begin)) {
					console.warn(`Invalid beginning date range in ${s_rule}`);
				}

				// invalid ending
				if(Number.isNaN(d_end)) {
					// present
					if(/^present$/.text(a_date[1].trim())) {
						d_end = null;
					}
					else {
						console.warn(`Invalid ending date range in ${s_rule}`);
					}
				}

				// remove entry from hash
				delete h_rule.dates;

				// required info
				let s_info = h_rule.info;
				if(!s_info) {
					console.warn(`Missing info in ${s_rule}`);
					continue;
				}

				// extend rule name
				s_rule += ' '+s_info;

				// set info
				s_info = `${s_airline}: ${s_info}`;

				// remove entry from hash
				delete h_rule.info;


				// debug
				let b_debug = h_rule.debug;
				delete h_rule.debug;

				// sparql filters
				let srq_filters = '';

				// apply predicates
				for(let [s_predicate, w_apply] of Object.entries(h_rule)) {
					// no such predicate
					if(!(s_predicate in H_PREDICATES)) {
						console.warn(`No such predicate '${s_predicate}'`);
						continue RULES;
					}

					// append to filters
					srq_filters += H_PREDICATES[s_predicate](w_apply);
				}

				// build query
				let srq_query = /* syntax: sparql */ `
					select ?route {
						?route a covid19:Route ;
							covid19:airline ?airline ;
							covid19:departsAirport ?departs_airport ;
							covid19:arrivesAirport ?arrives_airport ;
							covid19:departsCity ?departs_city ;
							covid19:arrivesCity ?arrives_city ;
							covid19:departsCountry ?departs_country ;
							covid19:arrivesCountry ?arrives_country ;
							.

						${srq_airline}

						${srq_filters}
					}
				`;

				// print query
				if(b_debug) console.warn(`[DEBUG] ${s_rule}: """\n${srq_query}\n"""`);

				// fetch results
				let a_results = await sparql.local(srq_query);

				// no results
				if(!a_results || !a_results.length) {
					console.warn(`Query produced no results in ${s_rule}: """\n${srq_query}\n"""`);
					continue;
				}

				// transform results to terms
				let a_routes = a_results.map(g => factory.from.sparql_result(g.route));

				// convert route
				let srq_construct = /* syntax: sparql */ `
					construct {
						?route ?p ?o .
						?o ?op ?oo .
					}
					where {
						?route a covid19:Route ;
							?p ?o .

						optional {
							?o ?op ?oo .
							filter not exists {
								?o a covid19:Route .
							}
						}

						filter(?p != covid19:departsCountry)
						filter(?p != covid19:arrivesCountry)
					}

					values ?route {
						${a_routes.map(kt => kt.terse(H_PREFIXES)).join(' ')}
					}
				`;

				// await once((await construct(srq_construct))
				// 	.pipe(ttl_reader({
				// 		prefixes: H_PREFIXES,
				// 	}))
				// 	.on('data', (g_quad) => {
				// 		ds_writer.write(g_quad);
				// 	}), 'end');

				yield {
					airline_label: s_airline,
					airline_node: kt_airline,
					dates: [d_begin, d_end],
					info: s_info,
					routes: a_routes,
					construct: await construct(srq_construct),
				};
			}
		}
	},
};

