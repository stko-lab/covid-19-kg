const fs = require('fs');
const path = require('path');
const axios = require('axios');

const PDR_DATA = require('../common/paths.js').data;
const H_CODES_TO_NAMES_STATES = require('../common/states_codes-to-names.json');
const P_PLACES = path.join(PDR_DATA, 'mapbox/geocoded-places.json');

const R_COUNTY = /^(.+)\s+County,\s*(?:(\w{2}),\s*)?US$/;

let a_api_keys = process.env.MAPBOX_API_KEY.split(/\//g);

let nl_keys = a_api_keys.length;
let c_requests = 0;

// load cache
let h_places = require(P_PLACES);

// merge manual places
Object.assign(h_places, require('../common/manually-geocoded-places.js'));

// backup wikidata search
async function wikidata_us_county(s_input) {
	// prep request
	let d_res;
	try {
		// make request
		d_res = await axios.get('https://www.wikidata.org/w/api.php', {
			params: {
				action: 'wbsearchentities',
				search: s_input,
				format: 'json',
				errorformat: 'plaintext',
				language: 'en',
				uselang: 'en',
				type: 'item',
			},
		});
	}
	catch(e_req) {
		debugger;
		return null;
	}

	let g_body = d_res.data;

	let a_results = g_body.search;

	// no results
	if(!a_results.length) {
		debugger;

		// exit sync
		return null;
	}

	let g_result = a_results[0];

	let si_wikidata = g_result.id;

	// no wikidata tag
	if(!si_wikidata) {
		// exit sync
		return null;
	}

	// save association
	return h_places[s_input] = {
		type: 'county',
		place_wikidata: si_wikidata,
		country_wikidata: 'Q30',
	};
}

async function try_fallback(s_input) {
	// us county
	let m_county = R_COUNTY.exec(s_input);
	if(m_county) {
		let [, s_county, s_state] = m_county;

		let s_state_expand = H_CODES_TO_NAMES_STATES[s_state];

		if(s_state_expand) {
			return await wikidata_us_county(`${s_county.trim()} County, ${s_state_expand}`);
		}
		else {
			debugger;
		}
	}

	debugger;
}

// geocoding functioono
async function place(s_input) {
	// place exists in cache
	if(h_places[s_input]) return h_places[s_input];

	// us county
	let m_county = R_COUNTY.exec(s_input);
	if(m_county) {
		let [, s_county, s_state] = m_county;

		let s_state_expand = H_CODES_TO_NAMES_STATES[s_state];

		if(s_state_expand) {
			let g_res = await wikidata_us_county(`${s_county.trim()} County, ${s_state_expand}`);
			if(g_res) return g_res;
		}
	}

	// next api key
	let s_api_key = a_api_keys[(c_requests++)%nl_keys];

	let d_res;
	try {
		// make request
		d_res = await axios.get(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(s_input)}.json`, {
			params: {
				access_token: s_api_key,
				types: 'country,region,district,postcode,locality,place',
				language: 'en',
			},
		});
	}
	catch(e_req) {
		console.warn(`\nquery timeout for ${s_api_key}; burning key`);
		debugger;

		// remove key semi-permanently
		a_api_keys.splice(a_api_keys.indexOf(s_api_key), 1);
		nl_keys = a_api_keys.length;

		// wait 2 seconds
		await new Promise(fk => setTimeout(fk, 2000));

		// try again
		return await place(s_input);
	}

	// response body
	let g_body = d_res.data;

	// features
	let a_features = g_body.features;

	// no features, try fallback
	if(!a_features.length) return await try_fallback(s_input);

	// first feature
	let g_feature = a_features[0];

	let si_wikidata = g_feature.properties.wikidata;

	// no wikidata tag, try fallback
	if(!si_wikidata) return await try_fallback(s_input);

	// contexts
	let a_contexts = g_feature.context;

	// save association
	return h_places[s_input] = {
		type: g_feature.place_type[0],
		place_wikidata: si_wikidata,
		country_wikidata: a_contexts && a_contexts.length? a_contexts[a_contexts.length-1].wikidata: null,
	};
}

module.exports = {
	place,

	save() {
		let s_dump = JSON.stringify(h_places, null, '\t');

		fs.writeFileSync(P_PLACES, s_dump);
	},
};
