const ttl_write = require('@graphy/content.ttl.write');
const H_PREFIXES = require('../common/prefixes.js');

let ds_writer = ttl_write({
	prefixes: H_PREFIXES,
});

const property = (g, hc3) => ({
	'rdfs:label': '@en"'+g.label,
	'rdfs:domain': g.domain || 'owl:Thing',
	'rdfs:range': g.range || 'owl:Thing',
	...hc3,
});

const datatype_property = g => property(g, {
	a: 'owl:DatatypeProperty',
});

const object_property = g => property(g, {
	a: 'owl:ObjectProperty',
});

ds_writer.pipe(process.stdout);

ds_writer.end({
	type: 'c3',
	value: {
		'covid19:iataCityCode': datatype_property({
			label: 'IATA city code',
			domain: 'covid19:City',
			range: 'xsd:string',
		}),

		'covid19:city': object_property({
			label: 'city',
			// domain: 'covid19:',
			range: 'covid19:City',
		}),

		'covid19:iataAirportCode': datatype_property({
			label: 'IATA airport code',
			domain: 'covid19:Airport',
			range: 'xsd:string',
		}),

		'covid19:icaoAirportCode': datatype_property({
			label: 'ICAO airport code',
			domain: 'covid19:Airport',
			range: 'xsd:string',
		}),

		'covid19:callsign': object_property({
			label: 'callsign',
			domain: 'covid19:Airline',
			range: 'xsd:string',
		}),

		'covid19:departsAirport': object_property({
			label: 'departs airport',
			domain: 'covid19:Route',
			range: 'covid19:Airport',
		}),

		'covid19:arrivesAirport': object_property({
			label: 'arrives airport',
			domain: 'covid19:Route',
			range: 'covid19:Airport',
		}),

		'covid19:departsCity': object_property({
			label: 'departs city',
			domain: 'covid19:Route',
			range: 'covid19:City',
		}),

		'covid19:arrivesCity': object_property({
			label: 'arrives city',
			domain: 'covid19:Route',
			range: 'covid19:City',
		}),

		'covid19:airline': object_property({
			label: 'airline',
			domain: 'covid19:Route',
			range: 'covid19:Airline',
		}),

		'covid19:lastUpdate': object_property({
			label: 'lastUpdate',
			domain: 'covid19:Record',
			range: 'time:Instant',
		}),

		'covid19:confirmed': datatype_property({
			label: 'confirmed cases',
			domain: 'covid19:Record',
			range: 'xsd:integer',
		}),

		'covid19:deaths': datatype_property({
			label: 'deaths',
			domain: 'covid19:Record',
			range: 'xsd:integer',
		}),

		'covid19:recovered': datatype_property({
			label: 'recovered',
			domain: 'covid19:Record',
			range: 'xsd:integer',
		}),

		'covid19:superdivision': object_property({
			label: 'superdivision',
			domain: 'covid19:Place',
			range: 'covid19:Place',
		}),

		'covid19:origin': object_property({
			label: 'origin',
			domain: 'covid19:DiseaseOutbreak',
			range: 'covid19:Place',
		}),

		'covid19:virusStrain': object_property({
			label: 'virusStrain',
			domain: 'covid19:DiseaseOutbreak',
			range: 'covid19:Virus',
		}),

		'covid19:country': object_property({
			label: 'country',
			domain: 'covid19:Place',
			range: 'covid19:Country',
		}),

		'covid19:operatesIn': object_property({
			label: 'operates in',
			domain: 'covid19:Airline',
			range: 'covid19:Country',
		}),

		'covid19:location': object_property({
			label: 'location',
			domain: 'covid19:Record',
			range: 'covid19:Place',
		}),

		'covid19:countryAffected': object_property({
			label: 'country affected',
			domain: 'covid19:DiseaseOutbreak',
			range: 'covid19:Country',
		}),

		'covid19:time': object_property({
			label: 'time',
			domain: 'covid19:Event',
			range: 'time:Interval',
		}),

		'covid19:suspendedRoute': object_property({
			label: 'suspended route',
			domain: 'covid19:Suspension',
			range: 'covid19:Route',
		}),

		'covid19:superDivision': object_property({
			label: 'super division',
			domain: 'covid19:Place',
			range: 'covid19:Place',
		}),

		'covid19:issuedPlace': object_property({
			label: 'issued place',
			domain: 'covid19:Quarantine',
			range: 'covid19:Place',
		}),

		'covid19:aidsTo': object_property({
			label: 'aids to',
			domain: 'covid19:Organization',
			// range: 'covid19:',
		}),

		'covid19:target': object_property({
			label: 'target',
			// domain: 'covid19:',
			range: 'covid19:DiseaseOutbreak',
		}),

		'covid19:shipment': object_property({
			label: 'shipment',
			// domain: 'covid19:',
			range: 'covid19:ShipmentList',
		}),

		'covid19:shipRecipientNumber': datatype_property({
			label: 'ship recipient number',
			domain: 'covid19:Organization',
			range: 'xsd:integer',
		}),

		'covid19:aidRecipientValue': datatype_property({
			label: 'aid recipient value',
			domain: 'covid19:Organization',
			range: 'xsd:integer',
		}),

	},
});


