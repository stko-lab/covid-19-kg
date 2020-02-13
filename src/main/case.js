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
				// 1. The "Last Update" is in US Eastern Time (GMT -5) for all files before Feb 1 12:00 (ET).
				// 2. The "Last Update" is in UTC (GMT +0) for all files after Feb 1 12:00 (ET).
				let dt_updated = new Date(s_last_update+` ${b_tz_eastern? ' GMT-5': ' GMT+0'}`);

				// format date string for record IRI
				let s_date_formatted = dt_updated.toISOString(); //.slice(0, '2020-01-01'.length);

				// create record IRI
				let sc1_record = `covid19-record:${s_region}.${s_state}.${s_date_formatted}`;

				this.push({
					type: 'c3',
					value: {
						[sc1_record]: {
							a: 'covid19:Record',
							'rdfs:label': '@en"'+`The COVID-19 record of ${s_state}, ${s_region}, at ${dt_updated.toGMTString()}`,
							'covid19:administrativeAreaLevel1': '>'+`covid19-state:${s_state}`,
							'covid19:region': '>'+`covid19-region:${s_region}`,
							'covid19:dateTime': '^xsd:dateTime"'+s_date_formatted,
							'covid19:confirmed': '^xsd:integer"'+int(s_confirmed),
							'covid19:death': '^xsd:integer"'+int(s_deaths),
							'covid19:recovered': '^xsd:integer"'+int(s_recovered),


							// ...(p_author_page
							// 	? {
							// 		'spex:personPage': '^xsd:anyURI"'+p_author_page,
							// 	}
							// 	: {}),
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
