const fs = require('fs');
const path = require('path');

const P_URI_API_AVIATION_EDGE = 'https://aviation-edge.com/v2/public';

if(!process.env.AVIATION_EDGE_API_KEY) {
	throw new Error(`Environment variables not set. Use: $ source .env`);
}

const aviation_edge = si_database => () => ({
	run: /* syntax: bash */ `
		curl "${P_URI_API_AVIATION_EDGE}/${si_database}?key=${process.env.AVIATION_EDGE_API_KEY}&limit=${0xffffffff >>> 1}" -o $@
	`,
});

const H_RECIPES_DATA_AVIATION_EDGE = {
	'airlines.json': aviation_edge('airlineDatabase'),
	'airports.json': aviation_edge('airportDatabase'),
	'cities.json': aviation_edge('cityDatabase'),
	'countries.json': aviation_edge('countryDatabase'),
	'routes.json': aviation_edge('routes'),
};

const A_DEPS_DATA_AVIATION_EDGE = Object.keys(H_RECIPES_DATA_AVIATION_EDGE).map(s => `data/aviation-edge/${s}`);

module.exports = {
	defs: {
	},

	tasks: {
		all: 'build/**',

		clean: () => ({
			run: /* syntax: bash */ `
				rm -rf build/*
			`,
		}),
	},

	outputs: {
		data: {
			'aviation-edge': H_RECIPES_DATA_AVIATION_EDGE,
		},

		build: {
			'air-travel': {
				'global.ttl': () => ({
					deps: [
						'src/air-travel/triplify.js',
						...A_DEPS_DATA_AVIATION_EDGE,
					],
					run: /* syntax: bash */ `
						node $1 > $@
					`,
				}),
			},

			cases: {
				'global.ttl': () => ({
					deps: [
						'src/cases/triplify.js',
						'submodules/COVID-19',
					],
					run: /* syntax: bash */ `
						node $1 ./submodules/COVID-19/csse_covid_19_data/csse_covid_19_daily_reports/ > $@
					`,
				}),
			},
		},

		submodules: {
			'COVID-19': () => ({
				run: /* syntax: bash */ `
					git submodule update --init --recursive
				`,
			}),
		},
	},
};
