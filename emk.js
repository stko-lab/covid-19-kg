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
				'suspensions.ttl': () => ({
					deps: [
						'src/air-travel/rules.js',
						'src/air-travel/suspensions.js',
						'build/air-travel/global.ttl',
					],
					run: /* syntax: bash */ `
						# launch routes global triplestore
						./launch-routes-global.sh

						node $1 > $@

						# remove container
						docker rm -f ncov-global
					`,
				}),
			},

			cases: {
				'disease.ttl': () => ({
					deps: [
						'src/ontology/disease.js',
					],
					run: /* syntax: bash */ `
						node $1 > $@
					`,
				}),

				'global.ttl': () => ({
					deps: [
						'src/cases/triplify.js',
						'submodules/COVID-19/csse_covid_19_data/csse_covid_19_daily_reports/*.csv',
					],
					run: /* syntax: bash */ `
						node $1 ./submodules/COVID-19/csse_covid_19_data/csse_covid_19_daily_reports/ > $@
					`,
				}),
			},

			wikidata: {
				'airports.ttl': () => ({
					deps: [
						'src/air-travel/align-wikidata.js',
						'build/air-travel/suspensions.ttl',
					],
					run: /* syntax: bash */ `
						# launch routes suspensions triplestore
						./launch-routes-suspensions.sh

						node $1 > $@

						# remove container
						docker rm -f ncov-suspensions
					`,
				}),

				'places.ttl': () => ({
					deps: [
						'src/wikidata/places.js',
						'build/wikidata/airports.ttl',
					],
					run: /* syntax: bash */ `
						# launch internal triplestore
						./launch-internal.sh

						node $1 > $@

						# remove container
						docker rm -f ncov-internal
					`,
				}),
			},

			output: {
				'union.ttl': () => ({
					deps: [
						'src/wikidata/clean.js',
						'build/air-travel/*.ttl',
						'build/cases/*.ttl',
						'build/wikidata/*.ttl',
					],
					run: /* syntax: bash */ `
						# launch internal triplestore
						./launch-internal.sh

						node $1 > $@

						# remove container
						docker rm -f ncov-internal
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
