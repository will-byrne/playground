# Nix builds of every server and client that docker-compose.yaml runs.
#
# Each package mirrors the matching Dockerfile: the same install and build
# commands, but with dependencies fetched by fixed-output derivations so the
# builds stay hermetic. When a lockfile changes, set its hash below to
# `lib.fakeHash`, build, and copy the hash Nix reports.
{ pkgs, root }:
let
  inherit (pkgs) lib;

  nodejs = pkgs.nodejs_22;
  bun = pkgs.bun;

  # Project sources, without the build output and installs that live beside
  # them in a working checkout.
  projectSrc =
    name:
    lib.cleanSourceWith {
      name = "${name}-src";
      src = root + "/${name}";
      filter =
        path: _type:
        !(builtins.elem (baseNameOf path) [
          "node_modules"
          "dist"
          "build"
          "coverage"
          "target"
          ".svelte-kit"
          "storybook-static"
          "out-tsc"
          "Dockerfile"
          ".dockerignore"
          "flake.nix"
          "flake.lock"
        ]);
    };

  # node_modules from `bun install --frozen-lockfile`, as a fixed-output
  # derivation that only sees the manifest and lockfile. Bun installs only the
  # optional native packages for the current platform, so the hash is
  # per-system.
  bunNodeModules =
    {
      name,
      hash,
      production ? false,
    }:
    pkgs.stdenvNoCC.mkDerivation {
      name = "${name}-node-modules";
      src = lib.fileset.toSource {
        root = root + "/${name}";
        fileset = lib.fileset.intersection (lib.fileset.fromSource (projectSrc name)) (
          lib.fileset.unions (
            map (f: root + "/${name}/${f}") [
              "package.json"
              "bun.lock"
            ]
            ++ lib.optional (builtins.pathExists (root + "/${name}/.npmrc")) (root + "/${name}/.npmrc")
          )
        );
      };
      nativeBuildInputs = [ bun ];
      impureEnvVars = lib.fetchers.proxyImpureEnvVars;
      dontConfigure = true;
      dontFixup = true;
      buildPhase = ''
        runHook preBuild
        export HOME=$TMPDIR
        bun install --frozen-lockfile --no-progress --ignore-scripts --backend=copyfile \
          ${lib.optionalString production "--production"}
        runHook postBuild
      '';
      installPhase = ''
        runHook preInstall
        mkdir -p $out
        cp -R node_modules $out/
        runHook postInstall
      '';
      outputHash = hash;
      outputHashAlgo = "sha256";
      outputHashMode = "recursive";
    };

  # Copies prebuilt node_modules into the build tree and fixes its shebangs,
  # which the fixed-output derivation is not allowed to do.
  useNodeModules = deps: ''
    cp -R ${deps}/node_modules node_modules
    chmod -R u+w node_modules
    patchShebangs node_modules
  '';

  # A bun-installed project built with `buildScript`. By default dist/
  # becomes the output.
  bunBuild =
    {
      name,
      depsHash,
      buildScript,
      installPhase ? ''
        runHook preInstall
        cp -R dist $out
        runHook postInstall
      '',
      env ? { },
    }:
    pkgs.stdenv.mkDerivation {
      pname = name;
      version = "0.0.0";
      src = projectSrc name;
      nativeBuildInputs = [
        bun
        nodejs
        pkgs.makeWrapper
      ];
      inherit env;
      configurePhase = ''
        runHook preConfigure
        export HOME=$TMPDIR
        ${useNodeModules (bunNodeModules {
          inherit name;
          hash = depsHash;
        })}
        runHook postConfigure
      '';
      buildPhase = ''
        runHook preBuild
        ${buildScript}
        runHook postBuild
      '';
      inherit installPhase;
      meta.mainProgram = name;
    };

  # A bun server run straight from its TypeScript sources, as in its Dockerfile.
  bunServer =
    {
      name,
      depsHash,
      production ? false,
    }:
    let
      deps = bunNodeModules {
        inherit name production;
        hash = depsHash;
      };
    in
    pkgs.stdenv.mkDerivation {
      pname = name;
      version = "0.0.0";
      src = projectSrc name;
      nativeBuildInputs = [ pkgs.makeWrapper ];
      dontConfigure = true;
      dontBuild = true;
      installPhase = ''
        runHook preInstall
        app=$out/lib/${name}
        mkdir -p $app
        cp -R package.json tsconfig.json src $app/
        ln -s ${deps}/node_modules $app/node_modules
        makeWrapper ${lib.getExe bun} $out/bin/${name} \
          --set-default NODE_ENV production \
          --chdir $app \
          --add-flags "run $app/src/index.ts"
        runHook postInstall
      '';
      meta.mainProgram = name;
    };
