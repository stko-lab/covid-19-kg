const fs = require('fs');
const path = require('path');
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

// CLI inputs
let a_inputs = process.argv.slice(2);

// convert directories into files
// Given a list of directories, extract the CSV file paths from each of them as a list
{
	// each input path
	for(let pr_input of a_inputs) {
		// stat file
		let d_stat = fs.statSync(pr_input);

		// directory
		if(d_stat.isDirectory()) {
			// remove path
			a_inputs.splice(a_inputs.indexOf(pr_input), 1);

			// push csv fiels
			a_inputs.push(
				...fs.readdirSync(pr_input)
					.filter(s => s.endsWith('.csv'))
					.map(s => path.join(pr_input, s)));
		}
	}
}

// create turtle writer
let ds_writer = ttl_write({
	prefixes: H_PREFIXES,
});

// pipe writer to stdout
ds_writer.pipe(process.stdout);

// flush object for consolidating places
let hc3_flush = {};

let as_regions = new Set();

const suffix = s => s.replace(R_WS, '_');

const inject = (s_test, hc3_inject) => s_test? hc3_inject: {};

// main
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

				let si_iso3166_alpha2_country = H_NAMES_TO_CODES_REGIONS[s_region];

				let sc1p_region = si_iso3166_alpha2_country || suffix(s_region);

				let sc1_country = `covid19-region:${sc1p_region}`;
				hc3_flush[sc1_country] = {
					a: 'covid19:Region',
					'rdfs:label': '@en"'+s_region,
				};

				as_regions.add(sc1_country);

				let sc1_state;
				if(s_state) {
					// normalize
					if(s_state in H_NORMALIZE_REGIONS) s_state = H_NORMALIZE_REGIONS[s_state];

					sc1_state = `covid19-subregion:${sc1p_region}.${suffix(s_state)}`;
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
				let sc1_record = `covid19-record:${sc1p_region}.${s_state? suffix(s_state):''}.${suffix(s_date_formatted)}`;

				// push triples
				this.push({
					type: 'c3',
					value: {
						[sc1_record]: {
							a: 'covid19:Record',
							'rdfs:label': `@en"${dt_updated.toISOString()} cases in ${s_state? s_state+', ': ''}${s_region}`,
							'dct:description': `@en"The COVID-19 cases record for ${s_state? s_state+', ': ''}${s_region}, on ${dt_updated.toGMTString()}`,
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
				hc3_flush[`covid19-disease:COVID-19_DiseaseOutbreak`] = {
					'covid19:regionAffected': [...as_regions],
				};
				
				this.push({
					type: 'c3',
					value: hc3_flush,
				});
			},
		});

		// read from file
		fs.createReadStream(pr_input)
			// parse csv
			.pipe(csv_parse({
				columns: true,
			}))
			// pipe thru transform
			.pipe(ds_transform)
			// catch pipeline errors
			.on('error', (e_pipeline) => {
				throw e_pipeline;
			});

		// forward data to writer
		ds_transform.on('data', (w_event) => {
			ds_writer.write(w_event);
		});

		// await for transform to end
		await once(ds_transform, 'finish');
	}
})();

