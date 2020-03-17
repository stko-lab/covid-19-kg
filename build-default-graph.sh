#!/bin/bash
cat build/air-travel/suspensions.ttl \
	build/cases/global.ttl \
	build/wikidata/airports.ttl \
	build/wikidata/places.ttl \
	> build/default.ttl
