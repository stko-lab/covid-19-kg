#!/bin/bash

S_READY_STRING="INFO  Start Fuseki"

si_container=ncov-suspensions

# remove previous docker container
docker rm -f $si_container

# launch new container
docker run -d --rm \
	-p 13031:3030 \
	--name $si_container \
	-v $(pwd)/build:/usr/share/data atomgraph/fuseki --file=/usr/share/data/air-travel/suspensions.ttl /ds


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
