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

  # A yarn v1 project built with `yarn build`; `outDir` becomes the output.
  yarnBuild =
    {
      name,
      depsHash,
      outDir ? "dist",
      env ? { },
    }:
    pkgs.stdenv.mkDerivation (finalAttrs: {
      pname = name;
      version = "0.0.0";
      src = projectSrc name;
      yarnOfflineCache = pkgs.fetchYarnDeps {
        yarnLock = finalAttrs.src + "/yarn.lock";
        hash = depsHash;
      };
      nativeBuildInputs = [
        pkgs.yarnConfigHook
        pkgs.yarnBuildHook
        nodejs
      ];
      inherit env;
      installPhase = ''
        runHook preInstall
        cp -R ${outDir} $out
        runHook postInstall
      '';
    });

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
    vendorHash = "sha256-DFxwLuPPNDUUqfvYwyNRIOyTiuPeCaLhSUOpNFgAZsA=";
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

  # --- Clients -------------------------------------------------------------
  # Static clients build to a directory of files; remix and svelte get a
  # runnable server in bin/.

  angular-client = yarnBuild {
    name = "angular-client";
    depsHash = "sha256-r9h/zEnACie8QjpR7dn9cgDwJVioNDh/oJ+g4uQ5G74=";
    outDir = "dist/angular-client/browser";
    env.NG_CLI_ANALYTICS = "false";
  };

  lit-client = bunBuild {
    name = "lit-client";
    depsHash = "sha256-guJrWZOYstP59o+CZt+7mkim0PWdcsq/DVttmQ/QWgM=";
    env.HUSKY = "0";
    buildScript = "npm run build";
  };

  mantine-client = yarnBuild {
    name = "mantine-client";
    depsHash = "sha256-lsL2UVj4TNo3PsbaXMQOlMQpMKitYytuQaYyYHo1+Jg=";
  };

  react-client = bunBuild {
    name = "react-client";
    depsHash = "sha256-7jp14UKc95MM6YEKP47HqfUDbVNvrqCpg9oeara/2Zk=";
    buildScript = "bun run build";
  };

  remix-client = bunBuild {
    name = "remix-client";
    depsHash = "sha256-qu0kKUK4ukmK7U81vK9wQDncGSpsnZifr0SGM2r8wK0=";
    buildScript = "npm run build";
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
    depsHash = "sha256-jLeVK+WjrH+X+shXfFBZMJl50NrAVuxx/r/SQCZRMbs=";
    buildScript = "npm run build";
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

  tsrx-client = yarnBuild {
    name = "tsrx-client";
    depsHash = "sha256-LpNs0kqde66YmJ/5PnP49Las/QpD0JU7NHnNtOl+hKE=";
  };
}
