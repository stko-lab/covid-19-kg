const fs = require('fs');
const stream = require('stream');
const csv_parse = require('csv-parse');
const ttl_write = require('@graphy/content.ttl.write');
const once = require('events').once;

const H_NORMALIZE_REGIONS = {
	'Cruise Ship': 'Diamond Princess cruise ship',
};

const H_CODES_TO_NAMES_REGIONS = require('../common/regions_codes-to-names.json');

const H_NAMES_TO_CODES_REGIONS = Object.entries(H_CODES_TO_NAMES_REGIONS)
	.reduce((h_out, [si_key, s_value]) => ({
		...h_out,
		[s_value]: si_key,
	}), {
		'Mainland China': 'CN',
		Macau: 'MO',
		US: 'US',
		UK: 'GB',
	});

const H_PREFIXES = require('../common/prefixes.js');

const R_WS = /\s+/g;

let ds_writer = ttl_write({
	prefixes: H_PREFIXES,
});


let a_inputs = process.argv.slice(2);

let hc3_flush = {};

const suffix = s => s.replace(R_WS, '_');

const inject = (s_test, hc3_inject) => s_test? hc3_inject: {};


(async() => {
	for(let pr_input of a_inputs) {
		// make transform stream for converting flat files to triples
		let ds_transform = new stream.Transform({
			// objects on readable and writable side
			objectMode: true,

			// transform callback
			transform(g_row, s_encoding, fk_transform) {
				// normalize keys and vlaues
				for(let [s_key, s_value] of Object.entries(g_row)) {
					g_row[s_key.trim()] = 'string' === typeof s_value? s_value.trim(): null;
				}

				// destructure row
				let {
					'Province/State': s_state,
					'Country/Region': s_region,
					'Last Update': s_last_update,
					Confirmed: s_confirmed,
					Deaths: s_deaths,
					Recovered: s_recovered,
					Suspected: s_suspected,
				} = g_row;


				let sc1_country = `covid19-region:${H_NAMES_TO_CODES_REGIONS[s_region] || suffix(s_region)}`;
				hc3_flush[sc1_country] = {
					a: 'covid19:Region',
					'rdfs:label': '@en"'+s_region,
				};

				let sc1_state;
				if(s_state) {
					// normalize
					if(s_state in H_NORMALIZE_REGIONS) s_state = H_NORMALIZE_REGIONS[s_state];

					sc1_state = `covid19-subregion:${suffix(s_state)}`;
					hc3_flush[sc1_state] = {
						a: 'covid19:AdministrativeAreaLevel1',
						'rdfs:label': '@en"'+s_state,
						'covid19:superdivision': sc1_country,
					};
				}

				// fix stupid timestamp string
				s_last_update = s_last_update.replace(/(\d+)(?::\d+)?\s*([ap]m)/i, (s_ignore, s_hour, s_meridian) => ((+s_hour) + ('pm' === s_meridian.toLowerCase()? 12: 0))+':00');

				// date string
				let dt_updated = new Date(s_last_update+'Z');

				// format date string for record IRI
				let s_date_formatted = dt_updated.toISOString();

				let s_time_instant = `covid19-instant:${s_date_formatted}`;
				hc3_flush[s_time_instant] = {
					a: 'time:Instant',
					'time:inXSDDateTime': dt_updated,
				};

				// create record IRI
				let sc1_record = `covid19-record:${s_region? suffix(s_region):''}.${s_state? suffix(s_state):''}.${suffix(s_date_formatted)}`;

				// push triples
				this.push({
					type: 'c3',
					value: {
						[sc1_record]: {
							a: 'covid19:Record',
							'rdfs:label': `@en"The COVID-19 record of ${s_state? s_state+', ': ''}${s_region}, on ${dt_updated.toGMTString()}`,
							'covid19:lastUpdate': s_time_instant,

							...inject(sc1_state, {
								'covid19:administrativeAreaLevel1': sc1_state,
							}),

							...inject(s_region, {
								'covid19:region': sc1_country,
							}),

							...inject(s_confirmed, {
								'covid19:confirmed': +s_confirmed,
							}),

							...inject(s_deaths, {
								'covid19:deaths': +s_deaths,
							}),

							...inject(s_recovered, {
								'covid19:recovered': +s_recovered,
							}),

							...inject(s_suspected, {
								'covid19:suspected': +s_suspected,
							}),
						},
					},
				});

				// done with row
				fk_transform();
			},

			// once at the end
			flush() {
				this.push({
					type: 'c3',
					value: hc3_flush,
				});
			},
		});

		// setup processing pipeline
		stream.pipeline(...[
			// read from file
			fs.createReadStream(pr_input),

			// parse csv
			csv_parse({
				columns: true,
			}),

			// pipe thru transform
			ds_transform,

			// write to ttl
			ds_writer,

			// push to stdout
			process.stdout,

			// catch pipeline errors
			(e_pipeline) => {
				throw e_pipeline;
			},
		]);

		// await for transform to end
		await once(ds_transform, 'finish');
	}
})();

