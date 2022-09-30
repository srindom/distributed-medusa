# Distributed Services POC

This repository serves as a proof of concept for an approach that can be used to separate the core Medusa services into smaller modules, that can be fully replaced, independently deployed, and automatically scaled.

## Modified core Medusa code

You will need to clone this modified Medusa code that contains:

- Changes to how services are loaded ([Link](https://github.com/srindom/medusa/blob/poc-distributed-modules/packages/medusa/src/loaders/services.ts#L15))
- A separated `@medusajs/users` package ([Link](https://github.com/srindom/medusa/tree/poc-distributed-modules/packages/users))
- Misc. changes to seed scripts and interfaces ([View all changes here](https://github.com/srindom/medusa/commit/db2f2434ba3b3f0cc556bbaae8508df0c135fc98))

```
git clone -b poc-distributed-modules https://github.com/srindom/medusa.git medusa-mod
cd medusa-mod
yarn && yarn build
```

## `medusa-dev` config

You must point `medusa-dev` to the root of the modified Medusa monorepo

```
medusa-dev --set-path-to-repo /path/to/medusa-mod
```

## Setting up this project

### Clone the repo

```
git clone https://github.com/srindom/distributed-medusa.git
```

### Create a DB

```
createdb "medusa-distributed"
```

### Install modified packages and start server

```
cd distributed-medusa/backend
medusa-dev --force-install -s
yarn build
yarn seed
```

### Starting Medusa with default UserService

By default the project will use the `@medusajs/users` package.

```
yarn start
```

In a separate Terminal session

```
curl -X POST localhost:9000/admin/auth -H 'Content-Type: application/json' -d '{ "email": "admin@medusa-test.com", "password": "supersecret" }'
```

> **Note:** During bootstrap the `@medusajs/medusa/dist/loaders/services` script will check if there are UserService overrides and if so register them. Otherwise it uses the default package.

### Starting Medusa with a custom UserService

The project contains an overridden UserService in `backend/src/custom-services/my-user-service.ts`.

The custom UserService is a simple implementation that uses an in memory `UserStore`, to keep track of Users.

To use the custom UserService uncomment line 71 in `medusa-config.js`:

```js
// backend/medusa-config.js

module.exports = {
  ....
  services: {
    /**** Use Cloudflare worker *****/
    // user: "./dist/custom-services/external-user-service",

    /**** Use local service *****/
    user: "./dist/custom-services/my-user-service", // <--- THIS ONE
  },
  ...
};
```

```
yarn start
```

In a separate Terminal session

```
curl -X POST localhost:9000/admin/auth -H 'Content-Type: application/json' -d '{ "email": "admin@medusa-test.com", "password": "supersecret" }'
```

### Starting Medusa with an external UserService

The project contains two custom services, the first we covered above, the second is a client that facilitates external calls to a Cloudflare worker. The code for the worker is contained in `/user-service` and deployed at https://user-service.seb8909.workers.dev.

To start Medusa with the external service uncomment line 68 in `medusa-config.js`:

```js
// backend/medusa-config.js

module.exports = {
  ....
  services: {
    /**** Use Cloudflare worker *****/
    user: "./dist/custom-services/external-user-service", // <--- THIS ONE

    /**** Use local service *****/
    // user: "./dist/custom-services/my-user-service",
  },
  ...
};
```

```
yarn start
```

In a separate Terminal session

```
curl -X POST localhost:9000/admin/auth -H 'Content-Type: application/json' -d '{ "email": "admin@medusa-test.com", "password": "supersecret" }'
```

## Considerations

This POC reveals a couple of things that would have to be changed in order for this to be a more widely used pattern.

### Data Layer separation

With the separation of modules each module can own its data layer. This means that you could if needed use a completely separate data store for a given module - this is demonstrated here with the custom UserService. For this to be achievable we would have to ensure that there are no foreign keys between database entities that are part of separate modules. Furthermore, all dependencies on foreign modules' data stores (e.g. repositories) would have to be eliminated.

Eliminating FKs would also mean that we can't rely on native SQL joins to get data from across services. Instead nested data would have to be fetched through the correct service methods.

### Sharing a DB manager through the application container

With a separated data layer we can no longer rely on the shared DB manager in the Awilix container. This is because [the `entities` prop](https://github.com/srindom/medusa/blob/poc-distributed-modules/packages/medusa/src/loaders/database.ts#L22) passed when establishing a DB connection through TypeORM would not contain all entities from the different packages. This could potentially be resolved by also loading entites from separated packages, however, this would violate the idea of each module owning its data layer.

To get around the issue with entity metadata not being know to the default manager, we should instead allow each module to make connections to their data layer independently. This is seen in the `@medusajs/users` package [here](https://github.com/srindom/medusa/blob/poc-distributed-modules/packages/users/src/services/user.ts#L63).

### Transaction Management

A consequence of each module using separate connections is that transaction management becomes more tedious. E.g., since the default manager no longer knows about the `User` entity, `manager.transaction(txManager => ...)` the `txManager` here will not know about the `User` either. This means that we can not initiate top-level transactions like we have done previously.

Furthermore, if a service initiates a transaction through `atomicPhase`, we will not be able to pass this resulting manager to additional services using `otherService.withTransaction(atomicPhaseManager)`, because `atomicPhaseManager` will not necessarily know about the entities owned by `otherService`.

The above is a strong motivation for introducing distributed transactions like suggested by @carlos-r-l-rodrigues [here](https://gist.github.com/carlos-r-l-rodrigues/1aa0c9a21911200dc211bf2799777fd6).

One thing to address in the POC for distributed transactions would be how a service can initate/modify a transaction; e.g., to support something similar to atomicPhase.
