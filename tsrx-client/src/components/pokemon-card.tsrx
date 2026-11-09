import { useState } from "react";
import {
  type Backend,
  type PokeboxEntry,
  TEXT,
  canGoToNext,
  canGoToPrevious,
  formatDescription,
  formatDexNo,
  formatSpriteName,
  getDefaultSpriteKey,
  getDisplaySpriteKey,
  getForms,
  getShinySpriteKey,
  getSprites,
  getTypeColor,
  homePath,
  navigate,
  pokemonPath,
} from "../pokedex.ts";
import { Abilities } from "./ablities.tsrx";

export const PokemonCard = ({
  pokeboxEntry,
  backend,
}: {
  pokeboxEntry: PokeboxEntry;
  backend: Backend;
}) => @{
  const { id, name } = pokeboxEntry;
  const forms = getForms(pokeboxEntry);
  const [selectedFormId, setSelectedFormId] = useState(id);
  const form = forms.find((f) => f.id === selectedFormId) ?? forms[0];
  const { species_description, types, abilities, sprites } = form;

  const spriteList = getSprites(sprites);
  const [selectedSpriteKey, setSelectedSpriteKey] = useState(() => getDefaultSpriteKey(spriteList));
  const [showShiny, setShowShiny] = useState(false);
  const displaySpriteKey = getDisplaySpriteKey(spriteList, selectedSpriteKey, showShiny);
  const hasShiny = Boolean(getShinySpriteKey(spriteList, selectedSpriteKey));

  const selectForm = (formId: number) => {
    const next = forms.find((f) => f.id === formId);
    if (!next) return;
    setSelectedFormId(formId);
    // Each form has its own sprites, so start from its default one.
    setSelectedSpriteKey(getDefaultSpriteKey(getSprites(next.sprites)));
  };

  <div className="pd-page">
    <div className="pd-container pd-container--wide">
      <div className="pd-detail-header">
        <button type="button" className="pd-btn" onClick={() => navigate(homePath(backend))}>
          {TEXT.backToList}
        </button>
        <div className="pd-detail-nav">
          @if (canGoToPrevious(id)) {
            <button
              type="button"
              className="pd-btn pd-btn--outline"
              onClick={() => navigate(pokemonPath(id - 1, backend))}
              aria-label="Previous Pokémon"
            >
              {TEXT.previous}
            </button>
          } @else {
            <div className="pd-spacer" />
          }
          <div>
            <h1 className="pd-title pd-title--detail pd-capitalize">{name}</h1>
            <p className="pd-subtitle">{formatDexNo(id)}</p>
          </div>
          @if (canGoToNext(id)) {
            <button
              type="button"
              className="pd-btn pd-btn--outline"
              onClick={() => navigate(pokemonPath(id + 1, backend))}
              aria-label="Next Pokémon"
            >
              {TEXT.next}
            </button>
          } @else {
            <div className="pd-spacer" />
          }
        </div>
      </div>

      @if (forms.length > 1) {
        <div className="pd-forms">
          <h2 className="pd-forms__label">{TEXT.forms}</h2>
          <div className="pd-forms__list">
            @for (const f of forms) {
              <button
                type="button"
                key={f.id}
                className={`pd-btn pd-btn--sm ${f.id === form.id ? "pd-btn--primary" : "pd-btn--outline"}`}
                onClick={() => selectForm(f.id)}
                aria-pressed={f.id === form.id}
              >
                {f.label}
              </button>
            }
          </div>
        </div>
      }

      <div className="pd-grid pd-grid--detail">
        <div className="pd-card">
          <div className="pd-card__body pd-card__body--center">
            <img alt={`${form.name} sprite`} src={spriteList[displaySpriteKey]} className="pd-main-sprite" />
            @if (hasShiny) {
              <label className="pd-toggle-label">
                <input
                  type="checkbox"
                  className="pd-toggle"
                  checked={showShiny}
                  onChange={(event) => setShowShiny(event.currentTarget.checked)}
                />
                {TEXT.shiny}
              </label>
            }
            <div className="pd-badges">
              @for (const type of types) {
                <span
                  key={type}
                  className="pd-badge"
                  style={{ backgroundColor: getTypeColor(type).background, color: getTypeColor(type).color }}
                >
                  {type}
                </span>
              }
            </div>
          </div>
        </div>

        <div className="pd-card">
          <div className="pd-card__body">
            <h2 className="pd-card__title" style={{ marginBottom: "1rem" }}>
              {TEXT.description}
            </h2>
            <p className="pd-description">{formatDescription(species_description)}</p>
          </div>
        </div>
      </div>

      <Abilities abilities={abilities} />

      <div className="pd-section--detail">
        <h2 className="pd-heading pd-heading--detail">{TEXT.sprites}</h2>
        <div className="pd-grid pd-grid--sprites">
          @for (const [spriteName, url] of Object.entries(spriteList)) {
            <button
              type="button"
              key={spriteName}
              className={`pd-card pd-card--md pd-sprite-card${spriteName === selectedSpriteKey ? " pd-sprite-card--selected" : ""}`}
              onClick={() => setSelectedSpriteKey(spriteName)}
              aria-pressed={spriteName === selectedSpriteKey}
            >
              <div className="pd-card__body pd-card__body--compact pd-card__body--center">
                <img alt={spriteName} src={url} />
                <p className={`pd-sprite-label${spriteName === selectedSpriteKey ? " pd-sprite-label--selected" : ""}`}>
                  {spriteName === selectedSpriteKey ? TEXT.selected : formatSpriteName(spriteName)}
                </p>
              </div>
            </button>
          }
        </div>
      </div>
    </div>
  </div>
};
