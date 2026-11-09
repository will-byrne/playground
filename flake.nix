{
  description = "Pokémon playground: every server and client, run with Nix instead of docker compose";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # The bun-installed node_modules hashes are per-platform, and are only
      # filled in for x86_64-linux.
      systems = [ "x86_64-linux" ];
      eachSystem =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f (
            import nixpkgs {
              inherit system;
              # mongodb-ce is under the SSPL
              config.allowUnfreePredicate = pkg: nixpkgs.lib.getName pkg == "mongodb-ce";
            }
          )
        );
    in
    {
      packages = eachSystem (
        pkgs:
        let
          packages = import ./nix/packages.nix {
            inherit pkgs;
            root = ./.;
          };
          processComposeConfig = pkgs.writeText "process-compose.yaml" (
            builtins.toJSON (import ./nix/processes.nix { inherit pkgs packages; })
          );
        in
        packages
        // {
          inherit processComposeConfig;

          # `nix run` brings the whole stack up; `nix run . -- up react-client
          # rust-server` starts just those (plus what they depend on), like
          # `docker compose up`. Any process-compose arguments work.
          default = pkgs.writeShellApplication {
            name = "playground";
            runtimeInputs = [ pkgs.process-compose ];
            text = ''
              export PLAYGROUND_DATA_DIR="''${PLAYGROUND_DATA_DIR:-$PWD/.data}"
              mkdir -p "$PLAYGROUND_DATA_DIR"
              exec process-compose --config ${processComposeConfig} "$@"
            '';
          };
        }
      );

      # One dev shell per project; see nix/shells.nix.
      devShells = eachSystem (pkgs: import ./nix/shells.nix { inherit pkgs; });

      apps = eachSystem (pkgs: {
        default = {
          type = "app";
          program = nixpkgs.lib.getExe self.packages.${pkgs.system}.default;
        };
      });
    };
}