in
{
  # --- Servers -------------------------------------------------------------

  rust-server = pkgs.rustPlatform.buildRustPackage {
    pname = "rust-server";
    version = "0.1.0";
    src = projectSrc "rust-server";
    cargoLock.lockFile = root + "/rust-server/Cargo.lock";
    # openssl is built with the "vendored" feature
    nativeBuildInputs = [
      pkgs.perl
      pkgs.pkg-config
    ];
    # The integration tests need a running MongoDB
    doCheck = false;
    meta.mainProgram = "rust-server";
  };

  elysia-server = bunServer {
    name = "elysia-server";
    depsHash = "sha256-F12kGh7oB0o/Nt4LBQQEnNZr+nJv6n4JNcqClYrbzG0=";
  };

  go-server = pkgs.buildGo126Module {
    pname = "go-server";
    version = "0.0.0";
    src = projectSrc "go-server";
    vendorHash = "sha256-wqaxpJQuNO6Ghg/sCl6/RLtHI8q1XLXexyHGcSggEJo=";
    env.CGO_ENABLED = 0;
    # The tests need a running MongoDB
    doCheck = false;
    postInstall = ''
      mv $out/bin/{example,go-server} 2>/dev/null || true
    '';
    meta.mainProgram = "go-server";
  };

  hono-server = bunServer {
    name = "hono-server";
    depsHash = "sha256-qtiGkMA6WNvjVJ6jdXHPHzExDJTIMCB9GNnSbxvG2Hk=";
    production = true;
  };

  effect-server = bunServer {
    name = "effect-server";
    depsHash = "sha256-BbNmyH1a7YFRoWA+24zMzsXs0kj5dyvoE4PivHD1OWM=";
    production = true;
  };

  java-server =
    let
      jdk = pkgs.jdk21_headless;
      maven = pkgs.maven.override { jdk_headless = jdk; };
    in
    maven.buildMavenPackage {
      pname = "java-server";
      version = "0.1.0";
      src = projectSrc "java-server";
      mvnHash = "sha256-zGjdZAR8Y4/3oc5/Gg8Hlvb4YVcWyjsBK8bDdcLL5EA=";
      mvnParameters = "-DskipTests";
      nativeBuildInputs = [ pkgs.makeWrapper ];
      installPhase = ''
        runHook preInstall
        mkdir -p $out/share/java $out/bin
        cp target/*.jar $out/share/java/java-server.jar
        makeWrapper ${lib.getExe jdk} $out/bin/java-server \
          --add-flags "-jar $out/share/java/java-server.jar"
        runHook postInstall
      '';
      meta.mainProgram = "java-server";
    };

  # --- Contract ------------------------------------------------------------
  # The contract suite: `contract-tests` checks the server at $BASE_URL,
  # `contract-matrix [server...]` checks every server on its usual port, and
  # `contract-fuzz` fuzzes $BASE_URL against the spec with Schemathesis.

  contract =
    let
      deps = bunNodeModules {
        name = "contract";
        hash = "sha256-szTbua/7uiPRajca7De/4gpzb/4Ykzp5V+IjalfhiEU=";
      };
    in
    pkgs.stdenv.mkDerivation {
      pname = "contract";
      version = "0.0.0";
      src = projectSrc "contract";
      nativeBuildInputs = [ pkgs.makeWrapper ];
      dontConfigure = true;
      dontBuild = true;
      installPhase = ''
        runHook preInstall
        app=$out/lib/contract
        mkdir -p $app
        cp -R package.json tsconfig.json openapi.yaml schemathesis.toml src $app/
        ln -s ${deps}/node_modules $app/node_modules
        makeWrapper ${lib.getExe bun} $out/bin/contract-tests \
          --chdir $app --add-flags test
        makeWrapper ${lib.getExe bun} $out/bin/contract-matrix \
          --chdir $app --prefix PATH : ${bun}/bin --add-flags "run $app/src/matrix.ts"
        # Schemathesis isn't in nixpkgs, so this runs a pinned release through
        # uvx (fetched from PyPI on first use). It runs in the caller's
        # directory, where Schemathesis keeps .hypothesis/ and reports.
        makeWrapper ${lib.getExe bun} $out/bin/contract-fuzz \
          --prefix PATH : ${pkgs.uv}/bin --add-flags "run $app/src/fuzz.ts"
        runHook postInstall
      '';
      meta.mainProgram = "contract-tests";
    };

  # --- Clients -------------------------------------------------------------
  # Static clients build to a directory of files; remix and svelte get a
  # runnable server in bin/.

  angular-client = bunBuild {
    name = "angular-client";
    depsHash = "sha256-sNF+SgGKnWY47Igx9qZiMva8QbDUVV/bGiEyZj/HuTQ=";
    env.NG_CLI_ANALYTICS = "false";
    buildScript = "bun run build";
    installPhase = ''
      runHook preInstall
      cp -R dist/angular-client/browser $out
      runHook postInstall
    '';
  };

  lit-client = bunBuild {
    name = "lit-client";
    depsHash = "sha256-mPc2weA7rDGYQylopqkWEHYQihtek3PAHQf5Zp/VyVw=";
    env.HUSKY = "0";
    buildScript = "bun run build";
  };

  mantine-client = bunBuild {
    name = "mantine-client";
    depsHash = "sha256-Wd9z/vAya8f0sK+hb12cQdZUVyzYYWt6YMxs5IV2YQ4=";
    buildScript = "bun run build";
  };

  react-client = bunBuild {
    name = "react-client";
    depsHash = "sha256-fZ0mkYzVhIs9E8JP0oPVZJZiWPG0w9ifs7vQgb1Vknk=";
    buildScript = "bun run build";
  };

  remix-client = bunBuild {
    name = "remix-client";
    depsHash = "sha256-A2HXUPYaojk+PWpJ8ZQOXsK1RRDPCjBwfbLFeNkSwlA=";
    buildScript = "bun run build";
    installPhase = ''
      runHook preInstall
      app=$out/lib/remix-client
      mkdir -p $app
      cp -R package.json node_modules build public $app/
      makeWrapper ${lib.getExe nodejs} $out/bin/remix-client \
        --set-default NODE_ENV production \
        --chdir $app \
        --add-flags "$app/node_modules/@remix-run/serve/dist/cli.js $app/build/server/index.js"
      runHook postInstall
    '';
  };

  # adapter-auto has no standalone target, so (as in its Dockerfile) the built
  # app is served by `vite preview`. Pass --port to choose the port. The
  # runner config loader avoids writing a bundled config into the store.
  svelt-client = bunBuild {
    name = "svelt-client";
    depsHash = "sha256-aiUZWlu/wZMqFvb9dsphdjdkFvhvK1b8TRu1w/WEI3I=";
    buildScript = "bun run build";
    installPhase = ''
      runHook preInstall
      app=$out/lib/svelt-client
      mkdir -p $app
      cp -R . $app/
      makeWrapper ${lib.getExe nodejs} $out/bin/svelt-client \
        --chdir $app \
        --add-flags "$app/node_modules/vite/bin/vite.js preview --strictPort --configLoader runner"
      runHook postInstall
    '';
  };

  tsrx-client = bunBuild {
    name = "tsrx-client";
    depsHash = "sha256-mI0HUuex+1ouprhTS7mCU5oo9cz2bZ4UJ5DC8j36+1w=";
    buildScript = "bun run build";
  };
}
