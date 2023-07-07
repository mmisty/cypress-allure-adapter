#!/bin/bash

sed '/"scripts":/,/},/d' lib/package.json > lib/temp.json

mv lib/temp.json lib/package.json