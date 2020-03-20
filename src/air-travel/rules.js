const factory = require('@graphy/core.data.factory');
const ttl_writer = require('@graphy/content.ttl.write');
const apply_airline_rules = require('./suspensions.js').apply_airline_rules;
const H_PREFIXES = require('../common/prefixes.js');

const A_COUNTRIES_ALL_CHINA = [
	'covid19-country:CN',
	'covid19-country:HK',
	'covid19-country:MO',
	'covid19-country:TW',
];

const suffix_date = dt => null === dt? 'PRESENT': dt.toISOString().replace(/T.+$/, '');

(async() => {
	let ds_writer = ttl_writer({
		prefixes: H_PREFIXES,
	});

	let dpg_airlines = apply_airline_rules(ds_writer, {
		'@en"Air Canada': [
			{
				info: 'All flights between Canada and mainland China;',
				dates: [
					'Jan 30, 2020 Z',
					'Apr 30, 2020 Z',
				],
				countries: [
					'covid19-country:CA',
					'covid19-country:CN',
				],
			},
			{
				info: 'All flights between Canada and Italy;',
				dates: [
					'Jan 30, 2020 Z',
					'Apr 30, 2020 Z',
				],
				countries: [
					'covid19-country:CA',
					'covid19-country:IT',
				],
			},
			{
				info: 'flights between Toronto and Hong Kong;',
				dates: [
					'Jan 30, 2020 Z',
					'Apr 30, 2020 Z',
				],
				cities: [
					'@en"Toronto',
					'@en"Hong Kong',
				],
				// except: {
				// 	betweenCities: [
				// 		'@en"Vancouver',
				// 		'@en"Hong Kong',
				// 	],
				// },
			},
		],
		'@en"American Airlines': [
			{
				info: 'All flights to China',
				dates: [
					'Jan 31, 2020 Z',
					'Jun 30, 2020 Z',
				],
				countries: [
					'covid19-country:US',
					'covid19-country:CN',
				],
			},
			{
				info: 'Hong Kong service to Dallas and Los Angeles',
				dates: [
					'Jan 31, 2020 Z',
					'Jun 30, 2020 Z',
				],
				cities: [
					'@en"Hong Kong',
					'@en"Dallas',
					'@en"Los Angeles',
				],
			},
			{
				info: 'Seoul service to Dallas',
				dates: [
					'Jan 31, 2020 Z',
					'Jun 30, 2020 Z',
				],
				cities: [
					'@en"Seoul',
					'@en"Dallas',
				],
			},
			{
				// warn: '(various suspension dates)',
				info: 'Milan service to New York and Miami',
				dates: [
					'Jan 31, 2020 Z',
					'Jun 30, 2020 Z',
				],
				cities: [
					'@en"Milan',
					'@en"New York',
					'@en"Miami',
				],
			},
			{
				info: 'Rome service to Philadelphia, Chicago and Charlotte',
				dates: [
					'Jan 31, 2020 Z',
					'Jun 30, 2020 Z',
				],
				cities: [
					'@en"Rome',
					'@en"Philadelphia',
					'@en"Chicago',
					'@en"Charlotte',
				],
			},
		],
		'@en"Delta': [
			{
				info: 'All flights to China and Italy',
				dates: [
					'Feb 2, 2020 Z',
					'Apr 30, 2020 Z',
				],
				countries: [
					'covid19-country:US',
					'covid19-country:CN',
					'covid19-country:IT',
				],
			},
		],
		'@en"United Airlines': [
			{
				info: 'Flights to Beijing, Shanghai, Chengdu and Hong Kong',
				dates: [
					'Feb 5, 2020, Z',
					'Apr 30, 2020 Z',
				],
				cities: [
					'*',
					'@en"Beijing',
					'@en"Shanghai',
					'@en"Chengdu',
					'@en"Hong Kong',
				],
			},
		],
		'@en"China Airlines': [
			{
				info: 'Flights between Taiwan and Wuhan',
				dates: [
					'Jan 23, 2020, Z',
					'Feb 29, 2020 Z',
				],
				cities: [
					'@en"Taipei',
					'@en"Wuhan',
				],
			},
		],
		'@en"Korean Air': [
			{
				info: 'Flights between Incheon and Wuhan, Huangshan, Zhangjiajie, Changsha, Kunming, Tel Aviv, Daegu',
				dates: [
					'Jan 24, 2020, Z',
					'May 31, 2020 Z',
				],
				cities: [
					'@en"Incheon',
					'@en"Wuhan',
					'@en"Huangshan',
					'@en"Zhangjiajie',
					'@en"Changsha',
					'@en"Kunming',
					'@en"Changsha',
					'@en"Tel Aviv Yafo',
					'@en"Daegu',
				],
			},
		],
	});


	ds_writer.pipe(process.stdout);

	// each result
	for await (let g_result of dpg_airlines) {
		let {
			info: s_info,
			dates: [dt_begin, dt_end],
			routes: a_routes,
			construct: st_construct,
		} = g_result;

		process.stdout.write(st_construct);

		ds_writer.write({
			type: 'c3',
			value: {
				...a_routes.reduce((hc3_out, kt_route) => {
					let kt_suspension = factory.c1(kt_route.concise(H_PREFIXES).replace(/^covid19-route:/, 'covid19-suspension:'), H_PREFIXES);

					let sc1_interval = `covid19-interval:${suffix_date(dt_begin)}_${suffix_date(dt_end)}`;

					let sc1_begin = `covid19-instant:${suffix_date(dt_begin)}`;
					let sc1_end = `covid19-instant:${suffix_date(dt_end)}`;

					return {
						...hc3_out,

						[kt_suspension.terse(H_PREFIXES)]: {
							a: 'covid19:Suspension',
							'dct:description': '@en"'+s_info,
							'covid19:time': sc1_interval,
							'covid19:suspendedRoute': kt_route.terse(H_PREFIXES),
						},

						[sc1_interval]: {
							a: 'covid19:Interval',
							'time:hasBeginning': sc1_begin,
							...(dt_end? {'time:hasEnd': sc1_end}: {}),
						},

						[sc1_begin]: {
							'time:inXSDDate': factory.date(dt_begin),
						},

						...(dt_end
							? {
								[sc1_end]: {
									'time:inXSDDate': factory.date(dt_end),
								},
							}
							: {}),
					};
				}, {}),
			},
		});
	}
})();
