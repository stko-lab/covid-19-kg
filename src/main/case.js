const stream = require('stream');
const csv_parse = require('csv-parse');

const ttl_write = require('@graphy/content.ttl.write');

const H_PREFIXES = require('../common/prefixes.js');

// const people = require('../common/people.js');
// const {
// 	person_suffix,
// } = require('../common/share.js');

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
					"Province/State": state,
					"Country/Region": region,
					"Last Update": time_stamp,
					"Confirmed": confirmed,
					"Deaths": deaths,
					"Recovered": recovered,
					"Suspected": suspected,
					"ConfnSusp": confnsusp,
				} = g_row;

				let {
					first: s_author_name_first,
					last: s_author_name_last,
				} = people.info(s_author_name)[0];

				let p_person = `spex-person:${person_suffix(s_author_name)}`;

				this.push({
					type: 'c3',
					value: {
						[p_person]: {
							a: 'spex:Person',
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
