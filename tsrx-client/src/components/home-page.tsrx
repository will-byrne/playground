import { useEffect, useState } from "react";
import { CLIENT } from "../client.ts";
import {
  BACKEND_OPTIONS,
  type Backend,
  type PokedexEntry,
  TEXT,
  getAppTitle,
  capitalize,
  fetchPokedex,
  getFetchErrorKind,
  fetchRandomNewPokemon,
  formatDexNo,
  getBackend,
  getFeaturedPokemon,
  getLeftToDiscover,
  getLeftToDiscoverDesc,
  homePath,
  navigate,
  pokemonPath,
  searchPokedex,
} from "../pokedex.ts";
import { Link } from "./link.tsrx";

export const HomePage = ({ backend }: { backend: Backend }) => @{
  const [pokedex, setPokedex] = useState<PokedexEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [idOrName, setIdOrName] = useState("");
  const [randomLoading, setRandomLoading] = useState(false);

  useEffect(() => {
    fetchPokedex(backend)
      .then(setPokedex)
      .catch((err) => {
        console.error("Failed to load the Pokédex:", err);
        setError(TEXT.pokedexError(backend, getFetchErrorKind(err)));
      });
  }, [backend]);

  const searchResults = searchPokedex(pokedex, idOrName);
  const featuredPokemon = getFeaturedPokemon(pokedex);

  const handleRandomNewPokemon = async () => {
    setRandomLoading(true);
    setError(null);
    try {
      const pokemon = await fetchRandomNewPokemon(backend);
      navigate(pokemonPath(pokemon.name, backend));
    } catch (err) {
      console.error("Failed to fetch a random new Pokémon:", err);
      setError(TEXT.randomError(backend, getFetchErrorKind(err)));
    } finally {
      setRandomLoading(false);
    }
  };

  <div className="pd-page">
    <div className="pd-container">
      <div className="pd-header">
        <h1 className="pd-title">{getAppTitle(CLIENT)}</h1>
        <p className="pd-subtitle">{TEXT.subtitle}</p>
      </div>

      @if (error) {
        <div role="alert" className="pd-alert">
          {error}
        </div>
      }

      <div className="pd-card pd-section">
        <div className="pd-card__body">
          <div className="pd-card__title-row">
            <h2 className="pd-card__title">{TEXT.searchTitle}</h2>
            <label className="pd-field">
              <span className="pd-label pd-label--tight">{TEXT.backendLabel}</span>
              <select
                aria-label={TEXT.backendLabel}
                className="pd-select"
                value={backend}
                onChange={(event) => navigate(homePath(getBackend(event.target.value)))}
              >
                @for (const option of BACKEND_OPTIONS) {
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                }
              </select>
            </label>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (idOrName.trim()) navigate(pokemonPath(idOrName.trim(), backend));
            }}
          >
            <div className="pd-field">
              <label className="pd-label" htmlFor="idOrNameInput">
                {TEXT.searchLabel}
              </label>
              <div className="pd-join">
                <input
                  id="idOrNameInput"
                  type="text"
                  placeholder={TEXT.searchPlaceholder}
                  className="pd-input pd-grow"
                  value={idOrName}
                  onChange={(e) => setIdOrName(e.currentTarget.value)}
                />
                <button type="submit" className="pd-btn pd-btn--primary" disabled={!idOrName.trim()}>
                  {TEXT.search}
                </button>
                <button type="button" className="pd-btn" onClick={handleRandomNewPokemon} disabled={randomLoading}>
                  {randomLoading ? TEXT.loading : TEXT.random}
                </button>
              </div>
            </div>
          </form>

          @if (searchResults.length > 0) {
            <div style={{ marginTop: "1rem" }}>
              <h3 className="pd-subheading">{TEXT.searchResults}</h3>
              <div className="pd-grid pd-grid--tight pd-grid--results">
                @for (const pokemon of searchResults) {
                  <Link
                    key={pokemon.id}
                    to={pokemonPath(pokemon.name, backend)}
                    className="pd-btn pd-btn--outline pd-btn--sm pd-btn--start"
                  >
                    <span className="pd-mono">{formatDexNo(pokemon.id)}</span>
                    <span className="pd-capitalize">{pokemon.name}</span>
                  </Link>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <div className="pd-section">
        <h2 className="pd-heading">{TEXT.featured}</h2>
        <div className="pd-grid pd-grid--featured">
          @for (const pokemon of featuredPokemon) {
            <div key={pokemon.id} className="pd-card pd-card--lg">
              <div className="pd-card__body pd-card__body--compact pd-card__body--center">
                <h3 className="pd-card__title pd-card__title--md pd-card__title--center">{formatDexNo(pokemon.id)}</h3>
                <p className="pd-capitalize" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  {pokemon.name}
                </p>
                <Link to={pokemonPath(pokemon.name, backend)} className="pd-btn pd-btn--primary pd-btn--sm">
                  {TEXT.viewDetails}
                </Link>
              </div>
            </div>
          }
        </div>
      </div>

      <div className="pd-card pd-section">
        <div className="pd-card__body pd-card__body--center">
          <h2 className="pd-card__title pd-card__title--center" style={{ marginBottom: "1rem" }}>
            {TEXT.statsTitle}
          </h2>
          <div className="pd-stats">
            <div className="pd-stat">
              <div className="pd-stat__title">{TEXT.statTotalTitle}</div>
              <div className="pd-stat__value pd-stat__value--primary">{pokedex.length}</div>
              <div className="pd-stat__desc">{TEXT.statTotalDesc}</div>
            </div>
            <div className="pd-stat">
              <div className="pd-stat__title">{TEXT.statLeftTitle}</div>
              <div className="pd-stat__value pd-stat__value--secondary">{getLeftToDiscover(pokedex)}</div>
              <div className="pd-stat__desc">{getLeftToDiscoverDesc(pokedex)}</div>
            </div>
            <div className="pd-stat">
              <div className="pd-stat__title">{TEXT.statLastUpdatedTitle}</div>
              <div className="pd-stat__value pd-stat__value--accent">{TEXT.statLastUpdatedValue}</div>
              <div className="pd-stat__desc">{TEXT.statLastUpdatedDesc}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pd-card">
        <div className="pd-card__body">
          <h2 className="pd-card__title" style={{ marginBottom: "1rem" }}>
            {TEXT.browseTitle}
          </h2>
          <div className="pd-field">
            <label className="pd-label" htmlFor="dexSelector">
              {TEXT.browseLabel}
            </label>
            <select
              id="dexSelector"
              className="pd-select pd-select--lg"
              onChange={(e) => {
                if (e.target.value) navigate(pokemonPath(e.target.value, backend));
              }}
              defaultValue=""
            >
              <option value="" disabled>
                {TEXT.browsePlaceholder}
              </option>
              @for (const pokemon of pokedex) {
                <option key={pokemon.id} value={pokemon.name}>
                  {`${formatDexNo(pokemon.id)} - ${capitalize(pokemon.name)}`}
                </option>
              }
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
};
