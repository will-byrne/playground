{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      eachSystem =
        f:
        nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = eachSystem (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.bun
            # Playwright's test runner runs on Node
            pkgs.nodejs
            pkgs.typescript
            pkgs.typescript-language-server
          ];
          # Playwright's own Chromium download doesn't run on NixOS; use nixpkgs'.
          CHROMIUM_PATH = "${pkgs.chromium}/bin/chromium";
        };
      });
    };
}
