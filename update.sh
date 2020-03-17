#!/bin/bash

# load environment variables
source .env

# parse arguments
A_POSITIONAL=()
AE=""
while [[ $# -gt 0 ]]; do
	s_key="$1"

	case $s_key in
		-A|--aviation-edge)
			AE="1"
			shift # past argument
			;;
		*)  # unknown option
			A_POSITIONAL+=("$1") # save it in an array for later
			shift # past argument
			;;
	esac
done
set -- "${A_POSITIONAL[@]}" # restore positional parameters


# update Johns Hopkins CSSE repo <https://github.com/CSSEGISandData/COVID-19>
git submodule update --recursive --remote

# grab latest database snapshots from Aviation Edge
if [[ -n $AE ]]; then
	echo "Updating Aviation Edge databases..."
	npx emk -f 'data/aviation-edge/*.json'
fi

# # triplify cases
# npx emk build/cases/global.ttl

# # triplify all routes
# npx emk build/air-travel/global.ttl

# # triplify suspensions
# npx emk build/air-travel/suspensions.ttl

# # align airports
# npx emk build/wikidata/airports.ttl

# # align places
# npx emk build/wikidata/places.ttl


# do everything
npx emk build/output/union.ttl
