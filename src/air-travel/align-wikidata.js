const factory = require('@graphy/core.data.factory');
const ttl_writer = require('@graphy/content.ttl.write');
const sparql = require('../common/sparql.js');

const H_PREFIXES = require('../common/prefixes.js');


const fsr = factory.from.sparql_result;

let AS_SEEN_SUPERS = new Set();

// cities
(async() => {
	let ds_writer = ttl_writer({
		prefixes: H_PREFIXES,
	});

	ds_writer.pipe(process.stdout);

	// const A_AIRPORTS = load_json('aviation-edge/airports.json');

	let a_airports = await sparql.suspensions(/* syntax: sparql */ `
		select * {
			?airport a covid19:Airport ;
				covid19:iataAirportCode ?iata ;
				covid19:icaoAirportCode ?icao ;
				.
		}
	`);

	let n_chunk = 64;
	let i_slice = 0;
	for(;;) {
		let a_slice = a_airports.slice(i_slice, i_slice+n_chunk)
			.map(g => ({
				airport: fsr(g.airport),
				iata: fsr(g.iata),
				icao: fsr(g.icao),
			}));

		i_slice += n_chunk;

		if(!a_slice.length) break;

		let a_places = await sparql.wikidata(/* syntax: sparql */ `
			select * {
				?wde
					wdt:P238 ?iata ;
					wdt:P239 ?icao ;
					wdt:P131 ?super ;
					.

				values (?airport ?iata ?icao) {
					${a_slice.map(g => '('+[ /* eslint-disable indent */
						g.airport,
						g.iata,
						g.icao,
					].map(kt => kt.terse(H_PREFIXES)).join(' ')+')').join('\n')}
				}
			}
		`);


		let a_pending_supers = [];

		for(let g_place of a_places) {
			let kt_super = fsr(g_place.super);

			ds_writer.write({
				type: 'c3',
				value: {
					[fsr(g_place.airport)]: {
						'owl:sameAs': fsr(g_place.wde),
						'covid19:superDivision': kt_super,
					},
				},
			});

			let st1_super = kt_super.terse(H_PREFIXES);

			if(!AS_SEEN_SUPERS.has(st1_super)) {
				a_pending_supers.push(st1_super);
				AS_SEEN_SUPERS.add(st1_super);
			}
		}


		while(a_pending_supers.length) {
			let a_matches = await sparql.wikidata(/* syntax: sparql */ `
				select * {
					?wde wdt:P131 ?super .
					?super rdfs:label ?label .
					filter(lang(?label) = "en")

					values ?wde {
						${a_pending_supers.join(' ')}
					}
				}
			`);

			let a_swap_supers = [];

			for(let g_row of a_matches) {
				let kt_label = fsr(g_row.label);
				let kt_wde = fsr(g_row.wde);
				let kt_super = fsr(g_row.super);

				let st1_super = kt_super.terse(H_PREFIXES);

				if(!AS_SEEN_SUPERS.has(st1_super)) {
					a_swap_supers.push(st1_super);
					AS_SEEN_SUPERS.add(st1_super);
				}

				ds_writer.write({
					type: 'c3',
					value: {
						[kt_wde.concise(H_PREFIXES)]: {
							'covid19:superDivision': st1_super,
						},

						[st1_super]: {
							'rdfs:label': kt_label.concise(H_PREFIXES),
						},
					},
				});
			}

			a_pending_supers = a_swap_supers;
		}

		console.warn(a_slice.map(g => g.airport.concise(H_PREFIXES)).join(' '));
	}

})();

