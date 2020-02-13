const stream = require('stream');
const csv_parse = require('csv-parse');

const ttl_write = require('@graphy/content.ttl.write');

const H_PREFIXES = require('../common/prefixes.js');

let a_argv = process.argv.slice(2);
let b_tz_eastern = a_argv.includes('--eastern-tz');

let ds_writer = ttl_write({
	prefixes: H_PREFIXES,
});

let hc3_flush = {};

var str_preprocess = function(str){
	if(str === undefined || str === null){
		return null;
	}else{
		let str1 = str.trim();
		if(str1 === "")
			return null;
		else
			return str1;
	}
	
}

var str_2iri = function(str){
	let iri = null;
	if(str !== null){
		iri = str.replace(" ", "_");
	}
	return iri;
}

{
	stream.pipeline(...[
		process.stdin,

		csv_parse({
			columns: true,
		}),

		new stream.Transform({
			objectMode: true,

			transform(g_row, s_encoding, fk_transform) {
				// console.log("A");
				// console.log(g_row);
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
				debugger
				s_state = str_preprocess(s_state);
				s_region = str_preprocess(s_region);
				s_last_update = str_preprocess(s_last_update);
				s_confirmed = str_preprocess(s_confirmed);
				s_deaths = str_preprocess(s_deaths);
				s_recovered = str_preprocess(s_recovered);
				s_suspected = str_preprocess(s_suspected);
				s_confnsusp = str_preprocess(s_confnsusp);
				debugger

				

				// Province/State
				let s_state_iri = str_2iri(s_state);

				// Country/Region
				let s_region_iri = str_2iri(s_region);


				let sc1_country = `covid19-region:${s_region_iri}`;

				hc3_flush[sc1_country] = {
					a: 'covid19:Region',
					'rdfs:label': '@en"'+s_region,
				};

				let sc1_state = `covid19-state:${s_state_iri}`;
				if(s_state !== null){
				
					hc3_flush[sc1_state] = {
						a: 'covid19:administrativeAreaLevel1',
						'rdfs:label': '@en"'+s_state,
					};
				}

				

				// Last Update
				// adjust last updated timestamp for altered timezone
				// 1. The "Last Update" is in US Eastern Time (GMT -5) for all files before Feb 1 12:00 (ET).
				// 2. The "Last Update" is in UTC (GMT +0) for all files after Feb 1 12:00 (ET).
				let a_timelist = s_last_update.split(" ");
				if(a_timelist[1].includes("pm")){
					let s_time = (parseInt(a_timelist[1].replace("pm", "")) + 12).toString()+":00";
					s_last_update = `${a_timelist[0]} ${s_time}`;
				}else if(a_timelist[1].includes("am")){
					let s_time = a_timelist[1].replace("am", "")+":00";
					s_last_update = `${a_timelist[0]} ${s_time}`;
				}
				let dt_updated = new Date(s_last_update+` ${b_tz_eastern? ' GMT-5': ' GMT+0'}`);

				// format date string for record IRI
				let s_date_formatted = dt_updated.toISOString(); //.slice(0, '2020-01-01'.length);

				// create record IRI
				let sc1_record = `covid19-record:${s_region !== null? s_region_iri:""}.${s_state !== null? s_state_iri:""}.${s_date_formatted}`;

				this.push({
					type: 'c3',
					value: {
						[sc1_record]: {
							a: 'covid19:Record',
							'rdfs:label': '@en"'+`The COVID-19 record of ${s_state_iri !== null? s_state+", ":""}${s_region}, at ${dt_updated.toGMTString()}`,
							
							...(s_state !== null
								? {
									'covid19:administrativeAreaLevel1': sc1_state,
								}
								: {}),

							...(s_region !== null
								? {
									'covid19:region': sc1_country,
								}
								: {}),
							
							
							'covid19:dateTime': '^xsd:dateTime"'+s_date_formatted,

							...(s_confirmed !== null
								? {
									'covid19:confirmed': parseInt(s_confirmed),
								}
								: {}),

							...(s_deaths !== null
								? {
									'covid19:death': parseInt(s_deaths),
								}
								: {}),

							...(s_recovered !== null
								? {
									'covid19:recovered': parseInt(s_recovered),
								}
								: {}),

							...(s_suspected !== null
								? {
									'covid19:suspected': parseInt(s_suspected),
								}
								: {}),

							...(s_confnsusp !== null
								? {
									'covid19:confirmedSuspected': parseInt(s_confnsusp),
								}
								: {}),
				
							
							
		
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

		ds_writer,

		process.stdout,
		
		(e_pipeline) => {
			throw e_pipeline;
		},
	]);
}
