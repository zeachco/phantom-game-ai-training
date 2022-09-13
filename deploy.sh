#!/usr/bin/env sh

# abort on errors
set -e

rm -rf dist

# build
npm run build

# navigate into the build output directory
cd dist

# if you are deploying to a custom domain
# echo 'www.example.com' > CNAME

git init
git config --global user.email "zeachco@gmail.com"
git config --global user.name "Github Actions"
git checkout -b gh-pages
git add -A
git commit -m 'deploy'

# if you are deploying to https://<USERNAME>.github.io
# git push -f git@github.com:<USERNAME>/<USERNAME>.github.io.git main

# if you are deploying to https://<USERNAME>.github.io/<REPO>
git push -f git@github.com:zeachco/phantom-game-ai-training.git main:gh-pages

cd -
