const sparql = require('../common/sparql.js');
const axios = require('axios');

(async() => {
	// consolidate sameAs nodes
	await sparql.update(/* syntax: sparql */ `
		delete {
			?s owl:sameAs ?wde .
			?o owl:sameAs ?wde .
		}
		insert {
			?s ?p ?o .
		} where {
			{
				?s owl:sameAs ?wde .
				?wde ?p ?o .
			} union {
				?o owl:sameAs ?wde .
				?s ?p ?wde .
			}
		}
	`);

	// remove non-covid types where applicable
	await sparql.update(/* syntax: sparql */ `
		delete {
			?s a ?wdt .
		} where {
			?s a ?type, ?wdt .

			filter(?type != ?wdt 
				&& strStarts(str(?type), "https://covid.geog.ucsb.edu/lod/")
				&& strStarts(str(?wdt), "http://www.wikidata.org/entity/"))
		}
	`);

	// dump triplestore
	let d_res;
	try {
		d_res = await axios({
			method: 'GET',
			url: process.env.STKO_INTERNAL_ENDPOINT.replace(/\/query$/, ''),
			responseType: 'stream',
		});
	}
	catch(e_req) {
		debugger;
		throw e_req;
	}

	d_res.data.pipe(process.stdout);
})();
