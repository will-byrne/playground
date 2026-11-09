# The docker-compose.yaml stack as a process-compose config. Everything runs
# on the host, on the same ports as the compose file's host ports, so the
# clients' hardcoded localhost backend URLs work unchanged.
#
# State (the MongoDB data directory and the rust-server's HTTP cache) lives in
# $PLAYGROUND_DATA_DIR, which the runner defaults to ./.data.
{ pkgs, packages }:
let
  inherit (pkgs) lib;

  mongo = {
    user = "admin";
    password = "testtest";
    port = 27017;
  };
  mongoUri = "mongodb://${mongo.user}:${mongo.password}@127.0.0.1:${toString mongo.port}";

  # Servers on host ports 3000-3005, as in docker-compose.yaml.
  servers = {
    rust-server = {
      env = {
        ROCKET_PORT = "3000";
        MONGODB_URI = mongoUri;
      };
    };
    elysia-server = {
      env = {
        PORT = "3001";
        LOCAL_API = "false";
        MONGODB_HOST = "127.0.0.1";
        MONGODB_PORT = toString mongo.port;
        MONGODB_USERNAME = mongo.user;
        MONGODB_PASSWORD = mongo.password;
        MONGODB_DATABASE = "pokemon";
        MONGODB_AUTH_SOURCE = "admin";
      };
    };
    go-server = {
      env = {
        PORT = "3002";
        MONGODB_URI = "${mongoUri}/?authSource=admin";
      };
    };
    hono-server = {
      env = {
        PORT = "3003";
        MONGODB_URI = mongoUri;
      };
    };
    effect-server = {
      env = {
        PORT = "3005";
        MONGODB_URI = mongoUri;
      };
    };
    java-server = {
      env = {
        SERVER_PORT = "3004";
        SPRING_DATA_MONGODB_URI = "${mongoUri}/pokemon?authSource=admin";
      };
    };
  };

  # Static clients on host ports 4001-4007, served with an index.html
  # fallback for client-side routes (the nginx config in their Dockerfiles).
  staticClients = {
    angular-client = 4001;
    lit-client = 4002;
    mantine-client = 4003;
    react-client = 4004;
    tsrx-client = 4007;
  };

  serveStatic =
    name: port:
    "${lib.getExe pkgs.static-web-server} --host 127.0.0.1 --port ${toString port} "
    + "--root ${packages.${name}} --page-fallback ${packages.${name}}/index.html";

  mongodbStart = pkgs.writeShellScript "mongodb-start" ''
    mkdir -p "$PLAYGROUND_DATA_DIR/mongodb"
    exec ${pkgs.mongodb-ce}/bin/mongod --auth \
      --dbpath "$PLAYGROUND_DATA_DIR/mongodb" \
      --bind_ip 127.0.0.1 --port ${toString mongo.port}
  '';

  # Stands in for the mongo image's MONGO_INITDB_ROOT_* variables: creates the
  # root user on first start, through MongoDB's localhost exception.
  mongodbInit = pkgs.writeShellScript "mongodb-init" ''
    mongosh=${lib.getExe pkgs.mongosh}
    if $mongosh --quiet "${mongoUri}/admin" --eval 'db.runCommand({ ping: 1 }).ok' >/dev/null 2>&1; then
      echo "root user already exists"
      exit 0
    fi
    exec $mongosh --quiet "mongodb://127.0.0.1:${toString mongo.port}/admin" --eval '
      db.createUser({ user: "${mongo.user}", pwd: "${mongo.password}", roles: ["root"] });
      print("created root user");
    '
  '';

  rustServerStart = pkgs.writeShellScript "rust-server-start" ''
    # rustemon keeps its HTTP cache in the working directory
    mkdir -p "$PLAYGROUND_DATA_DIR/rust-server"
    cd "$PLAYGROUND_DATA_DIR/rust-server"
    exec ${lib.getExe packages.rust-server}
  '';

  # Like docker compose's restart policy: keep a crashed service coming back.
  restart = {
    restart = "on_failure";
    backoff_seconds = 2;
    max_restarts = 5;
  };

  dependsOnMongo = {
    mongodb-init.condition = "process_completed_successfully";
  };
in
{
  version = "0.5";
  processes = {
    mongodb = {
      command = toString mongodbStart;
      availability = restart;
      readiness_probe = {
        exec.command = "${lib.getExe pkgs.mongosh} --quiet mongodb://127.0.0.1:${toString mongo.port}/test --eval 'db.runCommand({ ping: 1 }).ok'";
        initial_delay_seconds = 1;
        period_seconds = 2;
        failure_threshold = 30;
      };
      shutdown.signal = 2;
    };

    mongodb-init = {
      command = toString mongodbInit;
      depends_on.mongodb.condition = "process_healthy";
    };
  }
  // lib.mapAttrs (name: server: {
    command = if name == "rust-server" then toString rustServerStart else lib.getExe packages.${name};
    environment = lib.mapAttrsToList (k: v: "${k}=${v}") server.env;
    depends_on = dependsOnMongo;
    availability = restart;
  }) servers
  // lib.mapAttrs (name: port: {
    command = serveStatic name port;
    availability = restart;
  }) staticClients
  // {
    # Remix and SvelteKit also fetch on the server; both run on the host, so
    # their default localhost backend URLs work and need no BACKEND_URL_*.
    remix-client = {
      command = lib.getExe packages.remix-client;
      environment = [ "PORT=4005" ];
      availability = restart;
    };
    svelt-client = {
      command = "${lib.getExe packages.svelt-client} --host 127.0.0.1 --port 4006";
      availability = restart;
    };
  };
}
