// inject hash based on test
const inject = (w_test, hc3_inject) => w_test? hc3_inject: {};

const  toTitleCase = function(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

const add_country_triples = function(hc3_flush, sc1_country, country_name){
	if(sc1_country){
		if(! hc3_flush[sc1_country]){
			hc3_flush[sc1_country] = {
				a: 'covid19:Country',
				'rdfs:label': `@en"${country_name}`,
				// ...inject(g_place.country_wikidata, {
				// 	'owl:sameAs': 'wd:'+g_place.country_wikidata,
				// }),
			};
		}else{
			if(!hc3_flush[sc1_country]['a']){
				Object.assign(hc3_flush[sc1_country], {
					a: 'covid19:Country',
				});
			}
			if(!hc3_flush[sc1_country]['rdfs:label']){
				Object.assign(hc3_flush[sc1_country], {
					'rdfs:label': `@en"${country_name}`,
				});
			}
		}
	}
	
	return hc3_flush;
}


const add_place_triples = function(hc3_flush, sc1_place, sc1_country, place_name, sc1p_place_type){
	if(sc1_place){
		if(! hc3_flush[sc1_place]){
			hc3_flush[sc1_place] = {
				a: 'covid19:'+sc1p_place_type,
				'rdfs:label': `@en"${place_name}`,
				// 'owl:sameAs': 'wd:'+g_place.place_wikidata,

				// only emit triples for region --> country
				...inject(sc1_country, {
					'covid19:country': sc1_country,
				}),
			};
		}else{
			
			Object.assign(hc3_flush[sc1_place], {
				a: 'covid19:'+sc1p_place_type,
				'rdfs:label': `@en"${place_name}`,
				// 'owl:sameAs': 'wd:'+g_place.place_wikidata,

				// only emit triples for region --> country
				...inject(sc1_country, {
					'covid19:country': sc1_country,
				}),
			});
			
		}
	}
	
	return hc3_flush;
}

const add_context_place_hierachy_triples = function(hc3_flush, a_contexts, sc1_place, place_name, sc1_country, country_name,  sc1p_place_type){
	let sc1_sub = sc1_place;
	let s_sub_name = place_name;
	let s_sub_type = sc1p_place_type;
	if(a_contexts && a_contexts.length){
		for (var i = 0; i < a_contexts.length; i++){
			hc3_flush = add_place_triples(hc3_flush = hc3_flush, 
											sc1_place = sc1_sub, 
											sc1_country = i === a_contexts.length - 1 ? null : sc1_country, 
											place_name = s_sub_name, 
											sc1p_place_type = s_sub_type);
			let sc1_super = 'wd:' + a_contexts[i].wikidata;
			Object.assign(hc3_flush[sc1_sub], {
				'covid19:superdivision': sc1_super,
			});
			sc1_sub = sc1_super;
			s_sub_name = a_contexts[i].text;
			s_sub_type = toTitleCase( a_contexts[i].id.split(".")[0] );
		}

	}else{
		hc3_flush = add_place_triples(hc3_flush = hc3_flush, 
											sc1_place = sc1_place, 
											sc1_country = null, 
											place_name = place_name, 
											sc1p_place_type = sc1p_place_type);
	}

	hc3_flush = add_country_triples(hc3_flush, sc1_country, country_name);

	return hc3_flush;

}


module.exports = {
	add_country_triples: add_country_triples,
	add_place_triples : add_place_triples,
	add_context_place_hierachy_triples: add_context_place_hierachy_triples
};