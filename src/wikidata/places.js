const ttl_writer = require('@graphy/content.ttl.write');
const factory = require('@graphy/core.data.factory');
const sparql = require('../common/sparql.js');
const H_PREFIXES = require('../common/prefixes.js');

const fsr = factory.from.sparql_result;

let AS_SEEN_SUPERS = new Set();

(async() => {
	let ds_writer = ttl_writer({
		prefixes: H_PREFIXES,
	});

	ds_writer.pipe(process.stdout);

	let a_places = await sparql.local(/* syntax: sparql */ `
		select * {
			?place owl:sameAs ?wde .
		}
	`);

	let a_pending_supers = [];

	let i_curr = 0;
	let n_chunk = 64;
	for(;;) {
		let a_select = a_places.slice(i_curr, i_curr+n_chunk);

		// done
		if(!a_select.length) break;

		i_curr += n_chunk;

		let stn_entities = a_select.map(g => `(${fsr(g.wde).terse(H_PREFIXES)} ${fsr(g.place).terse(H_PREFIXES)})`).join(' ');


		{
			let a_matches = await sparql.wikidata(/* syntax: sparql */ `
				select * {
					?wde wdt:P31 ?type .
					?type rdfs:label ?label .
					filter(lang(?label) = "en")

					values (?wde ?place) {
						${stn_entities}
					}
				}
			`);

			for(let g_row of a_matches) {
				let kt_label = fsr(g_row.label);
				let kt_place = fsr(g_row.place);
				let kt_type = fsr(g_row.type);

				let sc1_type = kt_type.concise(H_PREFIXES);

				ds_writer.write({
					type: 'c3',
					value: {
						[kt_place.concise(H_PREFIXES)]: {
							a: sc1_type,
						},

						[sc1_type]: {
							'rdfs:label': kt_label.concise(H_PREFIXES),
						},
					},
				});
			}
		}


		{
			let a_matches = await sparql.wikidata(/* syntax: sparql */ `
				select * {
					?wde wdt:P131 ?super .
					?super rdfs:label ?label .
					filter(lang(?label) = "en")

					values (?wde ?place) {
						${stn_entities}
					}
				}
			`);

			for(let g_row of a_matches) {
				let kt_label = fsr(g_row.label);
				let kt_place = fsr(g_row.place);
				let kt_super = fsr(g_row.super);

				let st1_super = kt_super.terse(H_PREFIXES);

				if(!AS_SEEN_SUPERS.has(st1_super)) {
					a_pending_supers.push(st1_super);
					AS_SEEN_SUPERS.add(st1_super);
				}

				ds_writer.write({
					type: 'c3',
					value: {
						[kt_place.concise(H_PREFIXES)]: {
							'wdt:P131': st1_super,
						},

						[st1_super]: {
							'rdfs:label': kt_label.concise(H_PREFIXES),
						},
					},
				});
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
							'wdt:P131': st1_super,
						},

						[st1_super]: {
							'rdfs:label': kt_label.concise(H_PREFIXES),
						},
					},
				});
			}

			a_pending_supers = a_swap_supers;
		}

		// debugger;

		console.warn(a_select.map(g => fsr(g.place).concise(H_PREFIXES)).join(', '));
	}

})();

