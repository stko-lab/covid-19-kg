#!/bin/bash

docker rm -f ncov-suspensions

docker run -d --rm \
	-p 13031:3030 \
	--name ncov-suspensions \
	-v $(pwd)/build:/usr/share/data atomgraph/fuseki --file=/usr/share/data/air-travel/suspensions.ttl /ds
