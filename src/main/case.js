const stream = require('stream');
const csv_parse = require('csv-parse');

const ttl_write = require('@graphy/content.ttl.write');

const H_PREFIXES = require('../common/prefixes.js');

let a_argv = process.argv.slice(2);
let b_tz_eastern = a_argv.includes('--eastern-tz');

{
	stream.pipeline(...[
		process.stdin,

		csv_parse({
			columns: true,
		}),

		new stream.Transform({
			objectMode: true,

			transform(g_row, s_encoding, fk_transform) {
				let {
					'Province/State': s_state,
					'Country/Region': s_region,
					'Last Update': s_last_update,
					'Confirmed': s_confirmed,
					'Deaths': s_deaths,
					'Recovered': s_recovered,
					'Suspected': s_suspected,
					'ConfnSusp': s_confnsusp,
				} = g_row;

				// adjust last updated timestamp for altered timezone
				let dt_updated = new Date(s_last_update+` ${b_tz_eastern? 'GMT -5': 'UTC'}`);

				// format date string for record IRI
				let s_date_formatted = dt_updated.toISOString().slice(0, '2020-01-01'.length);

				// create record IRI
				let sc1_record = `covid19-record:${s_region}.${s_state}.${s_date_formatted}`;

				this.push({
					type: 'c3',
					value: {
						[sc1_record]: {
							a: 'covid19:Record',
							'rdfs:label': '"'+s_author_name,
							'spex:personFullName': '"'+s_author_name,
							'spex:personFirstName': '"'+s_author_name_first,
							'spex:personLastName': '"'+s_author_name_last,

							...(p_author_page
								? {
									'spex:personPage': '^xsd:anyURI"'+p_author_page,
								}
								: {}),
						},
					},
				});

				fk_transform();
			},
		}),

		ttl_write({
			prefixes: H_PREFIXES,
		}),

		process.stdout,
	], (e_pipeline) => {
		throw e_pipeline;
	});
}
