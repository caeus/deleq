

install:
	npm install

lint: install
	npm run lint

format: install
	npm run format

docs: install lint
	npm run docs

build: install lint test
	npm run build

test: lint
	npx vitest run

publish: test docs build
	npm publish
 