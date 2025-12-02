!#bin/bash

cd web
rm -rf node_modules/.cache
rm -rf dist
npm run ls:build
cd ..
label-studio start

