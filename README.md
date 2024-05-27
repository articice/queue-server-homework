# queue-server-homework

Example of REST API for queue with polling stage.

### Queue API
POST /api/{queue_name}

GET /api/{queue_name}?timeout={ms}


### Usage (single server):

```
docker-compose up
```

### Usage (multiple servers):
Will start two servers acting as a single logical queue, on ports `3000` & `3001`.
```
docker build . -t queue-server-homework_app
docker-compose -f docker-compose-multiple.yml up
```
