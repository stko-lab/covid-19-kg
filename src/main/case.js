const stream = require('stream');
const csv_parse = require('csv-parse');

const ttl_write = require('@graphy/content.ttl.write');

// const H_PREFIXES = require('../common/prefixes.js');
const P_NAMESPACE = 'https://stko-covid19.geog.ucsb.edu/lod/';

const covid19s = a_ns => a_ns.reduce((h_out, s_ns) => ({
	...h_out,
	[`covid19-${s_ns}`]: `${P_NAMESPACE}${s_ns}/`,
}), {});

let ds_writer = ttl_write({
	prefixes: {
		rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
		rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
		xsd: 'http://www.w3.org/2001/XMLSchema#',
		owl: 'http://www.w3.org/2002/07/owl#',
		dct: 'http://purl.org/dc/terms/',
		foaf: 'http://xmlns.com/foaf/0.1/',
		time: 'http://www.w3.org/2006/time#',
		timezone: 'https://www.timeanddate.com/worldclock/results.html?query=',
		geosparql: 'http://www.opengis.net/ont/geosparql#',
		covid19: `${P_NAMESPACE}ontology/`,
		...covid19s([
			'airline',
			'airport',
			'route',
			'city',
			'country',
			'continent',
			'region',
			'state',
			'record'
		]),
	},
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


				let sc1_country = `covid19-region:${suffix(s_region)}`;

				hc3_flush[sc1_country] = {
					a: 'covid19:Region',
					'rdfs:label': '@en"'+s_region,
				};

				let sc1_state;
				if(s_state) {
					s_state = s_state === "Cruise Ship" ? "Diamond Princess cruise ship" : s_state;
					sc1_state = `covid19-state:${suffix(s_state)}`;

					hc3_flush[sc1_state] = {
						a: 'covid19:administrativeAreaLevel1',
						'rdfs:label': '@en"'+suffix(s_state),
					};
				}

				// Last Update
				// adjust last updated timestamp for altered timezone
				// 1. The "Last Update" is in US Eastern Time (GMT -5) for all files before Feb 1 12:00 (ET).
				// 2. The "Last Update" is in UTC (GMT +0) for all files after Feb 1 12:00 (ET).

				// fix stupid timestamp string
				s_last_update = s_last_update.replace(/(\d+)(?::\d+)?\s*([ap]m)/i, (s_ignore, s_hour, s_meridian) => {
					return ((+s_hour) + ('pm' === s_meridian.toLowerCase()? 12: 0))+':00';
				});

				debugger
				// fix eastern time-zone offset
				let dt_updated = new Date(s_last_update+`${b_new_daily? "" : b_tz_eastern? ' GMT-5': ' GMT+0'}`);

				// format date string for record IRI
				let s_date_formatted = dt_updated.toISOString();

				// create record IRI
				let sc1_record = `covid19-record:${s_region? suffix(s_region):''}.${s_state? suffix(s_state):''}.${suffix(s_date_formatted)}`;

				this.push({
					type: 'c3',
					value: {
						[sc1_record]: {
							a: 'covid19:Record',
							'rdfs:label': `@en"The COVID-19 record of ${s_state? s_state+', ': ''}${s_region}, on ${dt_updated.toGMTString()}`,
							'covid19:lastUpdate': dt_updated,

							...inject(s_state, {
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
