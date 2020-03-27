#!/bin/bash

S_READY_STRING="INFO  Start Fuseki"

# create global ttl file
cat build/air-travel/suspensions.ttl \
	build/cases/*.ttl \
	build/wikidata/*.ttl \
	build/ontology/*.ttl \
	> build/internal.ttl

si_container=ncov-internal

# remove previous docker container
docker rm -f $si_container

# launch new container
docker run -d --rm \
	-p 13032:3030 \
	--name $si_container \
	-v $(pwd)/build:/usr/share/data atomgraph/fuseki --file=/usr/share/data/internal.ttl --update /ds


# prepare command string to deduce what container output is telling us
read -r -d '' SX_SUBSHELL <<-EOF
	docker logs -f $si_container \
		| tee >( grep -m1 -e "$S_READY_STRING" > /dev/null && kill -9 \$\$ ) \
		| tee >( grep -m1 -e "exited with code" > /dev/null && kill -2 \$\$ )
EOF

# await service startup
if bash -c "$SX_SUBSHELL"; then
	echo -e "\nfailed to start $si_container"
	exit 1
fi
