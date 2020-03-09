const P_NAMESPACE = 'https://covid.geog.ucsb.edu/lod/';

const covid19s = a_ns => a_ns.reduce((h_out, s_ns) => ({
	...h_out,
	[`covid19-${s_ns}`]: `${P_NAMESPACE}${s_ns}/`,
}), {});

module.exports = {
	rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
	xsd: 'http://www.w3.org/2001/XMLSchema#',
	owl: 'http://www.w3.org/2002/07/owl#',
	dct: 'http://purl.org/dc/terms/',
	foaf: 'http://xmlns.com/foaf/0.1/',
	time: 'http://www.w3.org/2006/time#',
	timezone: 'https://www.timeanddate.com/worldclock/results.html?query=',
	geosparql: 'http://www.opengis.net/ont/geosparql#',
	fr24: 'https://www.flightradar24.com/data/airports/',
	wd: 'http://www.wikidata.org/entity/',
	wdt: 'http://www.wikidata.org/prop/direct/',
	covid19: `${P_NAMESPACE}ontology/`,
	...covid19s([
		'airline',
		'airport',
		'route',
		'place',
		'city',
		'county',
		'subregion',
		'region',
		'country',
		'continent',
		'suspension',
		'record',
		'interval',
		'instant',
		'disease',
	]),
};
