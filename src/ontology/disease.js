const ttl_write = require('@graphy/content.ttl.write');
const H_PREFIXES = require('../common/prefixes.js');

let ds_writer = ttl_write({
	prefixes: H_PREFIXES,
});

ds_writer.pipe(process.stdout);

ds_writer.end({
	type: 'c3',
	value: {
		'covid19-disease:COVID-19_DiseaseOutbreak': {
			a: 'covid19:DiseaseOutbreak',
			'covid19:origin': 'covid19-city:WUH',
			'covid19:deaths': 10030,
			'covid19:confirmed': 244517,
			'time:hasTime': 'covid19-interval:2019-12-01_PRESENT',
			'covid19:virusStrain': 'covid19-disease:SARS-COV-2',
		},

		'covid19-interval:2019-12-01_PRESENT': {
			a: 'time:Interval',
			'time:hasBeginning': 'covid19-instant:2019-12-01',
		},

		'covid19-instant:2019-12-01': {
			a: 'time:Instant',
			'time:inXSDDate': '^xsd:date"2019-12-01',
		},
	},
});
