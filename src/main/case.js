const stream = require('stream');
const csv_parse = require('csv-parse');
const ttl_write = require('@graphy/content.ttl.write');

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

let ds_writer = ttl_write({
	prefixes: H_PREFIXES,
});

const R_WS = /\s+/g;

let a_argv = process.argv.slice(2);
let b_tz_eastern = a_argv.includes('--eastern-tz');

let b_new_daily = a_argv.includes('--new-daily');

let hc3_flush = {};

const suffix = s => s.replace(R_WS, '_');

const inject = (s_test, hc3_inject) => s_test? hc3_inject: {};


{
	stream.pipeline(...[
		process.stdin,

		csv_parse({
			columns: true,
		}),

		new stream.Transform({
			objectMode: true,

			transform(g_row, s_encoding, fk_transform) {
				for(let [s_key, s_value] of Object.entries(g_row)) {
					g_row[s_key.trim()] = 'string' === typeof s_value? s_value.trim(): null;
				}

				let {
					'Province/State': s_state,
					'Country/Region': s_region,
					'Last Update': s_last_update,
					Confirmed: s_confirmed,
					Deaths: s_deaths,
					Recovered: s_recovered,
					Suspected: s_suspected,
					ConfnSusp: s_confnsusp,
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

				// Last Update
				// adjust last updated timestamp for altered timezone
				// 1. The "Last Update" is in US Eastern Time (GMT -5) for all files before Feb 1 12:00 (ET).
				// 2. The "Last Update" is in UTC (GMT +0) for all files after Feb 1 12:00 (ET).

				// fix stupid timestamp string
				s_last_update = s_last_update.replace(/(\d+)(?::\d+)?\s*([ap]m)/i, (s_ignore, s_hour, s_meridian) => ((+s_hour) + ('pm' === s_meridian.toLowerCase()? 12: 0))+':00');

				debugger;
				// fix eastern time-zone offset
				let dt_updated = new Date(s_last_update+`${b_new_daily? 'Z' : b_tz_eastern? ' GMT-5': ' GMT+0'}`);

				// format date string for record IRI
				let s_date_formatted = dt_updated.toISOString();

				let s_time_instant = `covid19-instant:${s_date_formatted}`;
				hc3_flush[s_time_instant] = {
					a: 'time:Instant',
					'time:inXSDDateTime': dt_updated,
				};

				// create record IRI
				let sc1_record = `covid19-record:${s_region? suffix(s_region):''}.${s_state? suffix(s_state):''}.${suffix(s_date_formatted)}`;

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
								'covid19:death': +s_deaths,
							}),

							...inject(s_recovered, {
								'covid19:recovered': +s_recovered,
							}),

							...inject(s_suspected, {
								'covid19:suspected': +s_suspected,
							}),

							...inject(s_confnsusp, {
								'covid19:confirmedSuspected': +s_confnsusp,
							}),

						},
					},
				});

				fk_transform();
			},

			flush() {
				this.push({
					type: 'c3',
					value: hc3_flush,
				});
			},
		}),

		// ttl_write({
		// 	prefixes: H_PREFIXES,
		// }),
		ds_writer,

		process.stdout,

		(e_pipeline) => {
			throw e_pipeline;
		},
	]);
}
