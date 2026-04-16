# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-25.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    # pkgs.go
    # pkgs.python311
    # pkgs.python311Packages.pip
    pkgs.nodejs_24
    pkgs.gemini-cli
    # pkgs.nodePackages.nodemon
  ];

  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
      "google.gemini-cli-vscode-ide-companion"
      "usernamehw.errorlens"
    ];

    # Enable previews
    previews = {
      enable = false;
      previews = {
        web = {
          # Example: run "npm run dev" with PORT set to IDX's defined port for previews,
          # and show it in IDX's web preview panel

          manager = "web";
          # command = [ "python3" "-m" "http.server" "$PORT" "--bind" "0.0.0.0" ]; # for static pages
          command = [ "npm" "run" "dev" "--" "--port" "$PORT" ]; # required node v22.12 above
          # command = [ "npm" "run" "build-n-preview" "--" "--port" "$PORT" ];
          env = {
            # Environment variables to set for your server
            # PORT = "$PORT";
          };
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Example: install JS dependencies from NPM
        npm-install = "npm ci --no-audit --prefer-offline --no-progress --timing";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Example: start a background task to watch and re-build backend code
        # watch-backend = "npm run watch-backend";
        # watch-backend = "npm run dev";

      };
    };
  };
}