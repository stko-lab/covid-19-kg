const axios = require('axios');
const qs = require('qs');

const H_PREFIXES = require('../common/prefixes.js');

const S_PREFIXES = Object.entries(H_PREFIXES).reduce((s_out, [si_prefix, p_iri]) => `${s_out}
	prefix ${si_prefix}: <${p_iri}>`, '');

const query = p_endpoint => async(srq_query) => {
	let d_res;
	try {
		d_res = await axios({
			method: 'POST',
			url: p_endpoint,
			data: qs.stringify({
				query: S_PREFIXES+'\n'+srq_query,
			}),
			headers: {
				accept: 'application/sparql-results+json',
				'content-type': 'application/x-www-form-urlencoded',
			},
		});
	}
	catch(e_req) {
		debugger;
		console.warn(e_req);
		return null;
	}

	return d_res.data.results.bindings;
};

module.exports = {
	local: query(process.env.STKO_ROUTES_GLOBAL_ENDPOINT),
	suspensions: query(process.env.STKO_ROUTES_SUSPENSIONS_ENDPOINT),
	wikidata: query('https://query.wikidata.org/sparql'),
};
