const stream = require('stream');
const csv_parse = require('csv-parse');
const ttl_write = require('@graphy/content.ttl.write');



const H_PREFIXES = require('../common/prefixes.js');

let ds_writer = ttl_write({
	prefixes: H_PREFIXES,
});

const R_WS = /\s+/g;

let a_argv = process.argv.slice(2);
let b_tz_eastern = a_argv.includes('--eastern-tz');

let b_new_daily = a_argv.includes('--new-daily');

let hc3_flush = {
	'covid19:NationalQuarantine': {
		'rdfs:subClassOf': 'covid19:Quarantine',
	},
	'covid19:StateQuarantine': {
		'rdfs:subClassOf': 'covid19:Quarantine',
	},
	'covid19:CountyQuarantine': {
		'rdfs:subClassOf': 'covid19:Quarantine',
	},
	'covid19:CityQuarantine': {
		'rdfs:subClassOf': 'covid19:Quarantine',
	},
	'covid19:IslandGroupQuarantine': {
		'rdfs:subClassOf': 'covid19:Quarantine',
	},
};

const suffix = s => s.replace(R_WS, '_');

const inject = (s_test, hc3_inject) => s_test? hc3_inject: {};

const H_QUARANT_LEVEL = {
	'National': 'covid19:NationalQuarantine',
	'State': 'covid19:StateQuarantine',
	'County': 'covid19:CountyQuarantine',
	'City': 'covid19:CityQuarantine',
	'Island group': 'covid19:IslandGroupQuarantine',
};

{
	stream.pipeline(...[
		process.stdin,

		csv_parse({
			columns: true,
			delimiter: '\t',
		}),

		new stream.Transform({
			objectMode: true,

			transform(g_row, s_encoding, fk_transform) {
				for(let [s_key, s_value] of Object.entries(g_row)) {
					g_row[s_key.trim()] = 'string' === typeof s_value? s_value.trim(): null;
				}

				let {
					'Country': s_country,
					'Place': s_state,
					'Start date': s_start_date,
					'End date': s_end_date,
					'Level': s_level,
				} = g_row;
				// console.log([s_state]);
				let s_country_state ;
				if(s_state != null && s_state != ''){
					if(s_state.indexOf(",") > -1){
						let a_region = s_state.split(",").map(x => x.trim()).reverse();
						s_country_state = [s_country].concat(a_region).map(x => suffix(x)).join(".");
					}else{
						s_country_state = [s_country, s_state].map(x => suffix(x)).join(".");
					}
					// console.log(s_country_state);
				}else{
					s_country_state = suffix(s_country);
				}

								
		
				if(!s_start_date){
					console.log(`${s_country} ${s_state ? s_state: ""} do not have start date`);
				}
				

				let s_interval = `covid19-interval:${s_start_date.trim()}_${s_end_date ? s_end_date.trim() : "PRESENT"}`;
				let s_start_instant = `covid19-instant:${s_start_date.trim()}`;
				let dt_start = new Date(s_start_date.trim() + "Z");
				let s_end_instant = s_end_date ? `covid19-instant:${s_end_date.trim()}` : null;
				let dt_end = s_end_date ? new Date(s_end_date.trim() + "Z") : null;

				hc3_flush[s_interval] = {
					a: 'time:Interval',
					'time:hasBeginning': s_start_instant,
					...inject(s_end_date, {
						'time:hasEnd': s_end_instant,
					}),
				};

				hc3_flush[s_start_instant] = {
					a: 'time:Instant',
					'time:inXSDDateTime': dt_start,
				};

				if(s_end_date){
					hc3_flush[s_end_instant] = {
						a: 'time:Instant',
						'time:inXSDDateTime': dt_end,
					};
				}

				

				// create record IRI
				let s_quatin = `covid19-quarantine:${s_country_state}-Quarantine`;

				this.push({
					type: 'c3',
					value: {
						[s_quatin]: {
							a: H_QUARANT_LEVEL[s_level.trim()],
							'rdfs:label': `@en"The quarantine of ${s_state? s_state+', ': ''}${s_country}`,
							'covid19:issuedPlace': `covid19-region:${s_country_state}`,
							'covid19:time': s_interval,

							
						},
					},
				});

				// console.log(hc3_flush);

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
