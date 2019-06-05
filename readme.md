## Skeleton for Node.js applications written in TypeScript

### Development
// Run application
// Kill port if may exist

sudo kill $(sudo lsof -t -i:8081)

npm run dev

### OR 
## GoTo dist (if exist) folder and run
NODE_ENV=dev nodemon index.js

### Running tests

npm test

### Linting

npm run lint

### Building a container

docker build . 
